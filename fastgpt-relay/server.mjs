import http from "node:http";
import https from "node:https";
import {timingSafeEqual} from "node:crypto";
import {rootCertificates} from "node:tls";
import {pathToFileURL} from "node:url";

const UPSTREAM = "https://fastgpt.sangfor.com.cn:19443/api/v1/chat/completions";
const MAX_BODY = 128 * 1024;
export function createRelay(env = process.env, send = https.request) {
  const token = env.FASTGPT_RELAY_TOKEN || "";
  if (token.length < 32) throw new Error("FASTGPT_RELAY_TOKEN must contain at least 32 characters");
  if (env.NODE_TLS_REJECT_UNAUTHORIZED === "0") throw new Error("TLS verification must remain enabled");
  const ca = env.FASTGPT_CA_PEM ? [...rootCertificates, env.FASTGPT_CA_PEM] : undefined;
  let active = 0;
  function json(res, status, value) {
    if (res.headersSent) { res.destroy(); return; }
    res.writeHead(status, {"content-type":"application/json", "cache-control":"no-store"});
    res.end(JSON.stringify(value));
  }
  const server = http.createServer(async (req, res) => {
    if (req.method === "GET" && req.url === "/health") {
      json(res, 200, {ok:true, service:"lvheng-fastgpt-relay", tlsVerification:true});
      return;
    }
    if (req.method !== "POST" || req.url !== "/api/v1/chat/completions") {
      json(res, 404, {error:"Not found"}); return;
    }
    const supplied = Buffer.from(String(req.headers["x-relay-token"] || ""));
    const expected = Buffer.from(token);
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
      json(res, 401, {error:"Relay authentication required"}); return;
    }
    const authorization = req.headers.authorization || "";
    if (!/^Bearer \S+$/.test(authorization)) {
      json(res, 400, {error:"Missing upstream credential"}); return;
    }
    if (active >= 8) {json(res, 429, {error:"Relay busy; retry later"});return;}
    active++;
    let upstream, timer;
    const done = () => { clearTimeout(timer); active--; upstream?.destroy(); };
    res.once("close", done);
    timer = setTimeout(() => json(res, 504, {error:"Relay request timed out"}), 90000);
    try {
      const chunks = []; let length = 0;
      for await (const chunk of req) {
        length += chunk.length;
        if (length > MAX_BODY) {json(res, 413, {error:"Request too large"});return;}
        chunks.push(chunk);
      }
      const body = Buffer.concat(chunks);
      let input;
      try { input = JSON.parse(body.toString("utf8")); }
      catch { json(res, 400, {error:"Invalid JSON"}); return; }
      if (!input || Array.isArray(input) || typeof input.appId !== "string" ||
          !Array.isArray(input.messages) || !input.messages.length) {
        json(res, 400, {error:"appId and messages are required"}); return;
      }
      upstream = send(UPSTREAM, {
        method:"POST", rejectUnauthorized:true, ca,
        headers:{"content-type":"application/json", authorization, "content-length":body.length}
      }, response => {
        // Never follow redirects or forward credentials to another host.
        if (response.statusCode >= 300 && response.statusCode < 400) {
          response.resume();json(res, 502, {error:"Upstream redirect refused"});return;
        }
        if (response.statusCode >= 400) {
          response.resume();
          json(res, response.statusCode, {error:"FastGPT rejected the request", upstreamStatus:response.statusCode});
          return;
        }
        res.writeHead(response.statusCode, {
          "content-type":response.headers["content-type"] || "application/json",
          "cache-control":"no-store", "x-accel-buffering":"no"
        });
        response.on("error", () => res.destroy());
        response.pipe(res);
      });
      upstream.on("error", err => {
        const tls = /CERT|SSL|TLS|SELF_SIGNED|VERIFY_LEAF/.test(err.code || "");
        json(res, 502, {error:tls ? "Upstream TLS verification failed; configure a verified CA certificate" : "Upstream connection failed"});
      });
      upstream.end(body);
    } catch { json(res, 400, {error:"Request interrupted"}); }
  });
  server.requestTimeout = 30000;
  server.headersTimeout = 15000;
  return server;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  createRelay().listen(Number(process.env.PORT || 3000), "0.0.0.0", () => {
    console.log("Lvheng relay listening; request bodies and credentials are not logged");
  });
}
