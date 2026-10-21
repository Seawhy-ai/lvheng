const {chromium}=require("playwright");
const assert=require("node:assert/strict");
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:"/usr/bin/chromium",args:["--no-sandbox"]});
 try {
  const page=await browser.newPage({serviceWorkers:"block"});
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  let taskRequests=0;
  await page.addInitScript(()=>{
   localStorage.setItem("lvheng_classroom_api_v1","https://lvheng-api.yhtbw5tps7.workers.dev");
   localStorage.setItem("lvheng_classroom_session_v1",JSON.stringify({user:{id:"s1",name:"学生",role:"student"},token:"test"}));
   window.oldHomeSeen=false;
   new MutationObserver(()=>{if(document.querySelector(".student-ask-card,.student-hero"))window.oldHomeSeen=true}).observe(document,{subtree:true,childList:true});
  });
  await page.route("https://lvheng-api.yhtbw5tps7.workers.dev/**",async route=>{
   const path=new URL(route.request().url()).pathname;
   if(path==="/api/tasks"){
    taskRequests++;await new Promise(r=>setTimeout(r,350));
    return route.fulfill({json:{tasks:[]}});
   }
   await route.fulfill({json:{report:{completed:0,average:null,abilities:{},recent:[]}}});
  });
  await page.goto("http://127.0.0.1:8765/classroom.html");
  await page.waitForSelector("#atlasContinue");
  assert.equal(taskRequests,1,"home must fetch tasks exactly once");
  await page.evaluate(()=>{window.savedNav=document.querySelector(".student-bottom");window.savedWhale=document.querySelector("#whaleLayer")});
  await page.click("#whaleFloat");
  await page.fill("#whaleInput","还没有发送的问题内容");
  await page.click("#whaleClose");
  await page.click('[data-snav="class"]');
  await page.click('[data-snav="resources"]');
  await page.waitForSelector(".resource-grid a");
  // Wait for the deliberately slow class request to complete.
  await page.waitForTimeout(500);
  assert.equal(await page.locator(".student-page-head h1").innerText(),"学习资源");
  await page.click('[data-snav="home"]');
  await page.waitForSelector("#atlasContinue");
  assert.equal(taskRequests,3,"one initial, one class, one returning-home request");
  assert.equal(await page.evaluate(()=>window.oldHomeSeen),false);
  assert.equal(await page.evaluate(()=>window.savedNav===document.querySelector(".student-bottom")),true);
  assert.equal(await page.evaluate(()=>window.savedWhale===document.querySelector("#whaleLayer")),true);
  assert.equal(await page.inputValue("#whaleInput"),"还没有发送的问题内容");
  await page.setViewportSize({width:390,height:844});
  await page.click('[data-snav="report"]');
  await page.waitForSelector(".student-report");
  assert.equal(await page.locator(".student-bottom").evaluate(el=>el.style.getPropertyValue("--active-tab")),"2");
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.emulateMedia({reducedMotion:"reduce"});
  assert.ok(await page.locator(".student-bottom").evaluate(el=>parseFloat(getComputedStyle(el,"::before").transitionDuration)<.001));
  assert.deepEqual(errors,[]);
  console.log("PASS: no legacy flash, single fetch, stale response guard, persistent navigation/chat, reduced motion");
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
