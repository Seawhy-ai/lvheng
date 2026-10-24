import fs from 'node:fs';import assert from 'node:assert/strict';
const {default:worker}=await import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync('fastgpt-worker/worker.js','utf8')).toString('base64'));
let role='teacher',owner=true,archived=0,writes=0,queries=[];
const DB={prepare(sql){queries.push(sql);return {bind(...args){return {async first(){if(sql.includes('FROM sessions'))return {id:'teacher1',role};if(sql.includes('FROM classes'))return owner?{id:'class1',name:'一班',archived}:null;throw Error(sql)},async all(){return {results:[{id:'student1',name:'小林',username:'lin',submissions:2}]}},async run(){writes++;return {success:true}}}}}}};
async function call(path,method='GET',body){return worker.fetch(new Request('https://example.com/api/classes/class1'+path,{method,headers:{authorization:'Bearer test','content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})}),{DB})}
assert.equal((await call('', 'PATCH',{name:'新班级'})).status,200);assert.equal(writes,1);
assert.equal((await (await call('/members')).json()).members[0].username,'lin');
role='student';assert.equal((await call('/members')).status,403);assert.equal((await call('','PATCH',{name:'恶意更名'})).status,403);
role='teacher';owner=false;assert.equal((await call('/members')).status,404);assert.equal((await call('','PATCH',{name:'恶意更名'})).status,404);
owner=true;archived=1;assert.equal((await call('/members')).status,409);archived=0;assert.equal((await call('','PATCH',{name:' '})).status,400);assert.equal(writes,1);assert.ok(queries.some(s=>s.includes('t.class_id=m.class_id')));console.log('PASS: class ownership, student denial, archived denial, rename validation, scoped member counts');
