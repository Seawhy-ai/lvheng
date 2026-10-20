const {chromium}=require("playwright");
const assert=require("node:assert/strict");
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:["--no-sandbox"]});
 try{
  const errors=[];
  async function create(role){
   const p=await browser.newPage({serviceWorkers:"block"});
   p.on("pageerror",e=>errors.push(e.message));
   await p.route("https://lvheng-api.yhtbw5tps7.workers.dev/**",async r=>{
    const path=new URL(r.request().url()).pathname;
    let json={};
    if(path==="/health")json={ok:true,taskStudio:1};
    if(path==="/api/classes")json={classes:[{id:"c1",name:"法律素养一班",code:"ABC123",studentCount:18}]};
    if(path==="/api/tasks")json={tasks:Array.from({length:5},(_,i)=>({id:"t"+i,title:"生活中的法律判断与证据分析 "+i,scenario:"通过实际情境分析，学习事实梳理、证据保存以及合理的解决路径。",status:"published",className:"法律素养一班",submissionCount:12}))};
    if(path.endsWith("/dashboard"))json={stats:{students:18,publishedTasks:5,submissions:12,average:82,abilities:{issue:85,fact:79,evidence:72,law:80,path:88}},recent:[{studentName:"小林",taskTitle:"生活中的法律判断",total:88}]};
    if(path==="/api/student/report")json={report:{completed:1,average:82,abilities:{issue:80},recent:[{taskTitle:"生活中的法律判断",className:"法律素养一班",total:82}]}};
    await r.fulfill({json});
   });
   if(role)await p.addInitScript(role=>{
    localStorage.setItem("lvheng_classroom_api_v1","https://lvheng-api.yhtbw5tps7.workers.dev");
    localStorage.setItem("lvheng_classroom_session_v1",JSON.stringify({user:{id:"test-"+role,role,name:"测试用户"},token:"test"}));
   },role);
   return p;
  }
  async function fit(p,label){
   assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,label+" page overflow");
  }
  for(const width of [1024,1280,1440,1920,390]){
   for(const role of [null,"teacher","student"]){
    const p=await create(role);await p.setViewportSize({width,height:width===1024?650:900});
    await p.goto("http://127.0.0.1:8765/classroom.html");
    await p.waitForSelector(role==="teacher"?".dash-grid":role==="student"?"#atlasContinue":".welcome-layout");
    await fit(p,`${role} ${width}`);
    if(width===1440)await p.screenshot({path:`/tmp/lvheng-desktop-${role||"home"}.png`,fullPage:true});
    if(role==="student"){
     if(width>=1024){
      const nav=await p.locator(".student-bottom").boundingBox(),view=await p.locator("#view").boundingBox();
      assert.ok(nav.x+nav.width<view.x,"sidebar must not cover content");
     }
     for(const tab of ["class","report","resources"]){
      await p.click(`[data-snav="${tab}"]`);
      await p.waitForSelector(tab==="class"?".student-class-list":tab==="report"?".student-report":".resource-grid");
      await fit(p,`student ${tab} ${width}`);
     }
     await p.click("#whaleFloat");
     const panel=await p.locator("#whaleDialog").boundingBox();
     assert.ok(panel.x>=0&&panel.x+panel.width<=width+1&&panel.y>=0,"whale fits viewport");
    }
    if(role==="teacher"){
     await p.click("#newTask");await p.waitForSelector(".studio-editor");
     await fit(p,`studio ${width}`);
     const card=await p.locator(".cm-modal-card").boundingBox();
     assert.ok(card.x>=0&&card.x+card.width<=width+1,"editor fits viewport");
     if(width>=1024){
      const footer=await p.locator(".studio-footer").boundingBox();
      assert.ok(footer.y>=0&&footer.y+footer.height<= (width===1024?650:900),"publish controls remain visible");
     }
    }
    await p.close();
   }
  }
  for(const width of [1024,1440,1920,390]){
   for(const [route,id] of [["laws","dbView"],["cases","caseView"],["quiz","quizView"],["documents","docView"],["calculator","calcView"]]){
    const p=await create();await p.setViewportSize({width,height:900});
    await p.goto(`http://127.0.0.1:8765/law.html?resource=${route}&from=classroom`);
    await p.waitForSelector(`#${id}.show`);
    await fit(p,`${route} ${width}`);
    const overflow=await p.locator(`#${id}`).evaluate(el=>el.scrollWidth>el.clientWidth+1);
    assert.equal(overflow,false,`${route} internal overflow ${width}`);
    if(width===1440)await p.screenshot({path:`/tmp/lvheng-desktop-${route}.png`});
    await p.close();
   }
  }
  assert.deepEqual(errors,[]);console.log("PASS: desktop/mobile entry, teacher studio, student tabs/assistant and all five resource modules");
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
