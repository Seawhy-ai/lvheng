# 律衡教学管理后端

一个 Cloudflare Worker 同时承担两类服务：

- D1 业务后端：教师、学生、班级、任务、提交、五维评价和学情统计。
- FastGPT 安全服务：密钥只保存在 Worker Secret 中，浏览器永远接触不到。

## 数据与权限

- 教师只能访问自己创建的班级、任务和学情。
- 学生凭 6 位班级码加入，只能看到所在班级已发布的任务。
- 一个学生对同一任务只能提交一次。
- 密码使用 PBKDF2-SHA256 加盐哈希；会话令牌在数据库中只保存 SHA-256 摘要。
- 班级统计只来自 D1 中的真实提交，不预置学生、成绩或完成率。

数据库迁移位于 `migrations/0001_classroom.sql`。

## Cloudflare 部署

```bash
npx wrangler d1 create lvheng-classroom
# 将返回的 database_id 填入 wrangler.toml，并取消 [[d1_databases]] 注释
npx wrangler d1 migrations apply lvheng-classroom --remote
npx wrangler secret put TEACHER_SETUP_CODE
npx wrangler secret put FASTGPT_API_KEY
npx wrangler deploy
```

普通变量已经写入 `wrangler.toml`：

- `FASTGPT_BASE_URL`
- `FASTGPT_APP_ID`
- `ALLOWED_ORIGINS`

部署后访问 `/health`，应看到：

```json
{"ok":true,"database":true,"fastgpt":true}
```

然后在教学管理首页右上角打开“服务配置”，填写 Worker 的 HTTPS 地址。

## 核心接口

- `POST /api/auth/teacher/register`
- `POST /api/auth/login`
- `POST /api/auth/student/join`
- `GET|POST /api/classes`
- `GET|POST /api/tasks`
- `PATCH /api/tasks/:id/publish`
- `POST /api/tasks/:id/submit`
- `GET /api/classes/:id/dashboard`
- `POST /api/ai/task-draft`
- `POST /api/chat`

决赛后即使 FastGPT Key 到期，账号、班级、任务、提交和规则评分仍能继续工作；受影响的只有 AI 生成与对话能力。
