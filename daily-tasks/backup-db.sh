#!/bin/sh
set -eu

PROJECT_NAME="dailyTasks"
BACKUP_DIR="./backups"
DATE_STAMP="$(date -u +%Y_%m_%d)"
BACKUP_FILE="${BACKUP_DIR}/${PROJECT_NAME}_${DATE_STAMP}.bak"

mkdir -p "${BACKUP_DIR}"

docker compose exec -T db sh -lc '
  export PGPASSWORD="$POSTGRES_PASSWORD"
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc
' > "${BACKUP_FILE}"

echo "Backup generado: ${BACKUP_FILE}"
