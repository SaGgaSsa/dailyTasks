#!/bin/sh
set -eu

PRISMA="./node_modules/.bin/prisma"

echo "[app] Esperando base de datos..."
while true; do
  OUTPUT=$($PRISMA migrate deploy 2>&1) && break
  if echo "$OUTPUT" | grep -q "P3005"; then
    echo "[app] Base de datos existente detectada, aplicando baseline..."
    $PRISMA migrate resolve --applied 0_init 2>&1
    echo "[app] Baseline completado, reintentando..."
  else
    echo "$OUTPUT"
    sleep 3
  fi
done

echo "[app] Migraciones aplicadas"
exec node server.js
