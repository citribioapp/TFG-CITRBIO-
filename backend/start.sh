#!/usr/bin/env bash
set -e

echo "Installing dependencies..."
composer install --no-dev --optimize-autoloader

echo "Preparing JWT keys..."
mkdir -p config/jwt

if [ -n "$JWT_SECRET_KEY" ]; then
  printf '%s' "$JWT_SECRET_KEY" | base64 -d > config/jwt/private.pem
fi

if [ -n "$JWT_PUBLIC_KEY" ]; then
  printf '%s' "$JWT_PUBLIC_KEY" | base64 -d > config/jwt/public.pem
fi

chmod 600 config/jwt/private.pem || true
chmod 644 config/jwt/public.pem || true

echo "Checking JWT key files..."
ls -la config/jwt

php -r '
$private = file_exists("config/jwt/private.pem") ? file_get_contents("config/jwt/private.pem") : false;
$pass = getenv("JWT_PASSPHRASE");
$key = $private ? openssl_pkey_get_private($private, $pass) : false;
if (!$private) { echo "JWT private key file missing\n"; exit(1); }
if (!$pass) { echo "JWT_PASSPHRASE missing\n"; exit(1); }
if (!$key) { echo "JWT private key/passphrase check FAILED\n"; exit(1); }
echo "JWT private key/passphrase check OK\n";
'

echo "Preparing persistent product uploads..."
UPLOAD_DIR="${PRODUCT_UPLOAD_VOLUME_DIR:-/data/uploads/products}"

mkdir -p "$UPLOAD_DIR"
mkdir -p public/uploads

if [ -e public/uploads/products ] && [ ! -L public/uploads/products ]; then
  rm -rf public/uploads/products
fi

if [ ! -L public/uploads/products ]; then
  ln -s "$UPLOAD_DIR" public/uploads/products
fi

ls -la public/uploads

echo "Running database migrations..."
php bin/console doctrine:migrations:migrate --no-interaction --allow-no-migration

echo "Starting Symfony PHP server..."
php -S 0.0.0.0:${PORT:-8080} -t public