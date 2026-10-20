import assert from "node:assert/strict";
import fs from "node:fs";
const source=fs.readFileSync(new URL("../fastgpt-worker/worker.js",import.meta.url),"utf8");
const {default:worker}=await import("data:text/javascript;base64,"+Buffer.from(source).toString("base64"));
const env={
  DEEPSEEK_API_KEY:"test-deepseek-key",
  FASTGPT_API_KEY:"old-key",FASTGPT_RELAY_URL:"invalid-old-relay",
  DB:{prepare(){return{bind(){return this},async first(){return{id:"test-user",role:"student"}}}}}
};
function request(path="/api/chat",body={stream:false,messages:[{role:"user",content:"测试连接"}]}){
  return new Request("https://worker.example"+path,{
    method:"POST",headers:{"content-type":"application/json",authorization:"Bearer test-session"},
    body:JSON.stringify(body)
  });
}
let captured;
globalThis.fetch=async(url,init)=>{
  captured={url,init,body:JSON.parse(init.body)};
  return Response.json({choices:[{message:{content:'{"diagnosis":"继续补充事实","nextQuestion":"有哪些证据？"}'}}]});
};
let res=await worker.fetch(new Request("https://worker.example/health"),env);
let health=await res.json();
assert.equal(health.provider,"deepseek");
assert.equal(health.configured,true);
res=await worker.fetch(request(),env);
assert.equal(res.status,200);
assert.equal(captured.url,"https://api.deepseek.com/chat/completions");
assert.equal(captured.init.headers.authorization,"Bearer test-deepseek-key");
assert.equal(captured.init.headers["x-relay-token"],undefined);
assert.equal(captured.body.model,"deepseek-flash");
assert.equal(captured.body.appId,undefined);
assert.equal(captured.body.chatId,undefined);
assert.equal(captured.body.thinking.type,"disabled");
assert.equal(captured.init.redirect,"error");
res=await worker.fetch(request("/api/agent/coach",{message:"兼职工资还没有支付，应该先收集什么材料？"}),env);
assert.equal(res.status,200);
assert.equal((await res.json()).coach.source,"deepseek");
assert.deepEqual(captured.body.response_format,{type:"json_object"});
assert.equal(captured.body.stream,false);
res=await worker.fetch(request(),{...env,AI_PROVIDER:"deepseek",DEEPSEEK_API_KEY:""});
assert.equal(res.status,503);
assert.match(await res.text(),/DEEPSEEK_KEY_MISSING/);
for(const [status,code] of [[401,"AUTH_FAILED"],[402,"BALANCE_LOW"],[429,"RATE_LIMIT"],[500,"UPSTREAM_ERROR"]]){
  globalThis.fetch=async()=>new Response("private-upstream-details",{status});
  res=await worker.fetch(request(),env);
  const text=await res.text();
  assert.match(text,new RegExp("DEEPSEEK_"+code));
  assert.ok(!text.includes("private-upstream-details"));
}
globalThis.fetch=async()=>{throw new Error("private network details")};
res=await worker.fetch(request(),env);
assert.match(await res.text(),/DEEPSEEK_FETCH_FAILED/);
const sse='data: {"choices":[{"delta":{"content":"连接成功"}}]}\n\ndata: [DONE]\n\n';
globalThis.fetch=async(url,init)=>{
  assert.equal(JSON.parse(init.body).stream,true);
  return new Response(sse,{headers:{"content-type":"text/event-stream"}});
};
res=await worker.fetch(request("/api/chat",{stream:true,messages:[{role:"user",content:"test"}]}),env);
assert.equal(res.headers.get("content-type"),"text/event-stream");
assert.equal(await res.text(),sse);
console.log("DeepSeek provider, authenticated coach, errors and streaming passed");
