const {chromium}=require("playwright");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");

// Regression: the service worker used to replay cached authenticated API GETs.
const handlers={};
vm.runInNewContext(fs.readFileSync("sw.js","utf8"),{
  URL,self:{location:{origin:"https://seawhy-ai.github.io"},addEventListener:(n,f)=>handlers[n]=f},
  caches:{match:async()=>undefined},fetch:async()=>({ok:false})
});
for(const url of [
  "https://lvheng-api.yhtbw5tps7.workers.dev/api/tasks",
  "https://lvheng-api.yhtbw5tps7.workers.dev/api/student/report",
  "https://lvheng-api.yhtbw5tps7.workers.dev/health",
  "https://seawhy-ai.github.io/api/tasks"
]){
  let intercepted=false;
  handlers.fetch({request:new Request(url),respondWith:()=>intercepted=true});
  assert.equal(intercepted,false,url);
}
let assetIntercepted=false;
handlers.fetch({request:new Request("https://seawhy-ai.github.io/lvheng/classroom.js"),respondWith:()=>assetIntercepted=true});
assert.equal(assetIntercepted,true);

(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||"/usr/bin/chromium",args:["--no-sandbox"]});
  try{
    const page=await browser.newPage({serviceWorkers:"block",viewport:{width:390,height:844}});
    const errors=[];page.on("pageerror",e=>errors.push(e.message));
    let submitted=false,posts=0;
    const questions=["issue","fact","evidence","law","path"].map((ability,i)=>({ability,prompt:"判断问题 "+(i+1),options:["选择甲","选择乙"]}));
    await page.addInitScript(()=>{
      localStorage.setItem("lvheng_classroom_api_v1","https://lvheng-api.yhtbw5tps7.workers.dev");
      localStorage.setItem("lvheng_classroom_session_v1",JSON.stringify({user:{id:"test-student",role:"student",name:"测试学生"},token:"test-only"}));
      const original=window.fetch;window.requestCaches=[];
      window.fetch=(url,opts)=>{window.requestCaches.push(opts.cache);return original(url,opts)};
    });
    await page.route("https://lvheng-api.yhtbw5tps7.workers.dev/**",async route=>{
      const path=new URL(route.request().url()).pathname;
      let json={};
      if(path==="/api/tasks")json={tasks:[{id:"test-task",title:"新发布任务",scenario:"测试情境",className:"测试班级",submissionId:submitted?"submission-1":null,totalScore:64}]};
      if(path==="/api/tasks/test-task")json={task:{id:"test-task",title:"新发布任务",scenario:"测试情境",content:{questions}}};
      if(path.endsWith("/submit")){
        posts++;submitted=true;
        await new Promise(r=>setTimeout(r,300));
        json={submission:{id:"submission-1",total:64,scores:{issue:8,fact:8,evidence:8,law:20,path:20},details:questions.map((q,i)=>({ability:q.ability,selected:0,answer:i<3?1:0,correct:i>=3,explain:"解析说明 "+(i+1)}))}};
      }
      if(path==="/api/student/report")json={report:{completed:submitted?1:0,average:64,abilities:{},recent:[]}};
      await route.fulfill({json});
    });
    await page.goto("http://127.0.0.1:8765/classroom.html");
    await page.click("#atlasContinue");
    await page.click("[data-student-task]");
    for(let i=0;i<5;i++)await page.check(`input[name=q${i}][value="0"]`);
    await page.click("#taskForm button.primary");
    assert.equal(await page.locator("#taskForm button.primary").isDisabled(),true);
    await page.waitForSelector(".answer-review");
    assert.equal(await page.locator(".review-item").count(),5);
    assert.match(await page.locator(".answer-review").innerText(),/参考答案：选择乙/);
    assert.match(await page.locator(".answer-review").innerText(),/解析说明 5/);
    assert.equal(posts,1);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.click("#resultDone");
    await page.waitForSelector(".student-class-task.done");
    await page.click('[data-snav="report"]');
    await page.waitForSelector(".student-page-head h1");
    await page.waitForFunction(()=>document.querySelector(".student-page-head h1")?.textContent==="我的学习报告");
    assert.match(await page.locator(".report-summary").innerText(),/已完成 1 个任务/);
    assert.ok((await page.evaluate(()=>window.requestCaches)).every(c=>c==="no-store"));
    assert.deepEqual(errors,[]);
    console.log("PASS: API cache bypass, immediate feedback, duplicate-submit prevention, fresh completion state and report");
  }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
