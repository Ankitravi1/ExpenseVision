#!/usr/bin/env bash
# Nightly PostgreSQL backup. Dumps the DB from the running postgres container to a
# timestamped, gzipped file and prunes old ones.
#
# Cron (daily 03:15, project root as workdir):
#   15 3 * * * cd /path/to/ExpenseVision && bash deploy/backup.sh >> /var/log/ev-backup.log 2>&1
#
# A backup you have never restored is a hope, not a backup — test a restore
# (roadmap 01 §3) with:
#   gunzip -c backups/<file>.sql.gz | docker compose -f docker-compose.prod.yml exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
set -euo pipefail

# Load root env (POSTGRES_USER / POSTGRES_DB)
[ -f .env ] && set -a && . ./.env && set +a

COMPOSE="docker compose -f docker-compose.prod.yml"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="${BACKUP_DIR}/expensevision-${STAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "==> Dumping database ${POSTGRES_DB} -> ${OUT}"
$COMPOSE exec -T postgres pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" | gzip > "$OUT"

echo "==> Pruning backups older than ${RETENTION_DAYS} days"
find "$BACKUP_DIR" -name 'expensevision-*.sql.gz' -mtime "+${RETENTION_DAYS}" -delete

# OFF-SITE COPY (recommended): a local dump dies with the disk. Uncomment and
# configure one (e.g. Oracle Object Storage via the OCI CLI, rclone, or aws s3):
#   rclone copy "$OUT" myremote:expensevision-backups/
#   oci os object put -bn expensevision-backups --file "$OUT" --name "$(basename "$OUT")"

echo "==> Done: ${OUT}"
