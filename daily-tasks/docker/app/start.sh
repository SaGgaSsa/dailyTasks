#!/bin/sh
set -eu

echo "[app] Esperando base de datos..."
until ./node_modules/.bin/prisma db push >/tmp/prisma-start.log 2>&1; do
  cat /tmp/prisma-start.log
  sleep 3
done

echo "[app] Esquema sincronizado"
exec node server.js
