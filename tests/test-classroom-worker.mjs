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

const migration=fs.readFileSync(new URL("../fastgpt-worker/migrations/0001_classroom.sql",import.meta.url),"utf8");
for(const table of ["users","sessions","classes","class_members","tasks","submissions"]){
  assert.match(migration,new RegExp(`CREATE TABLE ${table}\\b`));
}

console.log("Classroom Worker: 8/8 tests passed");
