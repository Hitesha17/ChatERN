#!/bin/sh
set -eu

if [ -n "${BACKEND_URL:-}" ]; then
  UPSTREAM="${BACKEND_URL%/}"
  RESOLVERS=$(awk '/^nameserver[ \t]+[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+/ {print $2}' /etc/resolv.conf 2>/dev/null | tr '\n' ' ' | xargs || true)
  if [ -z "${RESOLVERS}" ]; then
    RESOLVERS="127.0.0.11"
  fi

  cat > /etc/nginx/conf.d/proxy.inc <<EOF
    resolver ${RESOLVERS} valid=10s ipv6=off;

    location /api/ {
        set \$backend_upstream "${UPSTREAM}";
        proxy_pass \$backend_upstream;
        proxy_http_version 1.1;
        proxy_ssl_server_name on;
        proxy_set_header Host \$http_host;
        proxy_set_header X-Forwarded-Host \$http_host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /socket.io/ {
        set \$backend_upstream "${UPSTREAM}";
        proxy_pass \$backend_upstream;
        proxy_http_version 1.1;
        proxy_ssl_server_name on;
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
