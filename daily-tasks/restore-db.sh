#!/bin/sh
set -eu

if [ "${1:-}" = "" ]; then
  echo "Uso: ./restore-db.sh dailyTasks_YYYY_MM_DD.bak" >&2
  exit 1
fi

BACKUP_FILE="./backups/$1"

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "Archivo no encontrado: ${BACKUP_FILE}" >&2
  exit 1
fi

docker compose exec -T db sh -lc '
  export PGPASSWORD="$POSTGRES_PASSWORD"
  pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner --no-privileges
' < "${BACKUP_FILE}"

echo "Restore completado desde: ${BACKUP_FILE}"
