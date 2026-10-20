# FastGPT 服务端中转

请求路径：浏览器 → 现有 Cloudflare Worker（班级、权限、D1）→ Node 中转 → 组委会 FastGPT。

代码已准备不代表已部署或已解决525。必须在部署服务器上实测。

## 创建服务

仓库根目录的 `render.yaml` 可用 Render Blueprint 创建 Node Web Service：

https://dashboard.render.com/select-repo?type=blueprint

选择 `Seawhy-ai/lvheng`，分支 `main`，Blueprint 文件 `render.yaml`。
检查套餐和费用再创建；模板指定 free，实际可用性以账户为准。
服务自动生成 `FASTGPT_RELAY_TOKEN`。不要把令牌发到聊天或提交仓库。

也可在已有 Node 22+ 服务器上执行 `node fastgpt-relay/server.mjs`，
设置 `FASTGPT_RELAY_TOKEN` 为至少32字符的随机密钥，并配置公网HTTPS反向代理。

## 连接 Cloudflare

1. 更新现有 Worker 的代码为仓库 `fastgpt-worker/worker.js`，部署。
   更新代码时保留原来的 DB 绑定和所有 Secrets。
2. 添加普通变量 `FASTGPT_RELAY_URL`，值为中转服务的 HTTPS 根地址。
3. 添加 Secret `FASTGPT_RELAY_TOKEN`，值与中转服务的自动生成令牌一致。
4. 保留现有 `FASTGPT_API_KEY`、`FASTGPT_APP_ID` 和 D1 配置。
5. 保存并部署，再通过 Worker 发起真实模型测试。

FastGPT 密钥由 Worker 通过 HTTPS 传给中转，仅在内存中用于该次请求。
中转不保存、打印密钥或对话。中转令牌不会发送到 FastGPT。

## 证书问题

默认严格检查证书和主机名，不实现 `curl -k` 或 `rejectUnauthorized:false`。
若仍报证书错误，请向组委会获取并核验 CA 证书，
将 PEM 内容设置到中转服务的 `FASTGPT_CA_PEM`（不是 API Key）。
也可由部署平台挂载证书文件并设置 Node 的 `NODE_EXTRA_CA_CERTS`。
不要自行信任从错误连接中取得的未知证书。
过期证书、主机名不匹配或TLS协商故障仍可能需要组委会修复。

## 验证与回退

`GET /health` 只证明中转进程正常，不代表FastGPT连通。
真实链路需要成功调用 Worker 的智能体接口。
删除 Worker 的 `FASTGPT_RELAY_URL` 可回退原来的直连路径；不动D1数据。

边界：固定上游地址、不跟随重定向、双重凭据、128KiB请求限制、
最多8个并发、90秒总超时，支持流式响应。
公开访问的 Worker `/api/chat` 为已有兼容接口，上线前需结合使用规模限制调用，
中转令牌只限制直接访问中转，不能代替 Worker 用户鉴权或配额。

运行测试：

```sh
node --test tests/test-fastgpt-relay.mjs tests/test-fastgpt-worker.mjs tests/test-classroom-worker.mjs
```
