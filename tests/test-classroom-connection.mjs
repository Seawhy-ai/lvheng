import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const code=fs.readFileSync(new URL("../classroom.js",import.meta.url),"utf8");
const setup=code.slice(code.indexOf("var API_KEY="),code.indexOf("var abilities="));
const apiKey="lvheng_classroom_api_v1",sessionKey="lvheng_classroom_session_v1";
function boot(values={},blocked=false,search=""){
  const storage=new Map(Object.entries(values));
  const ctx=vm.createContext({location:{search},URLSearchParams,localStorage:{
    getItem(key){if(blocked)throw Error("Storage blocked");return storage.get(key)??null},
    removeItem(key){storage.delete(key)}
  }});
  vm.runInContext(setup+"\nloadConnection();",ctx);
  return ctx;
}
const url="https://lvheng-api.yhtbw5tps7.workers.dev";
assert.equal(boot().apiBase,url);
assert.equal(boot({},true).apiBase,url);
assert.equal(boot({[apiKey]:""}).apiBase,url);
assert.equal(boot({[apiKey]:""},false,"?preview=local").apiBase,"");
const demo=JSON.stringify({user:{id:"demo-teacher",role:"teacher"},token:"demo"});
assert.equal(boot({[sessionKey]:demo}).session,null);
assert.equal(boot({[apiKey]:url,[sessionKey]:demo}).session,null);
assert.equal(boot({[apiKey]:"",[sessionKey]:demo},false,"?preview=local").session.user.id,"demo-teacher");
const real=JSON.stringify({user:{id:"real-user",role:"student"},token:"test-session"});
assert.equal(boot({[apiKey]:url,[sessionKey]:real}).session.user.id,"real-user");
assert.equal(boot({[apiKey]:"https://custom.example",[sessionKey]:real}).apiBase,"https://custom.example");
assert.equal(boot({[sessionKey]:"invalid JSON"}).apiBase,url);
console.log("Default backend, explicit demo, session migration and blocked storage passed");
