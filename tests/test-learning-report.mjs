import assert from "node:assert/strict";
import fs from "node:fs";
const source=fs.readFileSync(new URL("../fastgpt-worker/worker.js",import.meta.url),"utf8");
const {default:worker,learningDiagnosis,cleanSimilarPractice,taskLearningRecords,classQuestionInsights}=await import("data:text/javascript;base64,"+Buffer.from(source).toString("base64"));
const question={ability:"law",prompt:"主张惩罚性赔偿前应核对哪些条件？",options:["评论数量","消费者权益保护法第55条适用条件","粉丝数","包装颜色"],answer:1,explain:"应核验消费欺诈及惩罚性赔偿的适用条件。"};
const row={id:"sub1",task_id:"task-1",taskTitle:"网购纠纷",title:"网购纠纷",content_json:JSON.stringify({questions:[question]}),feedback_json:JSON.stringify([{correct:false,selected:0,answer:1,explain:question.explain}]),total_score:40,scores_json:'{"law":8}',submitted_at:"2026-10-21"};
const d=learningDiagnosis([row]);
assert.equal(d.weakCount,1);assert.equal(d.questionCount,1);assert.equal(d.points[0].accuracy,0);
assert.equal(d.points[0].label,"消费欺诈与惩罚性赔偿");assert.equal(d.points[0].evidence[0].selected,"评论数量");
assert.equal(learningDiagnosis([]).points.length,0);
const good={...row,feedback_json:JSON.stringify([{correct:true,selected:1,answer:1}])};
assert.equal(learningDiagnosis([row,good]).points[0].accuracy,50);
assert.equal(taskLearningRecords([row])[0].review[0].selected,"评论数量");
assert.equal(taskLearningRecords([good])[0].correct,1);
assert.equal(taskLearningRecords([{...row,feedback_json:"bad"}])[0].questionCount,0);
const insight=classQuestionInsights([row,good]);assert.equal(insight[0].wrong,1);assert.equal(insight[0].attempts,2);assert.equal(insight[0].wrongChoices[0].count,1);
assert.equal(classQuestionInsights([good]).length,0);
assert.equal(learningDiagnosis([{...row,feedback_json:"not json"}]).questionCount,0);
const raw={questions:[0,1,2].map(i=>({...question,prompt:question.prompt+i}))};
assert.equal(cleanSimilarPractice(raw).questions.length,3);
assert.throws(()=>cleanSimilarPractice({questions:[question]}));
assert.throws(()=>cleanSimilarPractice({questions:[0,1,2].map(i=>({...question,prompt:question.prompt+i,answer:7}))}));
let role="student",owns=true,modelCalls=0;
const env={DEEPSEEK_API_KEY:"test-only",DB:{prepare(sql){return{
 args:[],bind(...args){this.args=args;return this},
 async first(){if(sql.includes("FROM sessions"))return{id:"student-1",role};if(sql.includes("FROM submissions")){assert.equal(this.args[1],"student-1");return owns?row:null}return null},
 async all(){assert.ok(sql.includes("WHERE s.student_id=?"));assert.equal(this.args[0],"student-1");return{results:[row]}}
}}}};
const originalFetch=globalThis.fetch;
globalThis.fetch=async(url,opts)=>{modelCalls++;assert.equal(url,"https://api.deepseek.com/chat/completions");const body=JSON.parse(opts.body);assert.ok(!JSON.stringify(body.messages).includes("student-1"));return Response.json({choices:[{message:{content:JSON.stringify(raw)}}]})};
async function call(path,body){return worker.fetch(new Request("https://test.example"+path,{method:body?"POST":"GET",headers:{authorization:"Bearer test","content-type":"application/json"},...(body?{body:JSON.stringify(body)}:{})}),env)}
try{
 let response=await call("/api/student/report");assert.equal(response.status,200);assert.equal((await response.json()).report.diagnosis.weakCount,1);
 response=await call("/api/student/similar-practice",{taskId:"task-1",questionIndex:0});assert.equal(response.status,200);assert.equal((await response.json()).practice.questions.length,3);assert.equal(modelCalls,1);
 owns=false;response=await call("/api/student/similar-practice",{taskId:"other",questionIndex:0});assert.equal(response.status,403);assert.equal(modelCalls,1);
 role="teacher";response=await call("/api/student/similar-practice",{taskId:"task-1",questionIndex:0});assert.equal(response.status,403);assert.equal(modelCalls,1);
 role="student";response=await call("/api/student/similar-practice",{taskId:"task-1",questionIndex:9});assert.equal(response.status,400);
 console.log("PASS: evidence-based diagnosis, grading semantics, malformed history, practice validation and ownership");
}finally{globalThis.fetch=originalFetch}
