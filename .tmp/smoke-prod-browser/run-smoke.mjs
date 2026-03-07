import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { chromium } from 'playwright';
import fs from 'fs';

const base = process.env.SMOKE_BASE_URL;
const jwtSecret = process.env.SMOKE_JWT_SECRET;
const email = process.env.SMOKE_EMAIL || `morganclint76+smoke${Date.now()}@gmail.com`;
if (!base || !jwtSecret) throw new Error('Missing env vars');

const outDir = '.tmp/smoke-prod-browser';
fs.mkdirSync(outDir, { recursive: true });
const results = { base, startedAt: new Date().toISOString(), unauthenticated: {}, authenticated: {} };

async function fillIdeaAndEmail(page, ideaText) {
  const idea = page.locator('textarea[placeholder="What are you building, who is it for, and why now?"]');
  await idea.click();
  await idea.press('ControlOrMeta+A');
  await idea.pressSequentially(ideaText, { delay: 8 });

  const entry = page.locator('input[placeholder="founder@company.com"]');
  await entry.click();
  await entry.press('ControlOrMeta+A');
  await entry.pressSequentially(email, { delay: 8 });

  await page.waitForFunction(() => {
    const button = [...document.querySelectorAll('button')].find((btn) =>
      btn.textContent?.includes('Build My 90-Day Launch Plan'),
    );
    return Boolean(button && !button.hasAttribute('disabled'));
  }, { timeout: 30000 });
}

async function submitWithRetries(page, successLocator) {
  const submit = page.getByRole('button', { name: /Build My 90-Day Launch Plan/i });
  const retry = page.getByRole('button', { name: /Retry with me/i });
  const verificationModal = page.getByText('Check your email to continue', { exact: false });

  for (let attempt = 1; attempt <= 6; attempt++) {
    if (await successLocator.isVisible().catch(() => false)) return { ok: true, attempts: attempt - 1 };
    if (await verificationModal.isVisible().catch(() => false)) {
      return { ok: true, attempts: attempt - 1, state: 'verification_required' };
    }

    // If modal overlay is up, do not click submit again.
    if (await retry.isVisible().catch(() => false)) {
      await retry.click({ timeout: 30000 });
      await page.waitForTimeout(1500);
      continue;
    }

    try {
      await submit.click({ timeout: 15000, force: true });
    } catch {
      await page.waitForTimeout(1500);
      continue;
    }
    await page.waitForTimeout(1500);

    if (await successLocator.isVisible().catch(() => false)) return { ok: true, attempts: attempt };
  }

  return { ok: false, attempts: 6, state: 'timeout' };
}

const browser = await chromium.launch({ headless: true });
try {
  // Unauthenticated flow
  const ctx1 = await browser.newContext();
  const page1 = await ctx1.newPage();
  await page1.goto(`${base}/launch`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await fillIdeaAndEmail(page1, 'Unauthenticated smoke idea: AI compliance copilot for local contractors in Austin with fixed-price onboarding.');
  const verifyModal = page1.getByText('Check your email to continue', { exact: false });
  results.unauthenticated.submit = await submitWithRetries(page1, verifyModal);
  results.unauthenticated.modalVisible = await verifyModal.isVisible().catch(() => false);
  await page1.screenshot({ path: `${outDir}/01-unauth-state.png`, fullPage: true });
  await ctx1.close();

  // Authenticated flow
  const em = email.toLowerCase();
  const token = jwt.sign({ type: 'verified_email_session', email: em, emailHash: crypto.createHash('sha256').update(em).digest('hex'), sessionId: crypto.randomUUID() }, jwtSecret, { expiresIn: 3600 });
  const ctx2 = await browser.newContext();
  await ctx2.addCookies([{ name: 'forgepilot-email-session', value: token, url: base, httpOnly: true, secure: true, sameSite: 'Lax' }]);
  const page2 = await ctx2.newPage();
  await page2.goto(`${base}/launch`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await fillIdeaAndEmail(page2, 'Authenticated smoke idea: mobile detailing membership for commuters in Austin with app booking and monthly plans.');

  const clarify = page2.getByText('Two quick questions to tighten the plan', { exact: false });
  const brief = page2.getByText('Your Launch Plan Preview', { exact: false });

  results.authenticated.submit = await submitWithRetries(page2, clarify);
  let state = 'unknown';

  if (await clarify.isVisible().catch(() => false)) {
    const areas = page2.locator('textarea');
    const count = await areas.count();
    for (let i = 0; i < count; i++) {
      await areas.nth(i).fill(`Smoke answer ${i + 1}: validated ICP, budget constraints, and fastest paid channel.`);
    }
    await page2.getByRole('button', { name: /Generate Launch Plan Preview/i }).click({ timeout: 60000 });
    await brief.waitFor({ timeout: 240000 });
    state = 'brief_after_clarify';
  } else if (await brief.isVisible().catch(() => false)) {
    state = 'brief_direct';
  } else if (await page2.getByText('Check your email to continue', { exact: false }).isVisible().catch(() => false)) {
    state = 'verification_required';
  } else {
    state = 'no_preview';
  }

  results.authenticated.state = state;
  results.authenticated.traceVisible = await page2.getByText('Trace:', { exact: false }).isVisible().catch(() => false);
  results.authenticated.receiptVisible = await page2.getByText('Receipt:', { exact: false }).isVisible().catch(() => false);
  await page2.screenshot({ path: `${outDir}/02-auth-state.png`, fullPage: true });
  fs.writeFileSync(`${outDir}/02-auth-body-snippet.txt`, (await page2.locator('body').innerText()).slice(0, 12000));
  await ctx2.close();
} finally {
  await browser.close();
}

results.finishedAt = new Date().toISOString();
fs.writeFileSync(`${outDir}/results.json`, JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
