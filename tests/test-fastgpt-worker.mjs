import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(new URL("../fastgpt-worker/worker.js", import.meta.url), "utf8");
const worker = (await import("data:text/javascript;base64," + Buffer.from(source).toString("base64"))).default;
const env = {
  FASTGPT_API_KEY: "test-only-not-a-real-key",
  FASTGPT_BASE_URL: "https://fastgpt.example",
  FASTGPT_APP_ID: "test-app",
  ALLOWED_ORIGINS: "https://seawhy-ai.github.io"
};

let res = await worker.fetch(new Request("https://proxy.example/health"), env);
assert.equal(res.status, 200);
assert.equal((await res.json()).configured, true);

res = await worker.fetch(new Request("https://proxy.example/api/chat", {
  method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify("错误的字符串请求体")
}), env);
assert.equal(res.status, 400);
assert.match((await res.json()).error, /JSON object/);

let captured;
globalThis.fetch = async (url, init) => {
  captured = { url, init, body: JSON.parse(init.body) };
  return new Response('data: {"choices":[{"delta":{"content":"测试"}}]}\n\ndata: [DONE]\n\n', {
    status: 200, headers: { "content-type": "text/event-stream" }
  });
};
res = await worker.fetch(new Request("https://proxy.example/api/chat", {
  method: "POST",
  headers: { "content-type": "application/json", "origin": "https://seawhy-ai.github.io" },
  body: JSON.stringify({ chatId: "case-1", stream: true, messages: [{ role: "user", content: "欠薪怎么办" }] })
}), env);
assert.equal(res.status, 200);
assert.equal(captured.url, "https://fastgpt.example/api/v1/chat/completions");
assert.equal(captured.body.appId, "test-app");
assert.equal(captured.body.messages[0].content, "欠薪怎么办");
assert.equal(captured.init.headers.authorization, "Bearer test-only-not-a-real-key");
assert.equal(res.headers.get("access-control-allow-origin"), "https://seawhy-ai.github.io");
console.log("FastGPT Worker: 3/3 tests passed");

const relayEnv={...env,FASTGPT_RELAY_URL:"https://relay.example",FASTGPT_RELAY_TOKEN:"test-relay-token-01234567890123456789"};
res=await worker.fetch(new Request("https://proxy.example/api/chat",{
  method:"POST",headers:{"content-type":"application/json"},
  body:JSON.stringify({stream:false,messages:[{role:"user",content:"test"}]})
}),relayEnv);
assert.equal(res.status,200);
assert.equal(captured.url,"https://relay.example/api/v1/chat/completions");
assert.equal(captured.init.headers["x-relay-token"],relayEnv.FASTGPT_RELAY_TOKEN);
assert.equal(captured.init.redirect,"error");
assert.equal(captured.init.headers.authorization,"Bearer test-only-not-a-real-key");
console.log("Worker authenticated relay forwarding passed");

function chatRequest(){
  return new Request("https://proxy.example/api/chat",{
    method:"POST",headers:{"content-type":"application/json"},
    body:JSON.stringify({stream:false,messages:[{role:"user",content:"test"}]})
  });
}
for(const [patch,code] of [
  [{FASTGPT_RELAY_URL:"not a URL"},"RELAY_URL_INVALID"],
  [{FASTGPT_RELAY_URL:"https://relay.example/api"},"RELAY_URL_INVALID"],
  [{FASTGPT_RELAY_TOKEN:""},"RELAY_TOKEN_MISSING"],
  [{FASTGPT_RELAY_TOKEN:relayEnv.FASTGPT_RELAY_TOKEN+"\n"},"RELAY_TOKEN_FORMAT"],
  [{FASTGPT_API_KEY:"key\nprivate-value"},"API_KEY_FORMAT"]
]){
  globalThis.fetch=async()=>{throw new Error("Validation must run before fetch")};
  res=await worker.fetch(chatRequest(),{...relayEnv,...patch});
  assert.equal(res.status,503);
  const body=await res.text();
  assert.ok(body.includes(code),body);
  assert.ok(!body.includes("private-value"));
  assert.ok(!body.includes(relayEnv.FASTGPT_RELAY_TOKEN));
}
globalThis.fetch=async()=>{throw new Error("secret-upstream-message")};
res=await worker.fetch(chatRequest(),relayEnv);
assert.equal(res.status,502);
let body=await res.text();
assert.ok(body.includes("RELAY_FETCH_FAILED"));
assert.ok(!body.includes("secret-upstream-message"));
res=await worker.fetch(chatRequest(),env);
assert.match(await res.text(),/DIRECT_FETCH_FAILED/);
globalThis.fetch=async()=>{throw new DOMException("secret-timeout","TimeoutError")};
res=await worker.fetch(chatRequest(),relayEnv);
assert.equal(res.status,504);
assert.match(await res.text(),/UPSTREAM_TIMEOUT/);
console.log("Safe configuration and network diagnostics passed");
