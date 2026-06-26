#!/bin/bash
# ============================================================================
# GWK V8 AIO — Daily Backup Script
# Run via cron: 0 3 * * * /path/to/GWK-V8-AIO/scripts/backup.sh
#
# Backs up:
#   1. PostgreSQL database (compressed custom format)
#   2. Uploads folder (product images, logos)
#
# Retention: 30 days local, then auto-deleted.
# Optional: uncomment the S3/rclone lines to push offsite.
# ============================================================================

set -euo pipefail

# ── Configuration ──────────────────────────────────────────────────────────────
DB_NAME="${POSTGRES_DB:-gwk_v8_aio}"
DB_USER="${POSTGRES_USER:-gwk_user}"
DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"
BACKUP_DIR="${BACKUP_DIR:-/backups/gwk}"
UPLOADS_DIR="${UPLOADS_DIR:-$(dirname "$0")/../backend/uploads}"
RETENTION_DAYS=30
DATE=$(date +%Y%m%d_%H%M%S)

# ── Create backup directory if needed ──────────────────────────────────────────
mkdir -p "$BACKUP_DIR"

# ── 1. Database backup (compressed) ───────────────────────────────────────────
DB_FILE="$BACKUP_DIR/gwk_db_${DATE}.dump"
echo "[$(date)] Starting database backup..."
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -Fc "$DB_NAME" > "$DB_FILE"
echo "[$(date)] Database backup: $DB_FILE ($(du -sh "$DB_FILE" | cut -f1))"

# ── 2. Uploads backup ─────────────────────────────────────────────────────────
if [ -d "$UPLOADS_DIR" ]; then
  UPLOADS_FILE="$BACKUP_DIR/gwk_uploads_${DATE}.tar.gz"
  echo "[$(date)] Backing up uploads..."
  tar -czf "$UPLOADS_FILE" -C "$(dirname "$UPLOADS_DIR")" "$(basename "$UPLOADS_DIR")"
  echo "[$(date)] Uploads backup: $UPLOADS_FILE ($(du -sh "$UPLOADS_FILE" | cut -f1))"
fi

# ── 3. Cleanup old backups ────────────────────────────────────────────────────
echo "[$(date)] Cleaning backups older than ${RETENTION_DAYS} days..."
find "$BACKUP_DIR" -name "gwk_db_*.dump" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "gwk_uploads_*.tar.gz" -mtime +$RETENTION_DAYS -delete

# ── 4. Optional: Push to cloud ────────────────────────────────────────────────
# Uncomment ONE of these blocks to enable offsite backup:

# AWS S3:
# aws s3 cp "$DB_FILE" "s3://your-bucket/gwk-backups/" --storage-class STANDARD_IA
# [ -f "$UPLOADS_FILE" ] && aws s3 cp "$UPLOADS_FILE" "s3://your-bucket/gwk-backups/"

# Rclone (any cloud: Google Drive, Backblaze B2, etc):
# rclone copy "$DB_FILE" remote:gwk-backups/
# [ -f "$UPLOADS_FILE" ] && rclone copy "$UPLOADS_FILE" remote:gwk-backups/

# Rsync to another server:
# rsync -avz "$DB_FILE" user@backup-server:/backups/gwk/
# [ -f "$UPLOADS_FILE" ] && rsync -avz "$UPLOADS_FILE" user@backup-server:/backups/gwk/

echo "[$(date)] ✅ Backup complete!"
echo "  Database: $DB_FILE"
[ -f "$UPLOADS_FILE" ] && echo "  Uploads: $UPLOADS_FILE"

# ── Restore instructions ──────────────────────────────────────────────────────
# To restore the database:
#   pg_restore -h localhost -U gwk_user -d gwk_v8_aio --clean /backups/gwk/gwk_db_XXXXXXXX.dump
#
# To restore uploads:
#   tar -xzf /backups/gwk/gwk_uploads_XXXXXXXX.tar.gz -C /path/to/backend/
