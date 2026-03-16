#!/bin/sh
set -eu

echo "[app] Esperando base de datos..."
until ./node_modules/.bin/prisma migrate deploy 2>&1; do
  sleep 3
done

echo "[app] Migraciones aplicadas"
exec node server.js
