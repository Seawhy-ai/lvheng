const {chromium}=require("playwright"),assert=require("node:assert/strict");
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:"/usr/bin/chromium",args:["--no-sandbox"]});
 try{
  const p=await browser.newPage({viewport:{width:390,height:844},serviceWorkers:"block"});
  const errors=[],requests=[];p.on("pageerror",e=>errors.push(e.message));
  await p.addInitScript(()=>localStorage.setItem("lvheng_classroom_session_v1",JSON.stringify({user:{id:"s1",role:"student",name:"小林"},token:"test"})));
  await p.route("https://lvheng-api.yhtbw5tps7.workers.dev/**",async route=>{
   if(new URL(route.request().url()).pathname==="/api/agent/coach"){
    const body=route.request().postDataJSON();requests.push(body);
    await new Promise(r=>setTimeout(r,250));
    return route.fulfill({json:{coach:body.mode==="quick"?{mode:"quick",answer:"直接回答：劳动仲裁是处理劳动争议的一种程序。"}:{mode:"guided",diagnosis:"先整理关键事实。",nextQuestion:"有哪些考勤证据？"}}});
   }
   await route.fulfill({json:{tasks:[]}});
  });
  await p.goto("http://127.0.0.1:8765/classroom.html");await p.waitForSelector("#whaleFloat");await p.click("#whaleFloat");
  assert.equal(await p.locator('[data-whale-mode="quick"]').getAttribute("aria-pressed"),"true");
  await p.fill("#whaleInput","你好");await p.click("#whaleForm button");
  await p.click('[data-whale-mode="guided"]');
  await p.waitForTimeout(400);
  assert.ok(!(await p.locator("#whaleMessages").innerText()).includes("直接回答"));
  await p.fill("#whaleInput","我有一份考勤表");await p.click("#whaleForm button");
  await p.waitForFunction(()=>document.getElementById("whaleMessages").textContent.includes("有哪些考勤证据"));
  await p.fill("#whaleInput","引导模式草稿");
  await p.click('[data-whale-mode="quick"]');
  assert.match(await p.locator("#whaleMessages").innerText(),/直接回答/);
  assert.equal(await p.inputValue("#whaleInput"),"");
  await p.fill("#whaleInput","继续说");await p.click("#whaleForm button");
  await p.waitForFunction(()=>!document.querySelector("#whaleForm button").disabled);
  assert.equal(requests[2].mode,"quick");
  assert.deepEqual(requests[2].history.map(m=>m.role),["user","assistant"]);
  assert.ok(!JSON.stringify(requests[2].history).includes("考勤"));
  await p.click('[data-whale-mode="guided"]');assert.equal(await p.inputValue("#whaleInput"),"引导模式草稿");
  const box=await p.locator("#whaleDialog").boundingBox();assert.ok(box.y>=0&&box.x>=0&&box.x+box.width<=390);
  await p.screenshot({path:"/tmp/lvheng-whale-modes.png"});
  assert.deepEqual(errors,[]);console.log("PASS: mode tabs, separate histories/drafts, in-flight switching, short input and mobile layout");
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
