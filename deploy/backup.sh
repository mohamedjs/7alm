#!/bin/sh
# Nightly logical backup of the 7alm database, kept for 14 days.
# Runs inside the `backup` service of docker-compose.prod.yml.
# Restore: gunzip -c halm-YYYY-MM-DD-HHMM.sql.gz | docker compose exec -T postgres psql -U "$POSTGRES_USER" "$POSTGRES_DB"
set -eu
while true; do
  file="/backups/halm-$(date +%F-%H%M).sql.gz"
  if pg_dump -h postgres -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "$file"; then
    echo "backup written: $file"
  else
    echo "backup FAILED" >&2
  fi
  find /backups -name 'halm-*.sql.gz' -mtime +14 -exec rm -f {} \;
  sleep 86400
done
