#!/bin/sh
set -e

echo "Iniciando Citribio backend..."

mkdir -p config/jwt
mkdir -p var/cache var/log public/uploads/products

# Valores por defecto por si Railway no los inyecta
APP_ENV_VALUE="${APP_ENV:-prod}"
APP_DEBUG_VALUE="${APP_DEBUG:-0}"
APP_SECRET_VALUE="${APP_SECRET:-change_this_in_production}"
JWT_PASSPHRASE_VALUE="${JWT_PASSPHRASE:-}"
MAILER_DSN_VALUE="${MAILER_DSN:-null://null}"
MAILER_FROM_VALUE="${MAILER_FROM:-no-reply@example.com}"
BREVO_API_KEY_VALUE="${BREVO_API_KEY:-}"
BREVO_SENDER_EMAIL_VALUE="${BREVO_SENDER_EMAIL:-${MAILER_FROM_VALUE}}"
BREVO_SENDER_NAME_VALUE="${BREVO_SENDER_NAME:-Citribio}"
ORDER_NOTIFICATION_EMAIL_VALUE="${ORDER_NOTIFICATION_EMAIL:-change@me.com}"
CORS_ALLOW_ORIGINS_VALUE="${CORS_ALLOW_ORIGINS:-https://citribio-frontend.vercel.app,http://localhost:4200,http://127.0.0.1:4200}"
CORS_ALLOW_METHODS_VALUE="${CORS_ALLOW_METHODS:-GET,POST,PUT,PATCH,DELETE,OPTIONS}"
CORS_ALLOW_HEADERS_VALUE="${CORS_ALLOW_HEADERS:-Content-Type,Authorization,X-Requested-With,Accept,Origin}"
JWT_PRIVATE_KEY_BASE64_VALUE="${JWT_PRIVATE_KEY_BASE64:-}"
JWT_PUBLIC_KEY_BASE64_VALUE="${JWT_PUBLIC_KEY_BASE64:-}"
RESEND_API_KEY_VALUE="${RESEND_API_KEY:-}"
CONTACT_TO_EMAIL_VALUE="${CONTACT_TO_EMAIL:-administracion@citribio.com}"
CONTACT_FROM_EMAIL_VALUE="${CONTACT_FROM_EMAIL:-Citribio <onboarding@resend.dev>}"

# ─── DATABASE_URL ─────────────────────────────────────────────────────────────
# IMPORTANT: The .env file committed to the repo contains a local DATABASE_URL.
# Symfony loads .env files before this script runs, which means DATABASE_URL may
# already be set from the .env file. We must NOT use that value in production.
#
# Strategy:
#   1. If MYSQLHOST is set (Railway MySQL plugin), build the URL from individual vars.
#      This takes highest priority — Railway plugin vars are always correct.
#   2. Else if DATABASE_URL is set AND does not contain "127.0.0.1" or "localhost",
#      use it as-is (manually set Railway variable).
#   3. Otherwise, fall back to empty and warn.
#
# The serverVersion MUST match the actual Railway MariaDB version.
# Railway MySQL plugin runs MariaDB 10.6 — use "mariadb-10.6.0" format.

if [ -n "${MYSQLHOST:-}" ]; then
  # Build from Railway MySQL plugin individual variables (highest priority)
  MYSQL_USER="${MYSQLUSER:-root}"
  MYSQL_PASS="${MYSQLPASSWORD:-}"
  MYSQL_HOST="${MYSQLHOST}"
  MYSQL_PORT="${MYSQLPORT:-3306}"
  MYSQL_DB="${MYSQLDATABASE:-railway}"

  # URL-encode the password to handle special characters (@, :, /, #, etc.)
  MYSQL_PASS_ENCODED=$(printf '%s' "${MYSQL_PASS}" | python3 -c "import sys, urllib.parse; print(urllib.parse.quote(sys.stdin.read(), safe=''))" 2>/dev/null || printf '%s' "${MYSQL_PASS}")

  DATABASE_URL_VALUE="mysql://${MYSQL_USER}:${MYSQL_PASS_ENCODED}@${MYSQL_HOST}:${MYSQL_PORT}/${MYSQL_DB}?serverVersion=mariadb-10.6.0&charset=utf8mb4"
  echo "Built DATABASE_URL from Railway MySQL plugin vars (host: ${MYSQL_HOST}:${MYSQL_PORT}, db: ${MYSQL_DB})."

elif [ -n "${DATABASE_URL:-}" ]; then
  # Check if it looks like a local/socket URL — reject those in production
  case "${DATABASE_URL}" in
    *127.0.0.1*|*localhost*)
      echo "WARNING: DATABASE_URL points to localhost — ignoring in production. Set MYSQLHOST or a proper DATABASE_URL in Railway."
      DATABASE_URL_VALUE=""
      ;;
    *)
      DATABASE_URL_VALUE="${DATABASE_URL}"
      echo "Using provided DATABASE_URL."
      ;;
  esac

else
  DATABASE_URL_VALUE=""
  echo "WARNING: No DATABASE_URL or MYSQLHOST found. Database connection will fail."
fi
# ──────────────────────────────────────────────────────────────────────────────

# Crear archivo .env mínimo para Symfony
cat > /var/www/.env <<EOF
APP_ENV=${APP_ENV_VALUE}
APP_DEBUG=${APP_DEBUG_VALUE}
APP_SECRET=${APP_SECRET_VALUE}
DATABASE_URL=${DATABASE_URL_VALUE}
JWT_SECRET_KEY=%kernel.project_dir%/config/jwt/private.pem
JWT_PUBLIC_KEY=%kernel.project_dir%/config/jwt/public.pem
JWT_PASSPHRASE=${JWT_PASSPHRASE_VALUE}
MAILER_DSN=${MAILER_DSN_VALUE}
MAILER_FROM=${MAILER_FROM_VALUE}
BREVO_API_KEY=${BREVO_API_KEY_VALUE}
BREVO_SENDER_EMAIL=${BREVO_SENDER_EMAIL_VALUE}
BREVO_SENDER_NAME=${BREVO_SENDER_NAME_VALUE}
ORDER_NOTIFICATION_EMAIL=${ORDER_NOTIFICATION_EMAIL_VALUE}
CORS_ALLOW_ORIGINS=${CORS_ALLOW_ORIGINS_VALUE}
CORS_ALLOW_METHODS=${CORS_ALLOW_METHODS_VALUE}
CORS_ALLOW_HEADERS=${CORS_ALLOW_HEADERS_VALUE}
RESEND_API_KEY=${RESEND_API_KEY_VALUE}
CONTACT_TO_EMAIL=${CONTACT_TO_EMAIL_VALUE}
CONTACT_FROM_EMAIL=${CONTACT_FROM_EMAIL_VALUE}
EOF

# Crear claves JWT si vienen desde Railway.
# Preferimos base64 para evitar problemas de formato al pegar PEMs multilínea.
if [ -n "$JWT_PRIVATE_KEY_BASE64_VALUE" ]; then
  printf '%s' "$JWT_PRIVATE_KEY_BASE64_VALUE" | base64 -d | sed 's/\r$//' > config/jwt/private.pem
elif [ -n "$JWT_PRIVATE_KEY" ]; then
  printf '%b' "$JWT_PRIVATE_KEY" | sed 's/\r$//' > config/jwt/private.pem
fi

if [ -n "$JWT_PUBLIC_KEY_BASE64_VALUE" ]; then
  printf '%s' "$JWT_PUBLIC_KEY_BASE64_VALUE" | base64 -d | sed 's/\r$//' > config/jwt/public.pem
elif [ -n "$JWT_PUBLIC_KEY" ]; then
  printf '%b' "$JWT_PUBLIC_KEY" | sed 's/\r$//' > config/jwt/public.pem
fi

chmod 600 config/jwt/private.pem || true
chmod 644 config/jwt/public.pem || true

# Limpiar caché — debe ejecutarse DESPUÉS de escribir el .env para que
# el contenedor de servicios se recompile con los valores correctos de CORS y DB.
echo "Limpiando caché de Symfony..."
php bin/console cache:clear --env=prod --no-warmup 2>&1 || true
php bin/console cache:warmup --env=prod 2>&1 || true
echo "Caché lista."

# Esperar a que la base de datos esté accesible para no arrancar con el esquema a medias.
DB_READY=0
DB_ATTEMPTS=0

echo "Esperando conexión a la base de datos..."
echo "DATABASE_URL configurada: $(echo "${DATABASE_URL_VALUE}" | sed 's/:\/\/[^:]*:[^@]*@/:\\/\\/*****@/')"

while [ "$DB_ATTEMPTS" -lt 20 ]; do
  if php bin/console doctrine:query:sql "SELECT 1" --env=prod 2>&1; then
    DB_READY=1
    echo "Conexión a la base de datos establecida."
    break
  fi

  DB_ATTEMPTS=$((DB_ATTEMPTS + 1))
  echo "Base de datos no disponible todavía. Reintento ${DB_ATTEMPTS}/20..."
  sleep 3
done

if [ "$DB_READY" -eq 1 ]; then
  echo "Ejecutando migraciones Doctrine..."
  php bin/console doctrine:migrations:migrate --no-interaction --env=prod 2>&1 || {
    echo "Aviso: doctrine:migrations:migrate falló. Intentando doctrine:schema:update..."
    php bin/console doctrine:schema:update --force --env=prod 2>&1 || true
  }
  echo "Esquema de base de datos actualizado."
else
  echo "ERROR CRÍTICO: la base de datos no estuvo disponible tras 20 intentos (60s). Arrancando sin sincronización."
fi

# Arrancar servidor
php -S 0.0.0.0:${PORT:-8080} -t public
