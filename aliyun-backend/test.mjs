import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { openDatabase } from './database.mjs';
import { createBackend } from './server.mjs';
test('real SQLite and HTTP: auth, class, task, report, restart and safety', async () => {
 const path=join(mkdtempSync(join(tmpdir(),'lvheng-test-')),'test.sqlite');
 const DB=openDatabase(path),server=createBackend({DB,TEACHER_SETUP_CODE:'test-code-12345'});
 server.listen(0,'127.0.0.1');await once(server,'listening');
 const base='http://127.0.0.1:'+server.address().port;
 async function api(path,body,token,method=body?'POST':'GET') {
  const r=await fetch(base+path,{method,headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});
  return {status:r.status,data:await r.json()};
 }
 try {
  assert.equal((await api('/healthz')).status,200);
  assert.equal((await api('/api/classes')).status,401);
  const teacher=await api('/api/auth/teacher/register',{username:'teacher',name:'测试教师',password:'long-password',setupCode:'test-code-12345'});
  assert.equal(teacher.status,201,JSON.stringify(teacher));const token=teacher.data.token;
  assert.equal((await api('/api/auth/login',{username:'teacher',password:'long-password'})).status,200);
  const cls=await api('/api/classes',{name:'测试班级'},token);assert.equal(cls.status,201);
  const student=await api('/api/auth/student/join',{classCode:cls.data.classroom.code,name:'测试学生',pin:'123456'});assert.equal(student.status,200);
  const content={questions:['issue','fact','evidence','law','path'].map(ability=>({ability,prompt:'选择需要核实的事实是什么？',options:['核实原始材料','直接推断结论'],answer:0,explain:'应先核实原始材料，再判断事实。'}))};
  const task=await api('/api/tasks',{classId:cls.data.classroom.id,title:'兼职测试任务',scenario:'同学兼职结束后没有收到约定的工资，需要核实材料。',content},token);
  assert.equal(task.status,201,JSON.stringify(task));
  assert.equal((await api('/api/tasks/'+task.data.task.id+'/publish',{},token,'PATCH')).status,200);
  const submitted=await api('/api/tasks/'+task.data.task.id+'/submit',{answers:[0,0,0,0,0]},student.data.token);assert.equal(submitted.status,201,JSON.stringify(submitted));
  assert.equal((await api('/api/student/report',null,student.data.token)).data.report.completed,1);
  assert.equal((await api('/api/chat',{messages:[]})).status,403);
  const oversized=await fetch(base+'/api/auth/login',{method:'POST',body:'x'.repeat(129*1024)});assert.equal(oversized.status,413);
  assert.equal((await fetch(base+'/healthz',{headers:{origin:'https://untrusted.invalid'}})).status,403);
 } finally {await new Promise(resolve=>server.close(resolve));DB.close();}
 const reopened=openDatabase(path);assert.equal((await reopened.prepare('SELECT COUNT(*) n FROM users').first()).n,2);reopened.close();
});
