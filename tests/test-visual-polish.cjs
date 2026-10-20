const {chromium}=require("playwright");
const assert=require("node:assert/strict");
(async()=>{
  const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:["--no-sandbox"]});
  const errors=[];
  async function page(role,width=1440){
    const p=await browser.newPage({viewport:{width,height:950},serviceWorkers:"block"});
    p.on("pageerror",e=>errors.push(e.message));
    await p.route("https://lvheng-api.yhtbw5tps7.workers.dev/**",async route=>{
      const path=new URL(route.request().url()).pathname;
      let json={};
      if(path==="/health")json={ok:true,database:true,taskStudio:1};
      if(path==="/api/classes")json={classes:[{id:"class-test",name:"法律素养一班",code:"ABC123",studentCount:18}]};
      if(path==="/api/tasks")json={tasks:[{id:"task-test",title:"兼职中的证据与判断",status:"published",scenario:"从一段兼职经历出发，找出关键事实和证据。",className:"法律素养一班",submissionCount:12}]};
      if(path.endsWith("/dashboard"))json={stats:{students:18,publishedTasks:1,submissions:12,average:82,abilities:{issue:85,fact:79,evidence:72,law:80,path:88}},recent:[]};
      if(path==="/api/student/report")json={report:{completed:0,average:null,abilities:{},recent:[]}};
      await route.fulfill({json});
    });
    if(role)await p.addInitScript(role=>{
      localStorage.setItem("lvheng_classroom_api_v1","https://lvheng-api.yhtbw5tps7.workers.dev");
      localStorage.setItem("lvheng_classroom_session_v1",JSON.stringify({user:{id:role+"-test",role,name:role==="teacher"?"林老师":"小林"},token:"test-only"}));
    },role);
    await p.goto("http://127.0.0.1:8765/classroom.html");
    return p;
  }
  async function clean(p){
    assert.equal(await p.locator("#modeBadge,#configBtn,.cm-banner").count(),0);
    assert.ok(!/单机演示模式|共享后端在线|AI陪练 · 内容发送至模型服务|&#x6D41;/.test(await p.locator("body").innerText()));
    assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  }
  const home=await page();
  await home.waitForSelector(".welcome-layout");
  await clean(home);
  await home.screenshot({path:"/tmp/lvheng-polish-home.png",fullPage:true});
  await home.click("#privacyBtn");
  await home.waitForSelector(".privacy-sheet");
  assert.match(await home.locator(".privacy-sheet").innerText(),/DeepSeek/);
  await home.click("#privacyDone");
  await home.setViewportSize({width:390,height:844});
  await clean(home);
  await home.screenshot({path:"/tmp/lvheng-polish-home-mobile.png",fullPage:true});
  const teacher=await page("teacher");
  await teacher.waitForSelector(".agent-console");
  await clean(teacher);
  await teacher.screenshot({path:"/tmp/lvheng-polish-teacher.png",fullPage:true});
  await teacher.setViewportSize({width:390,height:844});
  await clean(teacher);
  await teacher.screenshot({path:"/tmp/lvheng-polish-teacher-mobile.png",fullPage:true});
  const student=await page("student",390);
  await student.waitForSelector("#whaleFloat");
  await clean(student);
  await student.screenshot({path:"/tmp/lvheng-polish-student.png",fullPage:true});
  await student.click("#whaleFloat");
  assert.match(await student.locator("#whaleDialog header").innerText(),/陪你把问题想清楚/);
  assert.ok(!/模型服务|AI陪练/.test(await student.locator("#whaleDialog header").innerText()));
  await student.click("#whalePrivacy");
  await student.waitForSelector(".privacy-sheet");
  assert.match(await student.locator(".privacy-sheet").innerText(),/大模型/);
  await student.click("#privacyDone");
  const library=await browser.newPage({viewport:{width:390,height:844},serviceWorkers:"block"});
  library.on("pageerror",e=>errors.push(e.message));
  await library.goto("http://127.0.0.1:8765/law.html?resource=laws&from=classroom");
  await library.waitForSelector("#dbView",{state:"visible"});
  await library.screenshot({path:"/tmp/lvheng-polish-library.png",fullPage:true});
  assert.equal(await library.locator("#resourceReturn").count(),1);
  assert.deepEqual(errors,[]);
  await browser.close();
  console.log("Polished entry, teacher, student, resource routing and privacy access passed on desktop/mobile");
})().catch(e=>{console.error(e);process.exit(1)});
