# 任务设计工作台部署与验收

## 部署

前端：GitHub Pages 部署仓库最新提交。

后端：将 `fastgpt-worker/worker.js` 完整替换到现有 `lvheng-api` Worker 并部署。
保留 `DB`、`DEEPSEEK_API_KEY` 和 `TEACHER_SETUP_CODE`，不新增表、不删除数据。
`/health` 返回 `taskStudio: 1` 表示新接口已部署。新版前端在旧后端上会禁止
保存/发布，提示更新，避免截止规则未生效。

截止时间和教学设置存储在既有 `tasks.content_json.settings` 中：
`goal`、`audience`、`difficulty`、`duration`、`dueAt`（UTC ISO 字符串）、`teacherNote`。
旧任务没有这些字段时视为不限截止时间。客户端输入/显示使用设备本地时区。

## 功能与边界

- 模板、自主编写、AI目标生成；逐题编辑、单题重新生成（教师权限）。
- 学生预览不显示正确答案和解析；真实学生读取接口也移除这些字段。
- 保存草稿、重新编辑；勾选审核后保存并发布。
- 已发布题目不可修改。补充练习需要新建任务。
- 后端拦截已过期任务的发布和提交；手动结束将状态设为既有 `closed`。
- 任务管理展示本班学生提交状态、成绩及各题正确率，所有操作检查班级归属。
- 截止后的任务在教师端标记“已截止”，不依赖定时任务修改数据库。
- 本轮不实现开放题、AI主观评分、自动归档、定时发布、催交通知。
- 单机模式可测试基本流程，但不会伪造“单题AI重写”结果；需真实后端。

## 测试

```sh
node --test tests/test-task-studio.mjs tests/test-classroom-worker.mjs tests/test-deepseek-worker.mjs
python -m http.server 8765 --bind 127.0.0.1
# 另开终端；需要 Playwright 和浏览器：
CHROMIUM_PATH=/usr/bin/chromium node tests/test-task-studio-ui.cjs
```

浏览器测试使用本地单机数据，不会写入生产班级。线上最终验收需教师登录，
创建测试草稿、审核发布、用测试学生提交，然后检查任务概览并结束任务。
