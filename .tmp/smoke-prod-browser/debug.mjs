import { chromium } from 'playwright';
import fs from 'fs';
const base=process.env.SMOKE_BASE_URL;
const browser=await chromium.launch({headless:true});
const ctx=await browser.newContext();
const page=await ctx.newPage();
await page.goto(`${base}/launch`,{waitUntil:'domcontentloaded',timeout:120000});
await page.waitForTimeout(2000);
const textarea=page.locator('textarea').first();
await textarea.click();
await textarea.fill('debug smoke idea with enough length over twenty chars 12345');
const email=page.locator('input[type="email"]').first();
await email.fill('morganclint76@gmail.com');
await page.waitForTimeout(1000);
const disabled = await page.evaluate(() => {
  const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Build My 90-Day Launch Plan'));
  const ta = document.querySelector('textarea');
  const email = document.querySelector('input[type="email"]');
  return {
    buttonDisabled: btn ? btn.hasAttribute('disabled') : null,
    buttonText: btn?.textContent,
    ideaValue: ta?.value,
    ideaLen: ta?.value?.length,
    emailValue: email?.value,
  };
});
fs.mkdirSync('.tmp/smoke-prod-browser',{recursive:true});
await page.screenshot({path:'.tmp/smoke-prod-browser/debug-disabled.png', fullPage:true});
console.log(JSON.stringify(disabled,null,2));
await browser.close();
