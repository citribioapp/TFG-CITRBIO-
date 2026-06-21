# TFG Citribio

Monorepo del proyecto Citribio para el TFG. Reune dos aplicaciones:

- `backend/`: API REST desarrollada con Symfony.
- `frontend/`: aplicacion web desarrollada con Angular.

El proyecto cubre el flujo completo de una plataforma de citricos: catalogo publico, detalle de producto, carrito, autenticacion, area privada, panel de administracion, pedidos, contacto, recuperacion de contrasena, confirmacion de pago y gestion interna de productos.

## Indice

- [Vision general](#vision-general)
- [Estructura del monorepo](#estructura-del-monorepo)
- [Backend](#backend)
- [Frontend](#frontend)
- [Instalacion local](#instalacion-local)
- [URLs utiles](#urls-utiles)
- [Seguridad y roles](#seguridad-y-roles)
- [Datos y persistencia](#datos-y-persistencia)
- [Flujos funcionales](#flujos-funcionales)
- [Despliegue](#despliegue)
- [Documentacion tecnica](#documentacion-tecnica)
- [Comandos utiles](#comandos-utiles)

## Vision general

Citribio es una aplicacion web para la gestion de un negocio de citricos. La interfaz publica permite consultar productos, categorias y marcas. La parte privada permite iniciar sesion, comprar, gestionar pedidos y revisar informacion de cuenta. La parte administrativa permite controlar catalogo, opciones de producto, imagenes, usuarios, pedidos y metricas.

El sistema se divide en dos capas claramente separadas:

- Frontend Angular para la experiencia de usuario.
- Backend Symfony para autenticar, persistir datos, aplicar seguridad y exponer la API REST.

## Estructura del monorepo

```text
backend/    API REST con Symfony
frontend/   Aplicacion web con Angular
README.md   Portada tecnica del monorepo
```

Cada aplicacion mantiene su propio documento tecnico:

- [backend/README.md](./backend/README.md)
- [frontend/README.md](./frontend/README.md)

## Backend

Backend desarrollado con Symfony 6.4.

### Stack principal

- PHP 8.1+
- Symfony Framework
- Doctrine ORM
- Doctrine Migrations
- Lexik JWT Authentication Bundle
- Nelmio Api Doc Bundle
- Symfony Security
- Symfony Validator
- Symfony Rate Limiter
- Symfony Mailer y servicio de correo transaccional
- Twig
- MySQL o MariaDB

### Responsabilidades

- Registro de usuarios.
- Inicio de sesion con JWT.
- Recuperacion y cambio de contrasena.
- Gestion de perfil y direccion.
- Carrito y pedidos.
- Panel de administracion.
- Gestion de productos, categorias, calibres, calidades, formatos e imagenes.
- Envio de emails de contacto, presupuesto, pedido y justificante.
- Documentacion automatica con Swagger/OpenAPI.

### Estructura interna

```text
src/Controller/       Endpoints HTTP
src/DTO/              Datos de entrada validados
src/Entity/           Entidades Doctrine
src/Repository/       Consultas y acceso a datos
src/Service/          Logica de negocio reutilizable
src/EventSubscriber/  CORS y creacion inicial de admin
src/OpenApi/          Configuracion general de OpenAPI
config/               Seguridad, Doctrine, mailer, CORS, Swagger
migrations/           Migraciones de base de datos
templates/            Plantillas Twig de emails
public/               Punto de entrada publico
tests/                Tests de integracion y unidad
```

### Endpoints del backend

Publicos:

- `GET /api/doc`
- `POST /api/login`
- `POST /api/register`
- `POST /api/forgot-password`
- `POST /api/reset-password`
- `POST /api/contact`
- `GET /api/categories`
- `GET /api/categories/{id}/products`
- `GET /api/products`
- `GET /api/products/{id}`
- `GET /api/orders/{id}/payment-proof`
- `POST /api/orders/{id}/payment-proof`

Usuario autenticado:

- `GET /api/me`
- `PATCH /api/me`
- `PATCH /api/me/delivery-address`
- `POST /api/change-password`
- `DELETE /api/delete-account`
- `GET /api/cart`
- `POST /api/cart/items`
- `DELETE /api/cart/items/{id}`
- `POST /api/orders`
- `GET /api/orders`

Administrador:

- `GET /api/admin/metrics`
- `GET /api/users`
- `GET /api/users/{id}`
- `PATCH /api/users/{id}/roles`
- `DELETE /api/users/{id}`
- `POST /api/categories`
- `PUT /api/categories/{id}`
- `DELETE /api/categories/{id}`
- `POST /api/products`
- `PUT /api/products/{id}`
- `DELETE /api/products/{id}`
- `POST /api/products/{id}/images`
- `DELETE /api/product-images/{id}`
- `POST /api/products/{id}/calibers`
- `POST /api/products/{id}/qualities`
- `POST /api/products/{id}/formats`
- `GET /api/products/{id}/options`
- `PUT /api/products/{productId}/calibers/{id}`
- `PUT /api/products/{productId}/qualities/{id}`
- `PUT /api/products/{productId}/formats/{id}`
- `DELETE /api/products/{productId}/calibers/{id}`
- `DELETE /api/products/{productId}/qualities/{id}`
- `DELETE /api/products/{productId}/formats/{id}`
- `GET /api/orders/admin`
- `GET /api/orders/{id}/admin`
- `PUT /api/orders/{id}/quote`
- `PATCH /api/orders/{id}/status`

### Swagger

La documentacion API esta disponible en:

```text
/api/doc
```

### Variables relevantes

- `DATABASE_URL`
- `APP_SECRET`
- `JWT_PASSPHRASE`
- `CORS_ALLOW_ORIGINS`
- `MAILER_FROM`
- `RESEND_API_KEY`
- `CONTACT_TO_EMAIL`
- `CONTACT_FROM_EMAIL`
- `ORDER_NOTIFICATION_EMAIL`
- `FRONTEND_URL`

## Frontend

Frontend desarrollado con Angular 21.

### Stack principal

- Angular
- TypeScript
- RxJS
- Router de Angular
- Tailwind CSS
- Bootstrap
- Vitest
- Vercel Analytics
- Vercel Speed Insights

### Responsabilidades

- Home publica.
- Pagina de nosotros.
- Catalogo de productos.
- Ficha de producto con imagenes y opciones.
- Carrito.
- Login y registro.
- Solicitud y restablecimiento de contrasena.
- Area de cliente.
- Historial de pedidos.
- Checkout.
- Panel de administracion.
- Formulario de contacto.
- Confirmacion publica de pago.

### Estructura interna

```text
src/app/features/public/     Paginas publicas
src/app/features/auth/       Login, registro y recuperacion
src/app/features/customer/   Carrito, cuenta, pedidos y checkout
src/app/features/admin/      Panel de administracion
src/app/core/                Servicios, guards, interceptores y modelos
src/app/shared/              Componentes reutilizables
src/environments/            Configuracion de entornos
public/                      Imagenes y recursos estaticos
```

### Rutas principales

```text
/                    Inicio
/nosotros            Informacion corporativa
/productos           Catalogo
/productos/:id       Detalle de producto
/marcas              Marcas
/contacto            Contacto
/carrito             Carrito
/login               Inicio de sesion
/registro            Registro
/recuperar-password  Solicitud de codigo
/restablecer-password Formulario de codigo y nueva contrasena
/mi-cuenta           Area privada del cliente
/mis-pedidos         Pedidos del cliente
/checkout            Finalizacion de compra
/admin               Dashboard de administracion
/admin/*             Gestion interna
```

### Integracion con backend

- El frontend consume la API definida en `environment.ts` y `environment.development.ts`.
- Los endpoints protegidos usan JWT almacenado en local storage.
- El interceptor HTTP anade `Authorization: Bearer <token>` cuando existe sesion.
- Los guards separan acceso publico, privado y de administracion.
- El flujo de recuperacion usa dos pantallas: solicitud de codigo y formulario de restablecimiento.

## Instalacion local

### Backend

```bash
cd backend
composer install
cp .env .env.local
php bin/console doctrine:database:create --if-not-exists
php bin/console doctrine:migrations:migrate
php -S 127.0.0.1:8080 -t public
```

### Frontend

```bash
cd frontend
npm install
npm start
```

## URLs utiles

- Frontend local: `http://localhost:4200`
- Backend local: `http://127.0.0.1:8080`
- Swagger local: `http://127.0.0.1:8080/api/doc`
- Swagger produccion: `https://citribio-backend-production-3153.up.railway.app/api/doc`
- Frontend de produccion: el que se configure en despliegue
- Backend de produccion: el que se configure en Railway

## Seguridad y roles

La seguridad se basa en `config/packages/security.yaml` del backend.

- `ROLE_USER`: cliente autenticado.
- `ROLE_ADMIN`: administrador.
- Endpoints publicos: login, registro, contacto, recuperacion, catalogo y confirmacion publica de pago.
- Endpoints privados: perfil, carrito, pedidos, administracion y gestion de catalogo.
- JWT protege la API privada.

## Datos y persistencia

La base de datos es relacional, con MySQL o MariaDB.

Entidades principales:

- `User`
- `Category`
- `Product`
- `ProductImage`
- `Caliber`
- `Quality`
- `Format`
- `Cart`
- `CartItem`
- `CustomerOrder`
- `OrderItem`

El backend usa migraciones para versionar el esquema. Los cambios de estructura estan en `backend/migrations/`.

## Flujos funcionales

### Publico

- Ver inicio.
- Ver productos.
- Ver detalle.
- Consultar categorias.
- Navegar a marcas, contacto y politicas.
- Solicitar recuperacion de contrasena.

### Cliente autenticado

- Iniciar sesion.
- Crear cuenta.
- Gestionar datos personales.
- Gestionar direccion de entrega.
- Anadir y quitar productos del carrito.
- Confirmar pedido.
- Consultar pedidos propios.
- Recuperar contrasena con codigo enviado por email.

### Administracion

- Ver metricas.
- Revisar pedidos.
- Cambiar estado de pedidos.
- Generar presupuestos.
- Gestionar usuarios.
- Gestionar productos.
- Gestionar imagenes y opciones.
- Gestionar categorias.

## Despliegue

### Backend

El backend esta preparado para Railway con:

- `Dockerfile`
- `start.sh`
- `RAILWAY_ENV_VARS.md`
- migraciones automaticas
- preparacion de JWT y uploads

Flujo de despliegue recomendado:

1. Subir el proyecto a GitHub.
2. Crear el servicio en Railway y conectarlo al repositorio.
3. Añadir la base de datos MySQL o MariaDB en Railway.
4. Configurar las variables de entorno del backend.
5. Dejar que `start.sh` instale dependencias, genere las claves JWT, enlace la carpeta de uploads y ejecute las migraciones.
6. Verificar la API y Swagger en `/api/doc`.

Variables clave:

- `APP_ENV=prod`
- `APP_SECRET`
- `DATABASE_URL` o variables del plugin MySQL
- `JWT_PASSPHRASE`
- `JWT_SECRET_KEY`
- `JWT_PUBLIC_KEY`
- `CORS_ALLOW_ORIGINS`
- `MAILER_FROM`
- `BREVO_API_KEY`
- `CONTACT_TO_EMAIL`
- `CONTACT_FROM_EMAIL`
- `ORDER_NOTIFICATION_EMAIL`
- `FRONTEND_URL`

Consideraciones tecnicas:

- Railway usa MariaDB 10.6 en su plugin MySQL, por eso `DATABASE_URL` debe incluir `serverVersion=mariadb-10.6.0`.
- El host debe ser el de Railway, no `localhost` ni `127.0.0.1`.
- `start.sh` prepara la carpeta persistente de `public/uploads/products`.
- Las claves JWT pueden viajar en base64 por variables de entorno y el script las decodifica.

### Frontend

El frontend se despliega como aplicacion web independiente, normalmente en Vercel u otra plataforma similar.

Flujo de despliegue recomendado:

1. Crear el proyecto frontend desde GitHub.
2. Configurar la URL de la API del backend desplegado.
3. Publicar la aplicacion.
4. Verificar login, catalogo, carrito, pedidos y formularios.

Variables clave del frontend:

- URL de la API del backend
- entorno de produccion
- analiticas si se usan

### GitHub

Este repositorio funciona como monorepo y sirve como contenedor unico para ambos proyectos del TFG.

## Documentacion tecnica

- [backend/README.md](./backend/README.md)
- [frontend/README.md](./frontend/README.md)
- [backend/RAILWAY_ENV_VARS.md](./backend/RAILWAY_ENV_VARS.md)

## Comandos utiles

Backend:

```bash
cd backend
php bin/console debug:router
php bin/console lint:container
php bin/phpunit
```

Frontend:

```bash
cd frontend
npm run build
npm test
```

## Notas

- No se deben subir `.env.local` ni claves reales.
- El frontend usa la API del backend mediante la URL configurada en entorno.
- Swagger permite revisar la API sin leer el codigo.
- El backend maneja el email transaccional y la logica sensible; el frontend solo consume la API.
