import { Routes } from '@angular/router';
import { adminGuard } from './core/guards/admin.guard';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';
import { PrivateLayoutComponent } from './layouts/private-layout/private-layout.component';
import { PublicLayoutComponent } from './layouts/public-layout/public-layout.component';

export const routes: Routes = [
  {
    path: '',
    component: PublicLayoutComponent,
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/public/pages/home/home-page.component').then((m) => m.HomePageComponent),
        title: 'Inicio | Citribio',
      },
      {
        path: 'nosotros',
        loadComponent: () =>
          import('./features/public/pages/about/about-page.component').then((m) => m.AboutPageComponent),
        title: 'Nosotros | Citribio',
      },
      {
        path: 'productos',
        loadComponent: () =>
          import('./features/public/pages/products/products-page.component').then(
            (m) => m.ProductsPageComponent,
          ),
        title: 'Productos | Citribio',
      },
      {
        path: 'productos/:id',
        loadComponent: () =>
          import('./features/public/pages/product-detail/product-detail-page.component').then(
            (m) => m.ProductDetailPageComponent,
          ),
        title: 'Detalle de producto | Citribio',
      },
      {
        path: 'marcas',
        loadComponent: () =>
          import('./features/public/pages/brands/brands-page.component').then(
            (m) => m.BrandsPageComponent,
          ),
        title: 'Marcas | Citribio',
      },
      {
        path: 'politica-de-privacidad',
        loadComponent: () =>
          import('./features/public/pages/privacy-policy/privacy-policy-page.component').then(
            (m) => m.PrivacyPolicyPageComponent,
          ),
        title: 'Política de privacidad | Citribio',
      },
      {
        path: 'politica-cookies',
        loadComponent: () =>
          import('./features/public/pages/cookie-policy/cookie-policy-page.component').then(
            (m) => m.CookiePolicyPageComponent,
          ),
        title: 'Política de cookies | Citribio',
      },
      {
        path: 'contacto',
        loadComponent: () =>
          import('./features/public/pages/contact/contact-page.component').then(
            (m) => m.ContactPageComponent,
          ),
        title: 'Contacto | Citribio',
      },
      {
        path: 'pedido/:id/pago-realizado',
        loadComponent: () =>
          import('./features/public/pages/payment-proof/payment-proof-page.component').then(
            (m) => m.PaymentProofPageComponent,
          ),
        title: 'Confirmar pago | Citribio',
      },
      {
        path: 'carrito',
        loadComponent: () =>
          import('./features/customer/pages/cart/cart-page.component').then(
            (m) => m.CartPageComponent,
          ),
        title: 'Carrito | Citribio',
      },
      {
        path: 'login',
        canActivate: [guestGuard],
        loadComponent: () =>
          import('./features/auth/pages/login/login-page.component').then((m) => m.LoginPageComponent),
        title: 'Iniciar sesion | Citribio',
      },
      {
        path: 'registro',
        canActivate: [guestGuard],
        loadComponent: () =>
          import('./features/auth/pages/register/register-page.component').then(
            (m) => m.RegisterPageComponent,
          ),
        title: 'Registro | Citribio',
      },
      {
        path: 'recuperar-password',
        canActivate: [guestGuard],
        loadComponent: () =>
          import('./features/auth/pages/forgot-password/forgot-password-page.component').then(
            (m) => m.ForgotPasswordPageComponent,
          ),
        title: 'Recuperar password | Citribio',
      },
      {
        path: 'restablecer-password',
        canActivate: [guestGuard],
        loadComponent: () =>
          import('./features/auth/pages/reset-password/reset-password-page.component').then(
            (m) => m.ResetPasswordPageComponent,
          ),
        title: 'Restablecer password | Citribio',
      },
    ],
  },
  {
    path: '',
    component: PrivateLayoutComponent,
    children: [
      {
        path: 'mi-cuenta',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/customer/pages/account/account-page.component').then(
            (m) => m.AccountPageComponent,
          ),
        title: 'Mi cuenta | Citribio',
      },
      {
        path: 'mis-pedidos',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/customer/pages/orders/customer-orders-page.component').then(
            (m) => m.CustomerOrdersPageComponent,
          ),
        title: 'Mis pedidos | Citribio',
      },
      {
        path: 'checkout',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/customer/pages/checkout/checkout-page.component').then(
            (m) => m.CheckoutPageComponent,
          ),
        title: 'Finalizar pedido | Citribio',
      },
      {
        path: 'admin',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/admin/pages/dashboard/admin-dashboard-page.component').then(
            (m) => m.AdminDashboardPageComponent,
          ),
        title: 'Panel admin | Citribio',
      },
      {
        path: 'admin/productos',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/admin/pages/products/admin-products-page.component').then(
            (m) => m.AdminProductsPageComponent,
          ),
        title: 'Admin productos | Citribio',
      },
      {
        path: 'admin/productos-admin',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/admin/pages/product-management/admin-product-management-page.component').then(
            (m) => m.AdminProductManagementPageComponent,
          ),
        title: 'Administración de productos | Citribio',
      },
      {
        path: 'admin/categorias',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/admin/pages/categories/admin-categories-page.component').then(
            (m) => m.AdminCategoriesPageComponent,
          ),
        title: 'Admin categorias | Citribio',
      },
      {
        path: 'admin/opciones',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/admin/pages/options/admin-options-page.component').then(
            (m) => m.AdminOptionsPageComponent,
          ),
        title: 'Configurar producto | Citribio',
      },
      {
        path: 'admin/pedidos',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/admin/pages/orders/admin-orders-page.component').then(
            (m) => m.AdminOrdersPageComponent,
          ),
        title: 'Admin pedidos | Citribio',
      },
      {
        path: 'admin/pedidos/:id/revisar',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/admin/pages/order-review/admin-order-review-page.component').then(
            (m) => m.AdminOrderReviewPageComponent,
          ),
        title: 'Revisar pedido | Citribio',
      },
      {
        path: 'admin/usuarios',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/admin/pages/users/admin-users-page.component').then(
            (m) => m.AdminUsersPageComponent,
          ),
        title: 'Admin usuarios | Citribio',
      },
    ],
  },
  {
    path: '**',
    component: PublicLayoutComponent,
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./shared/pages/not-found/not-found-page.component').then(
            (m) => m.NotFoundPageComponent,
          ),
        title: 'Pagina no encontrada | Citribio',
      },
    ],
  },
];
