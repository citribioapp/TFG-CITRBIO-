import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { UpdateProfileRequest, UserProfile } from '../models/auth.models';
import { AuthStateService } from './auth-state.service';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly authState = inject(AuthStateService);

  getProfile(): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${environment.apiUrl}/me`).pipe(
      tap((user) => this.authState.setCurrentUser(user)),
    );
  }

  updateProfile(payload: UpdateProfileRequest): Observable<{ message: string; user: UserProfile }> {
    return this.http
      .patch<{ message: string; user: UserProfile }>(`${environment.apiUrl}/me`, payload)
      .pipe(tap((response) => this.authState.setCurrentUser(response.user)));
  }
}
