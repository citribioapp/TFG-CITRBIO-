import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, EMPTY } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { UserProfile } from '../models/auth.models';
import { TokenService } from './token.service';

@Injectable({
  providedIn: 'root',
})
export class AuthStateService {
  private readonly http = inject(HttpClient);
  private readonly tokenService = inject(TokenService);

  private readonly tokenSignal = signal<string | null>(this.tokenService.getToken());
  private readonly currentUserSignal = signal<UserProfile | null>(null);
  private readonly loadingProfileSignal = signal(false);

  readonly token = computed(() => this.tokenSignal());
  readonly currentUser = computed(() => this.currentUserSignal());
  readonly isAuthenticated = computed(() => Boolean(this.tokenSignal()));
  readonly isAdmin = computed(() => this.currentUserSignal()?.roles.includes('ROLE_ADMIN') ?? false);
  readonly isLoadingProfile = computed(() => this.loadingProfileSignal());

  // Restauramos la sesion si el usuario ya tenia token guardado.
  restoreSession(): void {
    if (!this.tokenSignal() || this.loadingProfileSignal()) {
      return;
    }

    this.fetchCurrentUser().subscribe();
  }

  setSession(token: string, user: UserProfile | null = null): void {
    this.tokenService.setToken(token);
    this.tokenSignal.set(token);

    if (user) {
      this.currentUserSignal.set(user);
    }
  }

  clearSession(): void {
    this.tokenService.clearToken();
    this.tokenSignal.set(null);
    this.currentUserSignal.set(null);
  }

  setCurrentUser(user: UserProfile): void {
    this.currentUserSignal.set(user);
  }

  fetchCurrentUser(): Observable<UserProfile> {
    if (!this.tokenSignal()) {
      return EMPTY;
    }

    this.loadingProfileSignal.set(true);

    return this.http.get<UserProfile>(`${environment.apiUrl}/me`).pipe(
      tap((user) => {
        this.currentUserSignal.set(user);
        this.loadingProfileSignal.set(false);
      }),
      catchError((error) => {
        this.loadingProfileSignal.set(false);
        // Clear the stale token silently. The interceptor already handles the
        // session wipe for /me 401s — we just swallow the error here so startup
        // never throws and never triggers a redirect to /login.
        this.clearSession();
        return EMPTY;
      }),
    );
  }
}
