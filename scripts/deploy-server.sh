#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# TeamUp VPS Deploy Script
# Целевой сервер: Ubuntu, запускать от root
# Использование:
#   curl -sL https://raw.githubusercontent.com/6apblra/team8/main/scripts/deploy-server.sh | bash
#   или скопировать на сервер и: bash deploy-server.sh
# ============================================================

APP_DIR="/opt/team8"
REPO_URL="https://github.com/6apblra/team8.git"
SERVER_IP="194.150.220.158"
DB_PORT="5433"

log() { echo -e "\n\033[1;32m>>> $1\033[0m"; }
err() { echo -e "\n\033[1;31m!!! $1\033[0m" >&2; exit 1; }

# --- Проверки ---
[[ $EUID -ne 0 ]] && err "Запускайте от root: sudo bash deploy-server.sh"

log "Обновление системы"
apt-get update -y
apt-get upgrade -y

# --- Node.js 20 (NodeSource) ---
log "Установка Node.js 20"
if ! command -v node &>/dev/null || [[ "$(node -v)" != v20* ]]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
echo "Node.js $(node -v), npm $(npm -v)"

# --- Docker ---
log "Установка Docker"
if ! command -v docker &>/dev/null; then
  apt-get install -y ca-certificates curl gnupg
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
fi
systemctl enable --now docker
echo "Docker $(docker --version)"

# --- docker-compose (standalone, если нет plugin) ---
if ! docker compose version &>/dev/null; then
  log "Установка docker-compose standalone"
  COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep tag_name | cut -d '"' -f4)
  curl -fsSL "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" \
    -o /usr/local/bin/docker-compose
  chmod +x /usr/local/bin/docker-compose
fi

# --- Nginx ---
log "Установка Nginx"
apt-get install -y nginx
systemctl enable nginx

# --- PM2 ---
log "Установка PM2"
npm install -g pm2

# --- Клонирование репозитория ---
log "Клонирование репозитория в $APP_DIR"
if [[ -d "$APP_DIR" ]]; then
  cd "$APP_DIR"
  git fetch --all
  git reset --hard origin/main
else
  git clone "$REPO_URL" "$APP_DIR"
  cd "$APP_DIR"
fi

# --- PostgreSQL через Docker Compose ---
log "Запуск PostgreSQL"
docker compose up -d
echo "Ожидание готовности PostgreSQL..."
for i in $(seq 1 30); do
  if docker exec teamup_db pg_isready -U teamup -d teamup_db &>/dev/null; then
    echo "PostgreSQL готов."
    break
  fi
  [[ $i -eq 30 ]] && err "PostgreSQL не запустился за 30 секунд"
  sleep 1
done

# --- .env ---
log "Создание .env"
JWT_SECRET=$(openssl rand -hex 32)
SESSION_SECRET=$(openssl rand -hex 32)

cat > "$APP_DIR/.env" <<EOF
NODE_ENV=production
PORT=5001

DATABASE_URL=postgresql://teamup:teamup123@localhost:${DB_PORT}/teamup_db
EXPO_PUBLIC_API_URL=http://${SERVER_IP}

JWT_SECRET=${JWT_SECRET}
SESSION_SECRET=${SESSION_SECRET}
EOF

echo ".env создан"

# --- npm install ---
log "Установка npm-зависимостей"
npm install

# --- База данных ---
log "Миграция и сид базы данных"
npm run db:push
npm run db:seed || echo "Seed: возможно данные уже существуют, продолжаем"

# --- Сборка сервера ---
log "Сборка сервера"
npm run server:build

# --- PM2 ---
log "Настройка PM2"
pm2 delete team8 2>/dev/null || true
pm2 start npm --name team8 -- run server:prod
pm2 save
pm2 startup systemd -u root --hp /root | tail -1 | bash || true

# --- Nginx ---
log "Настройка Nginx"
cat > /etc/nginx/sites-available/team8 <<'NGINX'
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:5001;
        proxy_http_version 1.1;

        # WebSocket
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_read_timeout 86400;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/team8 /etc/nginx/sites-enabled/team8
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# --- UFW ---
log "Настройка файрвола"
if command -v ufw &>/dev/null; then
  ufw allow 22/tcp
  ufw allow 80/tcp
  ufw allow 443/tcp
  ufw --force enable
fi

# --- Готово ---
log "Деплой завершён!"
echo ""
echo "  Сервер: http://${SERVER_IP}"
echo "  Health: curl http://${SERVER_IP}/api/health"
echo ""
echo "  PM2 логи:    pm2 logs team8"
echo "  PM2 статус:  pm2 status"
echo "  Рестарт:     pm2 restart team8"
echo ""
