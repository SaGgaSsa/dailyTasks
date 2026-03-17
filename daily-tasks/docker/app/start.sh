#!/bin/sh
set -eu

echo "[app] Sincronizando schema..."
./node_modules/.bin/prisma db push

echo "[app] Ejecutando seed..."
./node_modules/.bin/prisma db seed

echo "[app] Iniciando app..."
exec node server.js
