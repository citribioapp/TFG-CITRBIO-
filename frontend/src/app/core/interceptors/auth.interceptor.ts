import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthStateService } from '../services/auth-state.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authState = inject(AuthStateService);
  const router = inject(Router);
  const token = authState.token();

  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        // Do NOT redirect if this is an auth endpoint or a silent session-restore call.
        // Auth endpoints (/login, /register, etc.) handle their own errors in the component.
        // The /me endpoint is called on startup to restore a saved token — if it fails it
        // just means the token expired; the user should stay on the current public page.
        const isAuthEndpoint =
          req.url.endsWith('/login') ||
          req.url.endsWith('/register') ||
          req.url.endsWith('/forgot-password') ||
          req.url.endsWith('/reset-password');

        const isSessionRestore = req.url.endsWith('/me');

        if (!isAuthEndpoint && !isSessionRestore) {
          authState.clearSession();
          router.navigate(['/login']);
        } else if (isSessionRestore) {
          // Token is stale — clear it silently so the user stays on the current page.
          authState.clearSession();
        }
      }
      return throwError(() => error);
    }),
  );
};
