# 法律新闻更新

- GitHub Actions `Refresh legal news` 每小时第 17、47 分钟检查中新网最近 14 天的新闻列表，调度可能延迟。可在 Actions 手动 Run workflow。
- 按标题线索筛选法律争议，去重并保留最近 90 天最多 120 条。仅保存标题和原文链接；讨论问题是教学提示，不是报道摘要或司法结论。
- data/legal-news.json 保存实际检查时间。全部来源失败时任务失败并保留旧文件，部分失败在页面提示。页面超过两小时未检查显示延迟。
- 工作流提交快照并显式部署 Pages，因为 GITHUB_TOKEN 提交不会再次触发 Pages 构建。无需新增付费服务或 API 密钥。
- 页面“刷新新闻”重新获取已发布快照；不是触发源站抓取。打开的新闻页每 30 分钟重读快照。
- 在 Cloudflare 粘贴部署最新版 fastgpt-worker/worker.js 后，新新闻可以转发。后端仅按可信静态目录查找新闻，不接受客户端传入正文，分享时保存快照。旧分享不随目录删除。
- 公共仓库长期无活动时 GitHub 可能暂停定时工作流，需在 Actions 恢复。检查 Actions 失败记录可排查来源或部署故障。

本地检查：python3 scripts/sync_news.py；python3 tests/test-news-sync.py；node tests/test-news-worker.mjs；node tests/test-news-live.cjs（需要本地 8766 HTTP 服务及 Playwright）。
