#!/bin/sh
set -eu
umask 077
backup_dir="${1:-backups}"
mkdir -p "$backup_dir"
backup_file="$backup_dir/streamly-$(date -u +%Y%m%dT%H%M%SZ).sql.gz"
docker compose --env-file .env.production -f compose.production.yaml exec -T postgres pg_dump -U stream -d stream_platform > "$backup_file.sql.tmp"
gzip -c "$backup_file.sql.tmp" > "$backup_file.tmp"
gzip -t "$backup_file.tmp"
mv "$backup_file.tmp" "$backup_file"
rm "$backup_file.sql.tmp"
printf 'Backup created: %s\n' "$backup_file"
