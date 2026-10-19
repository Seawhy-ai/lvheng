/* 律衡 FastGPT 安全代理（Cloudflare Worker）
 * FASTGPT_API_KEY 必须使用 Worker Secret 配置，严禁写入本文件。
 */
const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };

function cors(origin, env) {
  const allowed = (env.ALLOWED_ORIGINS || "https://seawhy-ai.github.io").split(",").map(x => x.trim());
  const value = allowed.includes(origin) ? origin : allowed[0];
  return {
    "access-control-allow-origin": value,
    "access-control-allow-methods": "POST,OPTIONS,GET",
    "access-control-allow-headers": "content-type",
    "vary": "Origin"
  };
}

function reply(data, status, origin, env) {
  return new Response(JSON.stringify(data), { status, headers: { ...JSON_HEADERS, ...cors(origin, env) } });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("origin") || "";
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(origin, env) });
    if (url.pathname === "/health") return reply({ ok: true, service: "lvheng-fastgpt-proxy", configured: !!env.FASTGPT_API_KEY }, 200, origin, env);
    if (url.pathname !== "/api/chat" || request.method !== "POST") return reply({ error: "Not found" }, 404, origin, env);
    if (!env.FASTGPT_API_KEY) return reply({ error: "FASTGPT_API_KEY is not configured" }, 503, origin, env);

    const length = Number(request.headers.get("content-length") || 0);
    if (length > 128 * 1024) return reply({ error: "Request too large" }, 413, origin, env);
    let input;
    try { input = await request.json(); } catch (_) { return reply({ error: "Body must be a JSON object" }, 400, origin, env); }
    if (!input || typeof input !== "object" || Array.isArray(input)) return reply({ error: "Body must be a JSON object" }, 400, origin, env);
    if (!Array.isArray(input.messages) || !input.messages.length) return reply({ error: "messages must be a non-empty array" }, 400, origin, env);

    const base = (env.FASTGPT_BASE_URL || "https://fastgpt.sangfor.com.cn:19443").replace(/\/$/, "");
    const payload = {
      appId: env.FASTGPT_APP_ID || "6a8260f5f70be1cf2fe82255",
      chatId: typeof input.chatId === "string" ? input.chatId.slice(0, 80) : crypto.randomUUID(),
      stream: input.stream !== false,
      detail: input.detail !== false,
      messages: input.messages.slice(-10).map(m => ({ role: m.role === "assistant" ? "assistant" : m.role === "system" ? "system" : "user", content: String(m.content || "").slice(0, 12000) }))
    };
    let upstream;
    try {
      upstream = await fetch(base + "/api/v1/chat/completions", {
        method: "POST",
        headers: { "content-type": "application/json", "authorization": "Bearer " + env.FASTGPT_API_KEY },
        body: JSON.stringify(payload)
      });
    } catch (_) {
      return reply({ error: "FastGPT is temporarily unreachable" }, 502, origin, env);
    }
    const headers = new Headers(upstream.headers);
    Object.entries(cors(origin, env)).forEach(([k, v]) => headers.set(k, v));
    headers.set("cache-control", "no-store");
    headers.delete("set-cookie");
    return new Response(upstream.body, { status: upstream.status, headers });
  }
};
