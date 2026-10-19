import assert from "node:assert/strict";
import fs from "node:fs";

const source=fs.readFileSync(new URL("../fastgpt-worker/worker.js",import.meta.url),"utf8");
const mod=await import("data:text/javascript;base64,"+Buffer.from(source).toString("base64"));
const questions=["issue","fact","evidence","law","path"].map((ability,i)=>({
  ability,prompt:`第${i+1}个有效教学问题`,options:["正确项","错误项"],answer:0,explain:"用于测试的解析"
}));

const valid=mod.validateContent({questions:structuredClone(questions)});
assert.equal(valid.questions.length,5);
assert.deepEqual(valid.questions.map(x=>x.ability),["issue","fact","evidence","law","path"]);

const perfect=mod.evaluate(valid,[0,0,0,0,0]);
assert.equal(perfect.total,100);
assert.deepEqual(perfect.scores,{issue:20,fact:20,evidence:20,law:20,path:20});

const mixed=mod.evaluate(valid,[0,1,0,1,0]);
assert.equal(mixed.total,76);
assert.equal(mixed.details.filter(x=>x.correct).length,3);

assert.throws(()=>mod.validateContent({questions:structuredClone(questions).map(x=>({...x,ability:"issue"}))}),/五个题目/);
assert.throws(()=>mod.evaluate(valid,[0,0]),/全部5个环节/);

const h1=await mod.passwordHash("safe-password","salt-a");
const h2=await mod.passwordHash("safe-password","salt-a");
const h3=await mod.passwordHash("safe-password","salt-b");
assert.equal(h1,h2);
assert.notEqual(h1,h3);

const parsed=mod.modelJson({choices:[{message:{content:'```json\n{"summary":"基于真实数据"}\n```'}}]});
assert.equal(parsed.summary,"基于真实数据");
assert.throws(()=>mod.modelJson({choices:[{message:{content:"不是结构化结果"}}]}),/结构化/);
const coach=mod.cleanCoach({diagnosis:"需要补充事实",nextQuestion:"工资如何约定？",missingFacts:["工资约定"],laws:["劳动合同法"],evidence:["聊天记录"],actions:["固定证据"]});
assert.equal(coach.source,"fastgpt");
assert.equal(coach.nextQuestion,"工资如何约定？");
const insight=mod.cleanInsight({summary:"证据意识偏弱",findings:["证据维度最低"],groups:["基础组"],interventions:["补充微课"]});
assert.deepEqual(insight.interventions,["补充微课"]);

const migration=fs.readFileSync(new URL("../fastgpt-worker/migrations/0001_classroom.sql",import.meta.url),"utf8");
for(const table of ["users","sessions","classes","class_members","tasks","submissions"]){
  assert.match(migration,new RegExp(`CREATE TABLE ${table}\\b`));
}

console.log("Classroom Worker: 13/13 tests passed");
