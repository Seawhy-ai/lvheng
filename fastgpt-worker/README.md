# 律衡 FastGPT 安全代理

该代理解决两个问题：不把组委会API密钥暴露给浏览器；统一校验FastGPT请求必须为JSON对象，避免“expected object, received string”。

## 手机端部署（无需安装软件）

1. 登录 Cloudflare Dashboard，进入 Workers & Pages。
2. 创建 Worker，名称使用 `lvheng-fastgpt-proxy`。
3. 将 `worker.js` 全文粘贴进在线编辑器并部署。
4. 打开 Worker 的 Settings → Variables and Secrets。
5. 添加加密变量 `FASTGPT_API_KEY`，值为组委会FastGPT临时密钥。
6. 添加普通变量：
   - `FASTGPT_BASE_URL=https://fastgpt.sangfor.com.cn:19443`
   - `FASTGPT_APP_ID=6a8260f5f70be1cf2fe82255`
   - `ALLOWED_ORIGINS=https://seawhy-ai.github.io`
7. 访问 `https://你的Worker域名/health`，应返回 `configured:true`。
8. 在律衡“关于我们 → API配置”选择FastGPT，填入Worker域名并保存。

## 安全要求

- 绝不把FastGPT Key写入 `worker.js`、`wrangler.toml` 或前端文件。
- 决赛结束后在FastGPT后台删除临时Key。
- 如果使用自定义域名，应同时更新 `ALLOWED_ORIGINS`。
- 代理只转发最近10条消息，单条内容上限12000字符，请求总体上限128KB。

## 待密钥就绪后的验证

```bash
curl https://你的Worker域名/health
curl -N https://你的Worker域名/api/chat \
  -H 'content-type: application/json' \
  --data '{"chatId":"test-001","stream":true,"messages":[{"role":"user","content":"公司拖欠工资怎么办？"}]}'
```

第二个请求必须直接发送JSON对象，不能把整个JSON再包成字符串。
