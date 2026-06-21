# TFG Citribio

Repositorio monorepo del proyecto Citribio para el TFG.

## Estructura

```text
backend/   API REST desarrollada con Symfony
frontend/  Aplicacion web desarrollada con Angular
```

## Backend

El backend contiene la API REST, autenticacion JWT, gestion de usuarios, productos, categorias, carrito, pedidos, emails transaccionales, subida de imagenes y documentacion Swagger.

Documentacion especifica:

```text
backend/README.md
```

## Frontend

El frontend contiene la aplicacion web de Citribio: catalogo publico, detalle de productos, carrito, autenticacion, area de cliente, panel de administracion, pedidos y formularios.

## Instalacion

Cada proyecto se instala y ejecuta desde su carpeta correspondiente:

```bash
cd backend
composer install
```

```bash
cd frontend
npm install
```

Las variables de entorno reales no deben subirse al repositorio.
