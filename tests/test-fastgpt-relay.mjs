import assert from "node:assert/strict";
import {test} from "node:test";
import {EventEmitter} from "node:events";
import {Readable} from "node:stream";
import {createRelay} from "../fastgpt-relay/server.mjs";

test("relay authenticates, preserves streaming, fixes destination, and rejects unsafe upstream responses", async () => {
  const token = "relay-test-token-not-real-0123456789";
  let mode = "ok", calls = 0;
  const server = createRelay({FASTGPT_RELAY_TOKEN:token}, (url, options, cb) => {
    calls++;
    assert.equal(url, "https://fastgpt.sangfor.com.cn:19443/api/v1/chat/completions");
    assert.equal(options.rejectUnauthorized,true);
    assert.equal(options.headers["x-relay-token"],undefined);
    assert.equal(options.headers.authorization,"Bearer test-only");
    const request = new EventEmitter();
    request.destroy = () => {};
    request.end = body => {
      assert.equal(JSON.parse(body).stream,true);
      queueMicrotask(() => {
        if(mode === "tls"){request.emit("error",Object.assign(new Error("private details"),{code:"CERT_HAS_EXPIRED"}));return;}
        const response = Readable.from(['data: {"choices":[]}\n\n','data: [DONE]\n\n']);
        response.statusCode = mode === "redirect" ? 302 : 200;
        response.headers = {"content-type":"text/event-stream"};
        cb(response);
      });
    };
    return request;
  });
  await new Promise(resolve => server.listen(0,"127.0.0.1",resolve));
  const base = "http://127.0.0.1:"+server.address().port;
  const headers = {"content-type":"application/json","authorization":"Bearer test-only","x-relay-token":token};
  const body = JSON.stringify({appId:"test",stream:true,messages:[{role:"user",content:"test"}]});
  try {
    assert.equal((await fetch(base+"/health")).status,200);
    assert.equal((await fetch(base+"/api/v1/chat/completions",{method:"POST",body})).status,401);
    assert.equal(calls,0);
    assert.equal((await fetch(base+"/api/v1/chat/completions",{method:"POST",headers,body:'"string"'})).status,400);
    assert.equal((await fetch(base+"/api/v1/chat/completions",{method:"POST",headers,body:"x".repeat(129*1024)})).status,413);
    let response=await fetch(base+"/api/v1/chat/completions",{method:"POST",headers,body});
    assert.equal(response.status,200);
    assert.match(await response.text(),/\[DONE\]/);
    mode="redirect";
    assert.equal((await fetch(base+"/api/v1/chat/completions",{method:"POST",headers,body})).status,502);
    mode="tls";
    response=await fetch(base+"/api/v1/chat/completions",{method:"POST",headers,body});
    assert.equal(response.status,502);
    assert.match(await response.text(),/TLS verification failed/);
    assert.throws(()=>createRelay({FASTGPT_RELAY_TOKEN:"short"}),/32/);
    assert.throws(()=>createRelay({FASTGPT_RELAY_TOKEN:token,NODE_TLS_REJECT_UNAUTHORIZED:"0"}),/enabled/);
  } finally { await new Promise(resolve=>server.close(resolve)); }
});
