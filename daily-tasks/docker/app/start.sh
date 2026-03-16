#!/bin/sh
set -eu

PRISMA="./node_modules/.bin/prisma"

echo "[app] Esperando base de datos..."
until $PRISMA migrate deploy 2>&1; do
  # If DB has existing tables but no migration history, baseline all current migrations
  if $PRISMA migrate deploy 2>&1 | grep -q "P3005"; then
    echo "[app] Base de datos existente detectada, aplicando baseline..."
    $PRISMA migrate resolve --applied 20260316_work_item_types 2>&1
    $PRISMA migrate resolve --applied 20260316_work_item_type_colors 2>&1
    echo "[app] Baseline completado, reintentando migrate deploy..."
  else
    sleep 3
  fi
done

echo "[app] Migraciones aplicadas"
exec node server.js
