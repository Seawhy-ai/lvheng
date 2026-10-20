# DeepSeek 直连接入

现有 Worker、D1 和 API 路径不变，不需要 Render 中转。

1. Cloudflare 的 `lvheng-api` 添加 **Secret** `DEEPSEEK_API_KEY`。
2. 将本目录 `worker.js` 完整替换到 Worker 编辑器，部署。
3. 有 DeepSeek 密钥时优先选择 DeepSeek，即使旧 FastGPT 配置仍存在。
   可选普通变量 `AI_PROVIDER=deepseek` 可强制选择；删除 DeepSeek 密钥也不会回退。
4. 可选 `DEEPSEEK_MODEL`，默认 `deepseek-flash`。地址固定为官方
   `https://api.deepseek.com/chat/completions`，禁用重定向。
5. `/health` 中 `provider=deepseek` 和 `configured=true` 仅表示配置存在；
   必须实际调用 `/api/chat` 或已登录的教学智能体才能确认模型连通。

普通对话支持 SSE，教学任务/陪练/学情接口使用 JSON 输出并继续校验。
DeepSeek 失败不会自动尝试 FastGPT。余额不足、鉴权失败和限流分别返回
安全的错误编号，不回显上游原始错误、密钥或请求正文。

官方文档（2026-10-20 核验）：
- https://api-docs.deepseek.com/api/create-chat-completion
- https://api-docs.deepseek.com/quick_start/pricing

注意：旧 `/api/chat` 是未登录兼容接口，上线面向公众前仍应增加访问控制、
限流及使用额度。不要把 API Key 放在前端或提交到 Git。
组委会平台要求是否允许替换供应商，需要单独确认。
