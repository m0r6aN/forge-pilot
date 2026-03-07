import { chromium } from 'playwright';
const base=process.env.SMOKE_BASE_URL;
const browser=await chromium.launch({headless:true});
for(let i=1;i<=5;i++){
  const ctx=await browser.newContext();
  const page=await ctx.newPage();
  await page.goto(`${base}/launch`,{waitUntil:'domcontentloaded',timeout:300000});
  await page.waitForTimeout(1500);
  const ta=page.locator('textarea').first();
  const em=page.locator('input[type="email"]').first();
  await ta.fill('iteration '+i+' idea text that is definitely above twenty characters with detail for state update');
  await em.fill('morganclint76@gmail.com');
  await page.waitForTimeout(1000);
  const st=await page.evaluate(()=>{const b=Array.from(document.querySelectorAll('button')).find(x=>x.textContent?.includes('Build My 90-Day Launch Plan')); const t=document.querySelector('textarea'); return {disabled:b?.hasAttribute('disabled'),len:t?.value?.length,text:t?.value};});
  console.log('iter',i,JSON.stringify(st));
  await ctx.close();
}
await browser.close();
