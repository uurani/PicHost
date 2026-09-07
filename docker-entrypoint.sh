#!/bin/sh
set -e

if [ "$1" = "reset-password" ]; then
  exec node /app/server/cli/reset-password.mjs "${@:2}"
fi

if [ "$1" = "slider" ]; then
  exec node /app/server/cli/slider.mjs "${@:2}"
fi

if [ "$1" = "clear-domains" ]; then
  exec node /app/server/cli/clear-domains.mjs "${@:2}"
fi

if [ "$1" = "backup-export" ]; then
  exec node /app/server/cli/backup-export.mjs "${@:2}"
fi

if [ "$1" = "backup-restore" ]; then
  exec node /app/server/cli/backup-restore.mjs "${@:2}"
fi

if [ "$1" = "storage-sync" ]; then
  exec node /app/server/cli/storage-sync.mjs "${@:2}"
fi

exec node /app/.output/server/index.mjs "$@"
