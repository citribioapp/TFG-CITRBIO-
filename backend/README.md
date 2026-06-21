# Citribio Backend

Backend de Citribio desarrollado con Symfony. Expone una API REST para autenticacion, catalogo de productos citricos, carrito, pedidos, panel de administracion, contacto, recuperacion de contrasena, subida de imagenes y justificantes de pago.

## Indice

- [Stack tecnologico](#stack-tecnologico)
- [Arquitectura del proyecto](#arquitectura-del-proyecto)
- [Requisitos](#requisitos)
- [Instalacion local](#instalacion-local)
- [Variables de entorno](#variables-de-entorno)
- [Base de datos](#base-de-datos)
- [Ejecucion local](#ejecucion-local)
- [Documentacion Swagger](#documentacion-swagger)
- [Seguridad y roles](#seguridad-y-roles)
- [Endpoints principales](#endpoints-principales)
- [Email transaccional](#email-transaccional)
- [Subida de archivos](#subida-de-archivos)
- [Rate limit](#rate-limit)
- [Despliegue en Railway](#despliegue-en-railway)
- [Comandos utiles](#comandos-utiles)

## Stack tecnologico

- **PHP**: version minima `8.1`.
- **Symfony**: `6.4 LTS`.
- **Doctrine ORM**: mapeo de entidades y acceso a base de datos.
- **Doctrine Migrations**: control de cambios de esquema de base de datos.
- **MySQL/MariaDB**: base de datos relacional.
- **LexikJWTAuthenticationBundle**: autenticacion mediante JWT.
- **NelmioApiDocBundle**: documentacion Swagger/OpenAPI.
- **Symfony Security**: firewalls, acceso por roles y proteccion de endpoints.
- **Symfony Validator**: validacion de DTOs y datos de entrada.
- **Symfony RateLimiter**: limitacion de intentos en login y recuperacion de contrasena.
- **Symfony Mailer / Resend**: infraestructura de correo transaccional. En la version actual del repositorio, el servicio usado por el codigo es `ResendMailer`.
- **Twig**: plantillas de email.
- **Docker/Railway**: despliegue en produccion.

## Arquitectura del proyecto

La estructura principal del backend es:

```text
src/
  Command/              Comandos de consola propios
  Controller/           Controladores de la API REST
  DTO/                  Objetos de transferencia para validar peticiones
  Entity/               Entidades Doctrine que representan tablas
  EventSubscriber/      Suscriptores de eventos, CORS y admin inicial
  OpenApi/              Configuracion general de OpenAPI
  Repository/           Repositorios Doctrine
  Service/              Servicios de aplicacion, como email

config/
  packages/             Configuracion de Symfony, Doctrine, seguridad, mailer, etc.
  routes/               Rutas externas como Swagger

migrations/             Migraciones de base de datos
templates/              Plantillas Twig, principalmente emails
public/                 Punto de entrada publico y archivos servidos
tests/                  Tests del backend
```

Organizacion por capas:

- **Controller**: recibe la peticion HTTP, valida permisos y coordina la respuesta.
- **DTO**: define la forma esperada de algunas peticiones, por ejemplo registro, recuperacion y cambio de contrasena.
- **Entity**: representa el modelo de datos persistido en la base de datos.
- **Repository**: encapsula consultas sobre entidades.
- **Service**: contiene logica reutilizable, como el envio de emails.
- **config**: define seguridad, CORS, Doctrine, JWT, Swagger y servicios.

## Requisitos

Para ejecutar el backend en local se necesita:

- PHP `8.1` o superior.
- Composer.
- MySQL o MariaDB.
- Extension PHP PDO MySQL.
- OpenSSL para JWT.
- Claves JWT en `config/jwt/private.pem` y `config/jwt/public.pem`.

## Instalacion local

1. Instalar dependencias:

```bash
composer install
```

2. Crear el archivo de entorno local:

```bash
cp .env .env.local
```

3. Configurar la base de datos en `.env.local`:

```env
DATABASE_URL="mysql://root:root@127.0.0.1:3306/api_citribio?serverVersion=8.0&charset=utf8mb4"
```

4. Crear la base de datos:

```bash
php bin/console doctrine:database:create --if-not-exists
```

5. Ejecutar migraciones:

```bash
php bin/console doctrine:migrations:migrate
```

6. Arrancar el servidor:

```bash
php -S 127.0.0.1:8080 -t public
```

La API queda disponible en:

```text
http://127.0.0.1:8080/api
```

## Variables de entorno

Variables principales:

```env
APP_ENV=dev
APP_SECRET=change_this_secret

DATABASE_URL="mysql://usuario:password@127.0.0.1:3306/api_citribio?serverVersion=8.0&charset=utf8mb4"

JWT_SECRET_KEY=%kernel.project_dir%/config/jwt/private.pem
JWT_PUBLIC_KEY=%kernel.project_dir%/config/jwt/public.pem
JWT_PASSPHRASE=change_this_passphrase

CORS_ALLOW_ORIGINS=http://localhost:4200,http://127.0.0.1:4200
CORS_ALLOW_METHODS=GET,POST,PUT,PATCH,DELETE,OPTIONS
CORS_ALLOW_HEADERS=Content-Type,Authorization,X-Requested-With,Accept,Origin

RESEND_API_KEY=your_resend_api_key
MAILER_FROM="Citribio <onboarding@resend.dev>"
CONTACT_TO_EMAIL=citribioapp@gmail.com
CONTACT_FROM_EMAIL="Citribio Contact <onboarding@resend.dev>"
ORDER_NOTIFICATION_EMAIL=citribioapp@gmail.com

FRONTEND_URL=http://localhost:4200
CITRIBIO_BANK_IBAN="ES00 0000 0000 0000 0000 0000"
LOGO_GRANDE_URL=https://citribio-frontend.vercel.app/Citribio_blanco.png
LOGO_PEQUENO_URL=https://citribio-frontend.vercel.app/Citribio.png
```

No se deben subir claves reales, contrasenas ni API keys al repositorio.

## Base de datos

La base de datos es **relacional**, usando **MySQL/MariaDB**.

Entidades principales:

- `User`: usuarios, roles, credenciales y datos personales.
- `Category`: categorias de productos.
- `Product`: productos citricos.
- `ProductImage`: imagenes asociadas a productos.
- `Caliber`: calibres disponibles.
- `Quality`: calidades disponibles.
- `Format`: formatos o presentaciones de venta.
- `Cart`: cesta activa del usuario.
- `CartItem`: lineas del carrito.
- `CustomerOrder`: pedidos de cliente.
- `OrderItem`: lineas de pedido.

Las migraciones estan en:

```text
migrations/
```

## Ejecucion local

Servidor local recomendado:

```bash
php -S 127.0.0.1:8080 -t public
```

Si el frontend se ejecuta en Angular en local, normalmente estara en:

```text
http://localhost:4200
```

Por eso `CORS_ALLOW_ORIGINS` debe incluir:

```text
http://localhost:4200,http://127.0.0.1:4200
```

## Documentacion Swagger

El backend tiene documentacion automatica con **Swagger/OpenAPI** mediante `NelmioApiDocBundle`.

Ruta local:

```text
http://127.0.0.1:8080/api/doc
```

Ruta en Railway:

```text
https://citribio-backend-production-3153.up.railway.app/api/doc
```

Archivos relacionados:

```text
config/routes/nelmio_api_doc.yaml
config/packages/nelmio_api_doc.yaml
src/OpenApi/OpenApi.php
```

Los endpoints se documentan en los controladores mediante atributos `OpenApi\Attributes`.

## Seguridad y roles

La seguridad se configura en:

```text
config/packages/security.yaml
```

El backend usa:

- Login JSON en `/api/login`.
- JWT para proteger endpoints privados.
- Password hashing automatico para usuarios.
- Firewalls separados para login, endpoints publicos, CORS y API privada.
- `#[IsGranted(...)]` para restringir acciones concretas por rol.

Roles principales:

- `ROLE_USER`: cliente autenticado. Puede gestionar su perfil, carrito y pedidos.
- `ROLE_ADMIN`: administrador. Puede gestionar usuarios, productos, categorias, opciones, imagenes, pedidos y metricas.

Creacion del primer administrador:

- Si no hay usuarios registrados, el primer usuario creado recibe `ROLE_ADMIN`.
- Los siguientes usuarios reciben `ROLE_USER`.

## Endpoints principales

### Publicos

```text
GET    /api/doc
POST   /api/login
POST   /api/register
POST   /api/forgot-password
POST   /api/reset-password
POST   /api/contact
GET    /api/categories
GET    /api/categories/{id}/products
GET    /api/products
GET    /api/products/{id}
GET    /api/orders/{id}/payment-proof
POST   /api/orders/{id}/payment-proof
```

### Usuario autenticado

Requieren JWT:

```text
GET    /api/me
PATCH  /api/me
PATCH  /api/me/delivery-address
POST   /api/change-password
DELETE /api/delete-account

GET    /api/cart
POST   /api/cart/items
DELETE /api/cart/items/{id}

POST   /api/orders
GET    /api/orders
```

### Administrador

Requieren `ROLE_ADMIN`:

```text
GET    /api/admin/metrics

GET    /api/users
GET    /api/users/{id}
PATCH  /api/users/{id}/roles
DELETE /api/users/{id}

POST   /api/categories
PUT    /api/categories/{id}
DELETE /api/categories/{id}

POST   /api/products
PUT    /api/products/{id}
DELETE /api/products/{id}

POST   /api/products/{id}/images
DELETE /api/product-images/{id}

POST   /api/products/{id}/calibers
POST   /api/products/{id}/qualities
POST   /api/products/{id}/formats
GET    /api/products/{id}/options
PUT    /api/products/{productId}/calibers/{id}
PUT    /api/products/{productId}/qualities/{id}
PUT    /api/products/{productId}/formats/{id}
DELETE /api/products/{productId}/calibers/{id}
DELETE /api/products/{productId}/qualities/{id}
DELETE /api/products/{productId}/formats/{id}

GET    /api/orders/admin
GET    /api/orders/{id}/admin
PUT    /api/orders/{id}/quote
PATCH  /api/orders/{id}/status
```

## Email transaccional

El servicio de email actual esta en:

```text
src/Service/ResendMailer.php
```

Usa la API HTTP de Resend:

```text
https://api.resend.com/emails
```

Variables importantes:

```env
RESEND_API_KEY=
MAILER_FROM=
CONTACT_TO_EMAIL=
CONTACT_FROM_EMAIL=
ORDER_NOTIFICATION_EMAIL=
```

Flujos que usan email:

- Formulario de contacto.
- Recuperacion de contrasena.
- Notificaciones de pedidos.
- Envio de presupuesto al cliente.
- Notificacion de justificante de pago al administrador.

Importante: si `RESEND_API_KEY` esta vacia, el servicio registra un warning y no envia el correo.

## Subida de archivos

El backend gestiona:

- Imagenes de productos.
- Justificantes de pago de pedidos.

En Railway, `start.sh` prepara una carpeta persistente para imagenes de productos:

```bash
PRODUCT_UPLOAD_VOLUME_DIR=/data/uploads/products
```

El script crea un enlace simbolico hacia:

```text
public/uploads/products
```

## Rate limit

Configuracion:

```text
config/packages/rate_limiter.yaml
```

Limites actuales:

```text
login:            5 intentos por minuto
forgot_password:  3 intentos por minuto
reset_password:   5 intentos por minuto
```

## Despliegue en Railway

El despliegue esta preparado para Railway mediante:

```text
Dockerfile
start.sh
RAILWAY_ENV_VARS.md
```

Flujo general:

1. Subir el backend a GitHub.
2. Crear un proyecto en Railway.
3. Conectar Railway con el repositorio de GitHub.
4. Anadir una base de datos MySQL/MariaDB en Railway.
5. Configurar variables de entorno.
6. Railway construye la imagen con Docker.
7. `start.sh` instala dependencias, prepara JWT, prepara uploads, ejecuta migraciones y arranca el servidor.

Variables minimas en Railway:

```env
APP_ENV=prod
APP_SECRET=secure_random_secret
DATABASE_URL=mysql://USER:PASSWORD@HOST:PORT/DATABASE?serverVersion=mariadb-10.6.0&charset=utf8mb4
JWT_PASSPHRASE=secure_passphrase
JWT_SECRET_KEY=base64_private_key
JWT_PUBLIC_KEY=base64_public_key
CORS_ALLOW_ORIGINS=https://citribio-frontend.vercel.app
RESEND_API_KEY=your_resend_key
MAILER_FROM="Citribio <verified_sender@example.com>"
FRONTEND_URL=https://citribio-frontend.vercel.app
```

Mas detalle en:

```text
RAILWAY_ENV_VARS.md
```

## Comandos utiles

Instalar dependencias:

```bash
composer install
```

Crear base de datos:

```bash
php bin/console doctrine:database:create --if-not-exists
```

Ejecutar migraciones:

```bash
php bin/console doctrine:migrations:migrate
```

Ver rutas:

```bash
php bin/console debug:router
```

Validar contenedor:

```bash
php bin/console lint:container
```

Ejecutar tests:

```bash
php bin/phpunit
```

Arrancar local:

```bash
php -S 127.0.0.1:8080 -t public
```

## Notas para exposicion

Para explicar el backend en una presentacion:

- Es una API REST construida con Symfony.
- Usa arquitectura por capas: controladores, DTOs, entidades, repositorios y servicios.
- Doctrine ORM conecta las entidades PHP con una base de datos relacional MySQL/MariaDB.
- La seguridad se basa en JWT y roles (`ROLE_USER`, `ROLE_ADMIN`).
- Swagger documenta los endpoints y permite probar la API.
- Railway automatiza el despliegue desde GitHub.
- Las migraciones mantienen controlado el esquema de base de datos.
- Los correos transaccionales se gestionan desde backend para no exponer claves en el frontend.
