#!/bin/sh
set -eu

echo "[app] Sincronizando schema..."
./node_modules/.bin/prisma db push

echo "[app] Iniciando app..."
exec node server.js
