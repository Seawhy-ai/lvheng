const {chromium}=require("playwright"),assert=require("node:assert/strict");
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:"/usr/bin/chromium",args:["--no-sandbox"]});
 try{
  const p=await browser.newPage({viewport:{width:390,height:844},serviceWorkers:"block"});
  const errors=[];p.on("pageerror",e=>errors.push(e.message));
  let generated=0;
  await p.addInitScript(()=>localStorage.setItem("lvheng_classroom_session_v1",JSON.stringify({user:{id:"student-1",role:"student",name:"小林"},token:"test"})));
  await p.route("https://lvheng-api.yhtbw5tps7.workers.dev/**",async route=>{
   const path=new URL(route.request().url()).pathname;let json={tasks:[]};
   if(path==="/api/student/report")json={report:{completed:1,average:40,abilities:{law:40},recent:[{taskTitle:"网购纠纷",className:"法律素养一班",total:40}],diagnosis:{version:1,questionCount:1,weakCount:1,points:[{label:"消费欺诈与惩罚性赔偿",ability:"law",attempts:1,correct:0,accuracy:0,taskId:"task-1",questionIndex:0,evidence:[{taskTitle:"网购纠纷",selected:"评论数量",answer:"欺诈的适用条件",explain:"应先核验主观故意与虚假表示等条件。"}]}]}}};
   if(path==="/api/student/similar-practice"){generated++;assert.deepEqual(route.request().postDataJSON(),{taskId:"task-1",questionIndex:0});json={practice:{note:"AI生成，自主巩固，不计入班级成绩。",questions:[0,1,2].map(i=>({prompt:"新情境判断题 "+i,options:["正确项","错误项","不相关项","其他项"],answer:0,explain:"需要核验事实与适用条件，不能只依据评论数量判断。"}))}}}
   await route.fulfill({json});
  });
  await p.goto("http://127.0.0.1:8765/classroom.html");
  await p.waitForSelector("#atlasContinue");
  await p.click('[data-snav="report"]');await p.getByText('查看跨任务知识点分析',{exact:true}).click();await p.waitForSelector(".knowledge-point");
  assert.match(await p.locator(".knowledge-analysis").innerText(),/消费欺诈与惩罚性赔偿/);
  await p.click(".knowledge-evidence summary");assert.match(await p.locator(".knowledge-evidence").innerText(),/评论数量/);
  await p.screenshot({path:"/tmp/lvheng-knowledge-mobile.png",fullPage:true});
  await p.click("[data-similar]");await p.waitForSelector("#similarForm");
  for(let i=0;i<3;i++)await p.check('input[name="practice'+i+'"][value="'+(i===0?1:0)+'"]');
  await p.click("#similarForm .primary");await p.waitForSelector("#similarFeedback h2");
  assert.equal(await p.locator("#similarFeedback h2").innerText(),"答对 2 / 3 题");
  assert.equal(await p.locator("#similarFeedback .review-item").count(),3);assert.equal(generated,1);
  await p.click("#modalClose");
  await p.click('[data-snav="resources"]');await p.waitForSelector(".resource-card");
  assert.ok((await p.locator(".resource-card").first().boundingBox()).height<150);
  const gap=await p.evaluate(()=>{const main=document.querySelector(".student-v2").getBoundingClientRect(),footer=document.querySelector(".site-footer").getBoundingClientRect();return footer.top-main.bottom});
  assert.ok(gap<65,"footer gap: "+gap);
  const about=await p.locator("#aboutBtn").boundingBox(),privacy=await p.locator("#privacyBtn").boundingBox();
  assert.ok(about.x>privacy.x,"About must appear to the right of privacy");
  await p.screenshot({path:"/tmp/lvheng-compact-resources.png",fullPage:true});
  await p.click("#aboutBtn");await p.waitForSelector(".about-sheet");await p.click("#aboutDone");
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await p.setViewportSize({width:1440,height:950});await p.click('[data-snav="report"]');await p.getByText('查看跨任务知识点分析',{exact:true}).click();await p.waitForSelector(".knowledge-analysis");
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.deepEqual(errors,[]);console.log("PASS: compact resource/footer, About position, evidence, AI generation and practice feedback");
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
