import { chromium } from 'playwright';
const base=process.env.SMOKE_BASE_URL;
const browser=await chromium.launch({headless:true});
const ctx=await browser.newContext();
const page=await ctx.newPage();
await page.goto(`${base}/launch`,{waitUntil:'domcontentloaded',timeout:300000});
await page.evaluate(() => {
  const ta = document.querySelector('textarea[placeholder="What are you building, who is it for, and why now?"]');
  const em = document.querySelector('input[placeholder="founder@company.com"]');
  if (!ta || !em) throw new Error('inputs missing');
  ta.value = 'JS-set idea text with length greater than twenty to force canSubmit true and continue flow.';
  ta.dispatchEvent(new Event('input', { bubbles: true }));
  em.value = 'morganclint76@gmail.com';
  em.dispatchEvent(new Event('input', { bubbles: true }));
});
await page.waitForTimeout(1000);
const st = await page.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.textContent?.includes('Build My 90-Day Launch Plan'));const ta=document.querySelector('textarea[placeholder="What are you building, who is it for, and why now?"]'); return {disabled:b?.hasAttribute('disabled'),len:ta?.value?.length};});
console.log(JSON.stringify(st));
await browser.close();
