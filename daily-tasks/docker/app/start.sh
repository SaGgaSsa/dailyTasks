#!/bin/sh
set -eu

echo "[app] Aplicando migraciones..."
./node_modules/.bin/prisma migrate deploy

echo "[app] Iniciando app..."
exec node server.js
