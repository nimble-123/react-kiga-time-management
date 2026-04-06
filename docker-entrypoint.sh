#!/bin/sh
set -e

# Extract DB path from DATABASE_URL (strip "file:" prefix)
DB_FILE="${DATABASE_URL#file:}"

# Initialize database from template if it doesn't exist
if [ ! -f "$DB_FILE" ]; then
  echo "Initializing database at $DB_FILE ..."
  cp /app/prisma/template.db "$DB_FILE"
  echo "Database initialized."
else
  echo "Database found at $DB_FILE"
fi

exec node server.js
