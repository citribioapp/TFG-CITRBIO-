# Citribio Frontend

Aplicacion web de Citribio desarrollada con Angular 21. La interfaz consume la API del backend y cubre el flujo completo de navegacion publica, autenticacion, compra, gestion de cuenta y administracion.

## Indice

- [Resumen](#resumen)
- [Stack tecnologico](#stack-tecnologico)
- [Arquitectura](#arquitectura)
- [Rutas de la aplicacion](#rutas-de-la-aplicacion)
- [Funcionamiento](#funcionamiento)
- [Integracion con el backend](#integracion-con-el-backend)
- [Instalacion local](#instalacion-local)
- [Configuracion de entorno](#configuracion-de-entorno)
- [Compilacion y pruebas](#compilacion-y-pruebas)
- [Despliegue](#despliegue)
- [Estructura del proyecto](#estructura-del-proyecto)

## Resumen

El frontend presenta la tienda Citribio y permite:

- navegar por el catalogo publico;
- ver el detalle de un producto;
- añadir productos al carrito;
- registrarse e iniciar sesion;
- recuperar y restablecer la contrasena;
- gestionar perfil y pedidos;
- acceder al panel de administracion;
- enviar mensajes desde el formulario de contacto;
- confirmar pagos publicos mediante token.

La aplicacion esta organizada para separar claramente la experiencia publica, el area privada del cliente y el panel administrativo.

## Stack tecnologico

- Angular 21
- TypeScript
- RxJS
- Router de Angular
- HttpClient de Angular
- Tailwind CSS
- Bootstrap
- Vitest
- Vercel Analytics
- Vercel Speed Insights

## Arquitectura

La aplicacion usa una arquitectura por features:

```text
src/app/features/public/     Paginas publicas
src/app/features/auth/       Login, registro y recuperacion de contrasena
src/app/features/customer/   Cuenta, carrito, pedidos y checkout
src/app/features/admin/      Panel de administracion
src/app/core/                Servicios, guards, modelos e interceptores
src/app/shared/              Componentes reutilizables
src/environments/            Configuracion del backend y entorno
public/                      Imagenes y recursos estaticos
```

Elementos principales:

- `public-layout`: estructura de paginas publicas.
- `private-layout`: estructura para el area autenticada.
- `auth.guard`: protege rutas privadas.
- `admin.guard`: protege rutas de administracion.
- `guest.guard`: evita mostrar login o registro a usuarios autenticados.
- `auth.interceptor`: añade el token JWT a las peticiones que lo requieren.
- `auth-state.service`: gestiona el estado de autenticacion.
- `cart-state.service`: gestiona el carrito en memoria y con backend.

## Rutas de la aplicacion

### Publicas

- `/` inicio
- `/nosotros` informacion corporativa
- `/productos` catalogo
- `/productos/:id` detalle de producto
- `/marcas` marcas
- `/politica-de-privacidad` politica de privacidad
- `/politica-cookies` politica de cookies
- `/contacto` formulario de contacto
- `/pedido/:id/pago-realizado` confirmacion publica de pago

### Acceso de cliente

- `/carrito`
- `/login`
- `/registro`
- `/recuperar-password`
- `/restablecer-password`
- `/mi-cuenta`
- `/mis-pedidos`
- `/checkout`

### Administracion

- `/admin`
- `/admin/productos`
- `/admin/productos-admin`
- `/admin/categorias`
- `/admin/opciones`
- `/admin/pedidos`
- `/admin/pedidos/:id/revisar`
- `/admin/usuarios`

## Funcionamiento

### Navegacion publica

La parte publica muestra la marca, el catalogo, la informacion corporativa y los formularios de contacto y autenticacion.

### Autenticacion

El login guarda el token JWT en el navegador y restaura la sesion al recargar la pagina. El registro crea un usuario nuevo y la recuperacion de contrasena usa dos pasos:

1. solicitud del codigo por email;
2. formulario para introducir codigo y nueva contrasena.

### Carrito y checkout

El carrito se puede gestionar desde la vista publica y desde el area privada. El checkout prepara el pedido y el backend se encarga de persistirlo.

### Area privada

El cliente autenticado puede ver sus datos, modificar el perfil, consultar pedidos y completar acciones asociadas a su cuenta.

### Administracion

El panel de administracion permite gestionar catalogo, pedidos, usuarios y configuraciones de producto.

## Integracion con el backend

La URL de la API se centraliza en:

- `src/environments/environment.ts`
- `src/environments/environment.development.ts`

Actualmente ambas configuraciones apuntan al backend desplegado en Railway.

El frontend consume principalmente:

- `POST /api/login`
- `POST /api/register`
- `POST /api/forgot-password`
- `POST /api/reset-password`
- `GET /api/me`
- `GET /api/products`
- `GET /api/categories`
- `GET /api/orders`

El interceptor HTTP añade el JWT a las peticiones privadas. Los guards controlan el acceso a rutas segun el estado de autenticacion y el rol del usuario.

## Instalacion local

```bash
npm install
npm start
```

El servidor de desarrollo queda disponible en:

```text
http://localhost:4200
```

## Configuracion de entorno

La direccion del backend se define en los archivos de entorno:

```text
src/environments/environment.ts
src/environments/environment.development.ts
```

Propiedades principales:

- `production`
- `appName`
- `apiUrl`

Si se quiere trabajar con un backend local, hay que cambiar `apiUrl` para que apunte a la instancia local del backend.

## Compilacion y pruebas

### Compilacion

```bash
npm run build
```

### Pruebas

```bash
npm test
```

### Desarrollo continuo

```bash
npm run watch
```

## Despliegue

El frontend se despliega como aplicacion web independiente.

Flujo habitual:

1. Conectar el proyecto a GitHub.
2. Configurar la plataforma de despliegue.
3. Ajustar `apiUrl` para apuntar al backend de produccion.
4. Verificar rutas publicas, login, carrito, pedidos y formularios.

## Estructura del proyecto

```text
src/app/app.routes.ts
src/app/app.config.ts
src/app/core/
src/app/features/
src/app/layouts/
src/app/shared/
src/environments/
public/
```

## Recursos

- Angular CLI: https://angular.dev/tools/cli
- Vitest: https://vitest.dev/
