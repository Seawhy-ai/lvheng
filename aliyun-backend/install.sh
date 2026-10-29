#!/usr/bin/env bash
set -euo pipefail
[[ $(id -u) == 0 ]] || { echo 'Run as root'; exit 1; }
command -v node >/dev/null || { echo 'Install Node.js 24 first'; exit 1; }
node -e 'if(Number(process.versions.node.split(".")[0])<24)process.exit(1)'
[[ -x /usr/bin/node ]] || { echo '/usr/bin/node required'; exit 1; }
source_dir="$(cd "$(dirname "$0")/.." && pwd)"
[[ "$source_dir" == /opt/lvheng ]] || { echo 'Extract the release to /opt/lvheng first'; exit 1; }
id lvheng >/dev/null 2>&1 || useradd --system --home-dir /var/lib/lvheng --shell /usr/sbin/nologin lvheng
install -d -o lvheng -g lvheng -m 700 /var/lib/lvheng
install -d -o root -g lvheng -m 750 /etc/lvheng
if [[ ! -f /etc/lvheng/backend.env ]]; then
  install -o root -g lvheng -m 640 "$source_dir/aliyun-backend/backend.env.example" /etc/lvheng/backend.env
fi
install -m 644 "$source_dir/aliyun-backend/lvheng.service" /etc/systemd/system/lvheng.service
systemctl daemon-reload
echo 'Prepared only. Configure /etc/lvheng/backend.env, migrate data, then start manually.'
echo 'No existing database overwritten. No public ports opened. No service started.'
