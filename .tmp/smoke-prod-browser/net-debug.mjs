import { chromium } from 'playwright';
const base=process.env.SMOKE_BASE_URL;
const browser=await chromium.launch({headless:true});
const ctx=await browser.newContext();
const page=await ctx.newPage();
page.on('response', async (resp) => {
  if (resp.url().includes('/api/launch/teaser')) {
    let text='';
    try { text = await resp.text(); } catch {}
    console.log('TEASER_RESPONSE', resp.status(), text.slice(0,500));
  }
});
await page.goto(`${base}/launch`, {waitUntil:'domcontentloaded', timeout:1200000});
await page.waitForTimeout(2000);
await page.locator('textarea').first().fill('Browser network debug idea long enough to submit and inspect teaser response payload path.');
await page.locator('input[type="email"]').first().fill('morganclint76@gmail.com');
await page.getByRole('button',{name:/Build My 90-Day Launch Plan/i}).click();
await page.waitForTimeout(120000);
console.log('BODY_SNIP', (await page.locator('body').innerText()).slice(0,1500));
await browser.close();


