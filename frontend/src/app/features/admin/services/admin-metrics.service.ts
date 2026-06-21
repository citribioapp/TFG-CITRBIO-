import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface AdminMetrics {
  totalUsers: number;
  totalProducts: number;
  totalCategories: number;
  totalOrders: number;
  ordersByStatus: Record<string, number>;
}

@Injectable({
  providedIn: 'root',
})
export class AdminMetricsService {
  private readonly http = inject(HttpClient);

  getMetrics(): Observable<AdminMetrics> {
    return this.http.get<AdminMetrics>(`${environment.apiUrl}/admin/metrics`);
  }
}
