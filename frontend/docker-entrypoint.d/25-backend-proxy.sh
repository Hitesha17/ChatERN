#!/bin/sh
set -eu

if [ -n "${BACKEND_URL:-}" ]; then
  UPSTREAM="${BACKEND_URL%/}"
  cat > /etc/nginx/conf.d/proxy.inc <<EOF
    location /api/ {
        proxy_pass ${UPSTREAM};
        proxy_http_version 1.1;
        proxy_set_header Host \$http_host;
        proxy_set_header X-Forwarded-Host \$http_host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /socket.io/ {
        proxy_pass ${UPSTREAM};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$http_host;
        proxy_set_header X-Forwarded-Host \$http_host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
EOF
else
  cat > /etc/nginx/conf.d/proxy.inc <<'EOF'
    location /api/ {
        default_type application/json;
        return 502 '{"message":"Backend service not configured"}';
    }
EOF
fi
