const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({headless:true});try{
for(const width of [390,1440]){
const page=await browser.newPage({viewport:{width,height:950},serviceWorkers:'block'}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>localStorage.setItem('lvheng_classroom_session_v1',JSON.stringify({user:{id:'teacher',name:'林老师',role:'teacher'},token:'test'})));
await page.route('https://lvheng-api.yhtbw5tps7.workers.dev/**',async r=>{const path=new URL(r.request().url()).pathname;await r.fulfill({json:path==='/api/classes'?{classes:[{id:'c1',name:'一班',code:'ABC123'},{id:'c2',name:'二班',code:'XYZ789'}]}:path.endsWith('/dashboard')?{stats:{students:20,publishedTasks:0,submissions:0,average:null,abilities:{}},recent:[]}:{tasks:[]}})});
await page.goto('http://127.0.0.1:8766/classroom.html');await page.waitForSelector('.teacher-workspace');
assert.equal(await page.locator('.teacher-page:visible').count(),1);
assert.equal(await page.locator('#newClass').isVisible(),false);
await page.click('[data-teacher-page=classes]');await page.waitForSelector('#newClass');await page.click('#newClass');await page.waitForSelector('#classForm');await page.keyboard.press('Escape');
await page.click('[data-class=c2]');await page.waitForFunction(()=>document.querySelector('[data-class=c2]')?.getAttribute('aria-pressed')==='true');
await page.click('[data-teacher-page=tasks]');await page.waitForSelector('#newTask');assert.equal(await page.inputValue('#teacherClassSelect'),'c2');
await page.click('#newTask');await page.waitForSelector('#modal:not([hidden])');await page.keyboard.press('Escape');
await page.click('[data-teacher-page=insights]');await page.click('#tab-actions');await page.waitForSelector('#aiInsight');assert.equal(await page.locator('#aiTask').isVisible(),false);
await page.goBack();await page.waitForSelector('#newTask');await page.reload();await page.waitForSelector('#newTask');
assert.equal(await page.locator('.teacher-page:visible').count(),1);
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
await page.screenshot({path:'/tmp/lvheng-teacher-pages-'+width+'.png',fullPage:true});assert.deepEqual(errors,[]);console.log('PASS teacher pages '+width+': routes, back/reload, class context, forms, overflow');await page.close();
}}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
