import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import fs from 'node:fs';import assert from 'node:assert/strict';
const sql=new DatabaseSync(':memory:');sql.exec(fs.readFileSync(new URL('../fastgpt-worker/migrations/0001_classroom.sql',import.meta.url),'utf8'));
const DB={prepare(query){let args=[];return {bind(...a){args=a;return this},async first(){return sql.prepare(query).get(...args)||null},async all(){return {results:sql.prepare(query).all(...args)}},async run(){const r=sql.prepare(query).run(...args);return {success:true,meta:{changes:Number(r.changes)}}}}},async batch(rows){sql.exec('BEGIN');try{const r=[];for(const q of rows)r.push(await q.run());sql.exec('COMMIT');return r}catch(e){sql.exec('ROLLBACK');throw e}}};
const worker=(await import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync(new URL('../fastgpt-worker/worker.js',import.meta.url),'utf8')).toString('base64'))).default;
for(const [id,role,name] of [['t1','teacher','王老师'],['t2','teacher','李老师'],['s1','student','小林'],['s2','student','小周']]){sql.prepare('INSERT INTO users VALUES(?,?,?,?,?,?,?)').run(id,role,id,name,'hash','salt','2026-01-01');sql.prepare('INSERT INTO sessions VALUES(?,?,?,?)').run(createHash('sha256').update(id).digest('base64'),id,'2099-01-01','2026-01-01')}
sql.exec("INSERT INTO classes VALUES('c1','t1','一班','ABCDEF',0,'2026-01-01'); INSERT INTO classes VALUES('c2','t2','二班','GHIJKL',0,'2026-01-01');INSERT INTO class_members VALUES('c1','s1','2026-01-01');INSERT INTO class_members VALUES('c2','s2','2026-01-01')");
async function call(who,path,method='GET',body,status=200){const r=await worker.fetch(new Request('https://test'+path,{method,headers:{authorization:'Bearer '+who,'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})}),{DB});const d=await r.json();assert.equal(r.status,status,JSON.stringify(d));return d}
assert.deepEqual((await call('s1','/api/messages/contacts')).contacts.map(x=>x.id),['t1']);
const profile=await call('s1','/api/student/profile','PATCH',{name:'林同学',studentNumber:'0012'});assert.equal(profile.profile.name,'小林');assert.equal(profile.nameRequest.status,'pending');assert.equal(sql.prepare("SELECT display_name FROM users WHERE id='s1'").get().display_name,'小林');
const req=profile.nameRequest.id;
await call('t2','/api/name-requests/'+req+'/decision','POST',{decision:'approved'},404);
await call('s1','/api/name-requests/'+req+'/decision','POST',{decision:'approved'},403);
await call('s1','/api/student/profile','PATCH',{name:'其他名字',studentNumber:''},409);
await call('t1','/api/name-requests/'+req+'/decision','POST',{decision:'approved'});
assert.equal((await call('s1','/api/student/profile')).profile.name,'林同学');
await call('t1','/api/name-requests/'+req+'/decision','POST',{decision:'rejected'},409);
let m={recipientId:'t1',body:'老师，证据需要补充什么？',kind:'chat',clientId:'unique-message-1'};
await call('s1','/api/messages','POST',m,201);await call('s1','/api/messages','POST',m,201);
assert.equal((await call('t1','/api/messages/status')).unread,1);
await call('s1','/api/messages','POST',{...m,recipientId:'t2',clientId:'unique-message-2'},403);
await call('s1','/api/messages','POST',{...m,kind:'feedback',clientId:'unique-message-3'},403);
await call('s2','/api/messages?peer=t1','GET',null,403);
const feedback={recipientId:'s1',body:'证据链完整，下一次补充合同约定。',kind:'feedback',clientId:'unique-feedback-1'};
await call('t1','/api/messages','POST',feedback,201);
const history=await call('s1','/api/messages?peer=t1');assert.equal(history.messages.length,2);assert(history.messages.some(x=>x.kind==='feedback'));
await call('s1','/api/messages/read','POST',{peer:'t1',through:'2099-01-01'});assert.equal((await call('s1','/api/messages/status')).unread,0);
// More than 50 messages paginate without duplicate boundary records.
for(let i=0;i<55;i++)await call('t1','/api/messages','POST',{...feedback,body:'点评 '+i,clientId:'page-message-'+i},201);
const page1=await call('s1','/api/messages?peer=t1');assert.equal(page1.messages.length,50);assert(page1.cursor);
const page2=await call('s1','/api/messages?peer=t1&before='+encodeURIComponent(page1.cursor));assert.equal(page2.messages.length,7);assert.equal(new Set([...page1.messages,...page2.messages].map(x=>x.id)).size,57);
await call('s1','/api/messages','POST',{...m,body:'x'.repeat(2001)},400);
const rejected=await call('s1','/api/student/profile','PATCH',{name:'林小同学',studentNumber:'0012'});await call('t1','/api/name-requests/'+rejected.nameRequest.id+'/decision','POST',{decision:'rejected'});assert.equal((await call('s1','/api/student/profile')).profile.name,'林同学');
sql.exec("UPDATE classes SET archived=1 WHERE id='c1'");await call('s1','/api/messages?peer=t1','GET',null,403);await call('t1','/api/messages','POST',feedback,403);
console.log('PASS: real SQLite name approval/rejection, role and class permissions, chat/feedback, read status, idempotency, pagination, archived class');
export {worker,DB,sql};
