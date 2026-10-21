# 知识点分析与相似题练习

本次只需更新现有 lvheng-api Worker 的 worker.js；沿用 DB 绑定、登录账号和 DeepSeek 密钥，不需要数据库迁移。

发布后 /health 应包含 learningReport:1 和 similarPractice:1。

- GET /api/student/report 新增 diagnosis，依据当前登录学生的 feedback_json 和原题内容计算对错次数与考点。错误题得8分是原评分规则；知识点正确率使用实际正确次数，不以得分替代。
- 考点优先使用题目中的 knowledgePoint，否则根据题干和解析的明确关键词归类；未匹配时保留任务名与题干，不让模型推测学生能力。
- POST /api/student/similar-practice 接收 taskId、questionIndex。必须存在当前学生自己的提交记录，未完成任务及其他学生数据不能用于生成。只发送原题、考点与本题选择，不发送姓名、账号或班级名单。
- 生成3道独立单选题，校验数量、选项、答案范围与解析。自主练习在页面内反馈，不写入班级成绩，不生成已审核教师任务。

验证：学生完成任务后打开报告，展开错题依据；点“AI生成3道相似题”，作答并查看解析。没有历史逐题记录时不补造分析。

本地检查：
node tests/test-learning-report.mjs
node tests/test-learning-report-ui.cjs
