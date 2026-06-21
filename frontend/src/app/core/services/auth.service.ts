import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  ForgotPasswordRequest,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  ResetPasswordRequest,
  UserProfile,
} from '../models/auth.models';
import { AuthStateService } from './auth-state.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly authState = inject(AuthStateService);

  // Este servicio centraliza login, registro, logout y recuperacion del usuario autenticado.
  login(payload: LoginRequest): Observable<UserProfile> {
    return this.http.post<LoginResponse>(`${environment.apiUrl}/login`, payload).pipe(
      tap((response) => this.authState.setSession(response.token)),
      switchMap(() => this.authState.fetchCurrentUser()),
    );
  }

  register(payload: RegisterRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${environment.apiUrl}/register`, payload);
  }

  forgotPassword(payload: ForgotPasswordRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${environment.apiUrl}/forgot-password`, payload);
  }

  resetPassword(payload: ResetPasswordRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${environment.apiUrl}/reset-password`, payload);
  }

  logout(): void {
    this.authState.clearSession();
  }
}
