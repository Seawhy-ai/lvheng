const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});try{
 const p=await b.newPage({viewport:{width:390,height:844},serviceWorkers:'block'});let calls=0;const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.route('https://lvheng-api.yhtbw5tps7.workers.dev/**',async r=>{if(r.request().url().endsWith('/api/auth/login')){calls++;await new Promise(resolve=>setTimeout(resolve,600));return r.fulfill({status:401,json:{error:'账号或密码错误'}})}return r.fulfill({json:{tasks:[]}})});
 await p.goto('http://127.0.0.1:8765/classroom.html');
 for(const [entry,form] of [['#studentEntry','#joinForm'],['#teacherEntry','#loginForm']]){
 await p.click(entry);await p.locator(form+' input[name=username]').fill('test');await p.locator(form+' input[type=password]').fill('12345678');
 assert.ok(await p.locator(form+' input[type=password]').evaluate(el=>parseFloat(getComputedStyle(el).fontSize)>=16));
 await p.locator(form+' .primary').click();assert.equal(await p.locator(form+' .auth-spinner').isVisible(),true);assert.equal(await p.locator(form+' .primary').isDisabled(),true);
 await p.waitForFunction(sel=>!document.querySelector(sel+' .primary').disabled,form);assert.equal(await p.locator(form+' .auth-spinner').count(),0);await p.click('#modalClose');
 }
 assert.equal(calls,2);
 await p.evaluate(()=>localStorage.setItem('lvheng_classroom_session_v1',JSON.stringify({user:{id:'s',role:'student',name:'测试'},token:'t'})));await p.reload();await p.waitForSelector('.scene-xiaolin img');
 for(const img of await p.locator('.scene-xiaolin img').all()){const css=await img.evaluate(el=>({radius:getComputedStyle(el).borderRadius,width:el.width,height:el.height,src:el.src}));assert.equal(css.radius,'50%');assert.equal(css.width,css.height);assert.match(css.src,/cutout/)}
 await p.click('[data-scenario=labor]');assert.equal(await p.locator('.xiaolin-avatar').evaluate(el=>getComputedStyle(el).borderRadius),'50%');assert.ok(await p.locator('#storyQuestion').evaluate(el=>parseFloat(getComputedStyle(el).fontSize)>=16));assert.deepEqual(errors,[]);
 console.log('PASS circular avatars, mobile input sizing, student/teacher login spinner and error recovery');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
