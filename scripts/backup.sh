#!/bin/bash
# Backup script for SQLite database
# Usage: ./scripts/backup.sh [backup-dir]

BACKUP_DIR="${1:-./backups}"
DB_PATH="./prisma/data/app.db"
TIMESTAMP=$(date +%Y-%m-%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/app-${TIMESTAMP}.db"

mkdir -p "$BACKUP_DIR"

if [ -f "$DB_PATH" ]; then
  cp "$DB_PATH" "$BACKUP_FILE"
  echo "Backup created: $BACKUP_FILE"

  # Keep only last 30 backups
  ls -t "${BACKUP_DIR}"/app-*.db 2>/dev/null | tail -n +31 | xargs -r rm
  echo "Old backups cleaned up (keeping last 30)"
else
  echo "Database not found at $DB_PATH"
  exit 1
fi
