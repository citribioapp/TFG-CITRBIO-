import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AdminUserSummary, UpdateUserRolesRequest } from '../../../core/models/user.models';

@Injectable({
  providedIn: 'root',
})
export class AdminUserService {
  private readonly http = inject(HttpClient);

  list(): Observable<AdminUserSummary[]> {
    return this.http.get<AdminUserSummary[]>(`${environment.apiUrl}/users`);
  }

  updateRoles(userId: number, payload: UpdateUserRolesRequest): Observable<{ message: string; roles: string[] }> {
    return this.http.patch<{ message: string; roles: string[] }>(
      `${environment.apiUrl}/users/${userId}/roles`,
      payload,
    );
  }

  delete(userId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${environment.apiUrl}/users/${userId}`);
  }
}
