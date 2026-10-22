const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 try{for(const width of [390,1440]){
  const p=await browser.newPage({viewport:{width,height:900},serviceWorkers:'block'}),errors=[],calls=[];
  p.on('pageerror',e=>errors.push(e.message));
  await p.addInitScript(()=>localStorage.setItem('lvheng_classroom_session_v1',JSON.stringify({user:{id:'story-student',role:'student',name:'体验者'},token:'test'})));
  await p.route('https://lvheng-api.yhtbw5tps7.workers.dev/**',async r=>{
   if(r.request().url().endsWith('/api/agent/coach')){calls.push(r.request().postDataJSON());return r.fulfill({json:{coach:{answer:'你引用了工资约定。还需要核实实际出勤，不能仅凭排班就认定到岗。'}}})}
   return r.fulfill({json:{tasks:[]}});
  });
  await p.goto('http://127.0.0.1:8765/classroom.html');await p.click('[data-scenario="labor"]');
  assert.equal(await p.locator('.story-room').isVisible(),true);
  assert.equal(await p.locator('.evidence-slip').count(),0);
  const firstHint=await p.locator('#storyQuestion').getAttribute('placeholder');
  assert.equal(await p.locator('.xiaolin-avatar').evaluate(img=>img.complete&&img.naturalWidth>0),true);
  await p.fill('#storyQuestion','<img src=x onerror=alert(1)>');await p.locator('.story-ask button').click();
  assert.equal(await p.locator('.story-messages .from-you img').count(),0);
  await p.click('[data-prompt="agreement"]');assert.equal(await p.locator('.evidence-slip').count(),1);
  assert.notEqual(await p.locator('#storyQuestion').getAttribute('placeholder'),firstHint);
  assert.match(await p.locator('#storyQuestion').getAttribute('placeholder'),/多久/);
  await p.check('[data-evidence="agreement"]');
  assert.match(await p.locator('#storyAdvice').getAttribute('placeholder'),/入职前的聊天/);
  await p.click('[data-prompt="attendance"]');await p.click('[data-prompt="refusal"]');await p.click('[data-prompt="identity"]');
  assert.equal(await p.locator('.evidence-slip').count(),4);
  assert.match(await p.locator('#storyQuestion').getAttribute('placeholder'),/写下你的建议/);
  await p.fill('#storyAdvice','先保存聊天记录，核实出勤和经营主体，再书面沟通付款。');
  await p.click('.story-review');await p.waitForFunction(()=>document.querySelector('.story-ai-note')?.textContent.includes('核实实际出勤'));
  assert.equal(calls[0].mode,'quick');assert.match(calls[0].message,/实际引用：agreement/);
  assert.match(await p.locator('.story-reflection').innerText(),/引用 1 份/);
  assert.equal(await p.locator('.story-room').evaluate(e=>e.scrollWidth>e.clientWidth),false);
  await p.locator('.story-room').evaluate(e=>e.scrollTop=0);
  await p.screenshot({path:'/tmp/story-room-'+width+'.png'});
  await p.keyboard.press('Escape');assert.equal(await p.locator('.story-room').count(),0);
  await p.click('[data-scenario="labor"]');assert.equal(await p.locator('.evidence-slip').count(),4);assert.match(await p.inputValue('#storyAdvice'),/核实出勤/);
  await p.click('.story-close');await p.click('[data-scenario="rent"]');assert.equal(await p.locator('#whaleDialog').isVisible(),true);
  assert.deepEqual(errors,[]);await p.close();console.log('PASS story room:',width,'evidence, safe text, AI reflection, resume, other scenarios');
 }}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
