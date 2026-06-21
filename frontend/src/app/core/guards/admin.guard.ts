import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStateService } from '../services/auth-state.service';

// Restringe el acceso al panel interno solo a usuarios con ROLE_ADMIN.
export const adminGuard: CanActivateFn = (_route, state) => {
  const authState = inject(AuthStateService);
  const router = inject(Router);

  if (!authState.isAuthenticated()) {
    // Pass the attempted URL so login can redirect back after authentication
    return router.createUrlTree(['/login'], {
      queryParams: { redirectTo: state.url },
    });
  }

  if (authState.isAdmin()) {
    return true;
  }

  return router.createUrlTree(['/mi-cuenta']);
};
