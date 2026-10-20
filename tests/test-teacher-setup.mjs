import assert from "node:assert/strict";
import fs from "node:fs";
const source=fs.readFileSync(new URL("../fastgpt-worker/worker.js",import.meta.url),"utf8");
const worker=(await import("data:text/javascript;base64,"+Buffer.from(source).toString("base64"))).default;
const code="test-only-setup-code";
let calls=0;
const DB={prepare(){calls++;throw Error("No database writes expected")}};
for(const [configured,input,status,error] of [
  [undefined,code,503,"TEACHER_SETUP_MISSING"],
  ["",code,503,"TEACHER_SETUP_MISSING"],
  [code+" ",code,503,"TEACHER_SETUP_WHITESPACE"],
  [code,undefined,400,"TEACHER_SETUP_REQUIRED"],
  [code," "+code,400,"TEACHER_INPUT_WHITESPACE"],
  [code,"different-value",403,"TEACHER_SETUP_MISMATCH"],
  // Matching code reaches ordinary account validation (not database writes).
  [code,code,400,"账号长度"]
]){
  const res=await worker.fetch(new Request("https://worker.example/api/auth/teacher/register",{
    method:"POST",headers:{"content-type":"application/json"},
    body:JSON.stringify({setupCode:input})
  }),{DB,TEACHER_SETUP_CODE:configured});
  assert.equal(res.status,status);
  const body=await res.text();
  assert.ok(body.includes(error),body);
  assert.ok(!body.includes(code));
}
assert.equal(calls,0);
console.log("Teacher setup diagnostics preserve validation and never expose codes");
