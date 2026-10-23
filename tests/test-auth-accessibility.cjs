const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},serviceWorkers:'block'});
  let calls=0;
  await page.route('https://lvheng-api.yhtbw5tps7.workers.dev/**',async route=>{
   calls++;await new Promise(r=>setTimeout(r,250));await route.fulfill({status:401,json:{error:'账号或密码错误，请重新输入'}});
  });
  await page.goto('http://127.0.0.1:8765/classroom.html');
  await page.click('#studentEntry');
  assert.equal(await page.locator('#studentAccount').evaluate(e=>e===document.activeElement),true);
  assert.equal(await page.locator('#app').evaluate(e=>e.inert),true);
  await page.fill('[name=username]','test-student');await page.fill('[name=password]','12345678');
  await page.click('#joinForm .primary');
  assert.equal(await page.locator('#joinForm .primary').isDisabled(),true);
  await page.locator('.auth-error').waitFor();
  assert.equal(await page.inputValue('[name=username]'),'test-student');
  assert.equal(await page.locator('#joinForm .primary').isEnabled(),true);
  assert.equal(calls,1);
  await page.locator('#modalClose').focus();await page.keyboard.press('Shift+Tab');
  assert.equal(await page.locator('#joinForm .primary').evaluate(e=>e===document.activeElement),true);
  await page.keyboard.press('Tab');
  assert.equal(await page.locator('#modalClose').evaluate(e=>e===document.activeElement),true);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#modal').isHidden(),true);
  assert.equal(await page.locator('#studentEntry').evaluate(e=>e===document.activeElement),true);
  assert.equal(await page.locator('#app').evaluate(e=>e.inert),false);
  console.log('PASS: focus entry/trap/restore, Escape, readable persistent errors, retained input, pending state, mobile overflow');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
