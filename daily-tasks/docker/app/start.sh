#!/bin/sh
set -eu

echo "[app] Aplicando migraciones..."
./node_modules/.bin/prisma migrate deploy

echo "[app] Migraciones aplicadas"
exec node server.js
