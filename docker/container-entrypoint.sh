#!/bin/sh
set -eu

if [ -z "${APP_KEY:-}" ] || [ -z "${DB_URL:-}" ]; then
    echo "APP_KEY and DB_URL must be configured before the TMIS container can start." >&2
    exit 1
fi

php artisan migrate --force
php artisan db:seed --class=Database\\Seeders\\CloudBootstrapAdministratorSeeder --force
unset TMIS_BOOTSTRAP_DATA_KEY
php artisan config:cache
php artisan view:cache

exec apache2-foreground
