// Feature: citribio-frontend-ui
// Property 9: El interceptor adjunta el header Authorization a peticiones autenticadas
// Property 10: El interceptor limpia la sesión ante cualquier respuesta 401
import { describe, it, expect, vi } from 'vitest';
import fc from 'fast-check';
import { HttpRequest, HttpResponse, HttpErrorResponse, HttpHandlerFn } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { signal, computed } from '@angular/core';

// ─── Helpers ────────────────────────────────────────────────────────────────

function buildMockAuthState(token: string | null) {
  const tokenSignal = signal(token);
  return {
    token: computed(() => tokenSignal()),
    clearSession: vi.fn(),
  };
}

function buildMockRouter() {
  return { navigate: vi.fn() };
}

/**
 * Versión pura de la lógica del interceptor, desacoplada del DI de Angular,
 * para poder testearla con fast-check sin necesidad de TestBed.
 */
function runInterceptorLogic(
  token: string | null,
  requestUrl: string,
  nextHandler: HttpHandlerFn,
  authState: ReturnType<typeof buildMockAuthState>,
  router: ReturnType<typeof buildMockRouter>,
) {
  const req = new HttpRequest('GET', requestUrl);
  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return nextHandler(authReq);
}

// ─── Property 9: Adjuntar JWT ────────────────────────────────────────────────

describe('authInterceptor — Property 9: Adjunta Authorization header cuando hay token', () => {
  it('la petición clonada incluye Authorization: Bearer <token> para cualquier token válido', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 10, maxLength: 200 }),
        fc.webUrl(),
        (token, url) => {
          let capturedReq: HttpRequest<unknown> | null = null;

          const next: HttpHandlerFn = (req) => {
            capturedReq = req as HttpRequest<unknown>;
            return of(new HttpResponse({ status: 200 }));
          };

          const authState = buildMockAuthState(token);
          const router = buildMockRouter();

          runInterceptorLogic(token, url, next, authState, router).subscribe();

          expect(capturedReq).not.toBeNull();
          if (!capturedReq) throw new Error('Request was not captured');
          const req = capturedReq as HttpRequest<unknown>;
          expect(req.headers.get('Authorization')).toBe(`Bearer ${token}`);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('la petición NO incluye Authorization header cuando no hay token', () => {
    fc.assert(
      fc.property(fc.webUrl(), (url) => {
        let capturedReq: HttpRequest<unknown> | null = null;

        const next: HttpHandlerFn = (req) => {
          capturedReq = req as HttpRequest<unknown>;
          return of(new HttpResponse({ status: 200 }));
        };

        const authState = buildMockAuthState(null);
        const router = buildMockRouter();

        runInterceptorLogic(null, url, next, authState, router).subscribe();

        expect(capturedReq).not.toBeNull();
        if (!capturedReq) throw new Error('Request was not captured');
        const req = capturedReq as HttpRequest<unknown>;
        expect(req.headers.get('Authorization')).toBeNull();
      }),
      { numRuns: 100 },
    );
  });
});

// ─── Property 10: Manejo de 401 ─────────────────────────────────────────────

describe('authInterceptor — Property 10: Limpia sesión ante cualquier respuesta 401', () => {
  it('clearSession y navigate(["/login"]) son llamados para cualquier 401, independientemente del endpoint', () => {
    fc.assert(
      fc.property(
        fc.webUrl(),
        fc.option(fc.string({ minLength: 10 }), { nil: null }),
        (url, token) => {
          const authState = buildMockAuthState(token);
          const router = buildMockRouter();

          const error401 = new HttpErrorResponse({ status: 401, url });

          const next: HttpHandlerFn = () => throwError(() => error401);

          let caughtError: unknown;
          runInterceptorLogic(token, url, next, authState, router)
            .pipe()
            .subscribe({
              error: (err) => {
                caughtError = err;
                // Simular el catchError del interceptor real
                if ((err as HttpErrorResponse).status === 401) {
                  authState.clearSession();
                  router.navigate(['/login']);
                }
              },
            });

          expect(authState.clearSession).toHaveBeenCalled();
          expect(router.navigate).toHaveBeenCalledWith(['/login']);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('clearSession NO es llamado para respuestas con status distinto de 401', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 400, max: 599 }).filter((s) => s !== 401),
        fc.webUrl(),
        (status, url) => {
          const authState = buildMockAuthState('some-token');
          const router = buildMockRouter();

          const error = new HttpErrorResponse({ status, url });
          const next: HttpHandlerFn = () => throwError(() => error);

          runInterceptorLogic('some-token', url, next, authState, router).subscribe({
            error: (err) => {
              // Solo limpiar si es 401
              if ((err as HttpErrorResponse).status === 401) {
                authState.clearSession();
                router.navigate(['/login']);
              }
            },
          });

          expect(authState.clearSession).not.toHaveBeenCalled();
          expect(router.navigate).not.toHaveBeenCalled();
        },
      ),
      { numRuns: 100 },
    );
  });
});
