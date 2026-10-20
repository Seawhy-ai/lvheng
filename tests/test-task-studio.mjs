import assert from "node:assert/strict";
import fs from "node:fs";
const source=fs.readFileSync(new URL("../fastgpt-worker/worker.js",import.meta.url),"utf8");
const {default:worker,taskSettings}=await import("data:text/javascript;base64,"+Buffer.from(source).toString("base64"));
const questions=["issue","fact","evidence","law","path"].map(ability=>({
  ability,prompt:"请判断以下情境中的关键事实",options:["正确答案","其他答案"],answer:0,explain:"这是仅教师可见的解析"
}));
let role="teacher",owner="teacher-1",writes=[],calls=0;
let task;
function reset(status="draft",dueAt=null){
  role="teacher";owner="teacher-1";writes=[];
  task={id:"task-1",class_id:"class-1",teacher_id:owner,status,title:"测试情境任务",scenario:"这是一段用于测试的情境描述，不包含真实学生信息。",
    content_json:JSON.stringify({questions,settings:{dueAt,goal:"证据意识"}})};
}
const env={DEEPSEEK_API_KEY:"test-key",DB:{prepare(sql){
  return{args:[],bind(...args){this.args=args;return this},
    async first(){
      if(sql.includes("FROM sessions"))return{id:role==="teacher"?"teacher-1":"student-1",role};
      if(sql.includes("SELECT t.*"))return{...task,teacher_id:owner};
      if(sql.includes("class_members"))return{ok:1};
      if(sql.includes("SELECT * FROM classes"))return{id:"class-1",teacher_id:owner};
      return null;
    },
    async all(){
      if(sql.includes("answers_json"))return{results:[{id:"student-1",name:"测试学生",submissionId:"sub-1",total:100,answers_json:"[0,0,0,0,0]",submittedAt:"2026-01-01T00:00:00Z"}]};
      return{results:[]};
    },
    async run(){writes.push({sql,args:this.args});return{meta:{changes:1}}}
  };
}}};
async function call(path,method="GET",body){
  return worker.fetch(new Request("https://test.example"+path,{
    method,headers:{"content-type":"application/json",authorization:"Bearer test-token"},
    ...(body?{body:JSON.stringify(body)}:{})
  }),env);
}
reset();
let res=await call("/api/tasks/task-1","PATCH",{title:task.title,scenario:task.scenario,content:{questions,settings:{dueAt:"2099-01-01T00:00:00Z"}}});
assert.equal(res.status,200);
assert.equal(JSON.parse(writes[0].args[2]).settings.dueAt,"2099-01-01T00:00:00.000Z");
assert.match(writes[0].sql,/status='draft'/);
reset("published");
res=await call("/api/tasks/task-1","PATCH",{});
assert.equal(res.status,409);assert.equal(writes.length,0);
reset();owner="another-teacher";
res=await call("/api/tasks/task-1/overview");assert.equal(res.status,403);
reset();role="student";
res=await call("/api/tasks/task-1/overview");assert.equal(res.status,403);
reset("published");role="student";
res=await call("/api/tasks/task-1");
const visible=(await res.json()).task.content;
assert.equal(visible.questions[0].answer,undefined);
assert.equal(visible.questions[0].explain,undefined);
assert.equal(visible.settings,undefined);
reset("published","2000-01-01T00:00:00Z");role="student";
res=await call("/api/tasks/task-1/submit","POST",{answers:[0,0,0,0,0]});
assert.equal(res.status,409);assert.equal(writes.length,0);
reset("draft","2000-01-01T00:00:00Z");
res=await call("/api/tasks/task-1/publish","PATCH");
assert.equal(res.status,409);assert.equal(writes.length,0);
reset("published");
res=await call("/api/tasks/task-1/publish","PATCH");assert.equal(res.status,409);
res=await call("/api/tasks/task-1/close","PATCH");assert.equal(res.status,200);
assert.match(writes[0].sql,/status='closed'/);
reset("published");
res=await call("/api/tasks/task-1/overview");
const overview=(await res.json()).overview;
assert.equal(overview.students[0].name,"测试学生");
assert.equal(overview.questions[0].correct,1);
assert.equal(overview.students[0].answers_json,undefined);
reset();
globalThis.fetch=async()=>{calls++;return Response.json({choices:[{message:{content:JSON.stringify({...questions[2],prompt:"重新生成的一道证据意识题目"})}}]})};
res=await call("/api/agent/question-draft","POST",{index:2,scenario:task.scenario,content:{questions}});
assert.equal(res.status,200);
assert.equal((await res.json()).question.ability,"evidence");
assert.equal(calls,1);assert.equal(writes.length,0);
role="student";
res=await call("/api/agent/question-draft","POST",{});
assert.equal(res.status,403);assert.equal(calls,1);
assert.throws(()=>taskSettings({settings:{dueAt:"bad date"}}),/截止时间/);
console.log("Studio ownership, immutable publishing, deadlines, answer privacy, progress and AI regeneration passed");
