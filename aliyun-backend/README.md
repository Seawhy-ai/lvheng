# 律衡 ECS 部署准备版

Node.js 24，使用内置 node:sqlite（当前仍可能显示实验性 API 警告），无 npm 外部依赖。
复用 fastgpt-worker/worker.js；不改 Cloudflare 配置和前端 API 地址。
新增服务器默认只监听 127.0.0.1:3000，必须经 HTTPS 反向代理后才能正式切换。
旧的匿名 /api/chat 在本部署入口禁用，登录后的 /api/agent/coach 保留。

## 安装（尚未替用户在服务器执行）

1. 安装 Node.js 24。把发行包解压到 /opt/lvheng，保留 aliyun-backend 和 fastgpt-worker 的相对目录。
2. 执行 bash /opt/lvheng/aliyun-backend/install.sh。脚本只准备用户、目录和服务文件，不启动服务，不覆盖已有配置。
3. 在服务器本地编辑 /etc/lvheng/backend.env，填写 DeepSeek 密钥和教师注册码。不要上传 GitHub 或发送到聊天。
4. 先迁移数据，再执行 systemctl enable --now lvheng。
5. 本机检查 curl http://127.0.0.1:3000/healthz；诊断用 journalctl -u lvheng，勿公开包含敏感信息的日志。

## D1 数据迁移：必须单独确认后执行

- 最终切换前暂停旧端写入，否则导出后的新增数据不会自动同步。
- 使用 Cloudflare D1 官方导出功能获取完整 SQL，在安全位置留存原始备份。
- 不对现有数据库直接导入：先导入一个新的候选 SQLite 文件，检查导出语法兼容性、foreign_key_check、integrity_check 及六张业务表记录数。
- 账号的 password_hash/password_salt、班级邀请码和业务主键必须完整保留。适配层仍使用原 PBKDF2 参数，无需重设用户密码。
- 验证候选库中的旧账号登录、班级、任务、报告后，再在停服状态指定 DB_PATH。不得覆盖唯一备份。
- 正式启用后安排 SQLite 在线备份（sqlite3 .backup），不要仅复制正在使用的主数据库文件而忽略 WAL。

## 公开访问前的门槛

域名及内地服务备案安排、TLS证书、Nginx仅代理 /api/、请求体上限128KB、合理超时；登录/注册及模型接口限速；安全组仅开放必要端口，不公开3000和数据库。生产环境还需并发与真实模型测试。
不将“安装完成”称作“迁移完成”。确认这些条件后，另行配置 Nginx 和前端地址；保留旧端回滚方案，注意切换后的新写入不能靠简单切回旧库恢复。

## 本地验证

node --test aliyun-backend/test.mjs

测试使用临时的真实 SQLite 和本地 HTTP，不连接真实 DeepSeek、不访问生产数据。
