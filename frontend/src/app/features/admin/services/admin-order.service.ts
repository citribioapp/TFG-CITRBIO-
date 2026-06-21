import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AdminOrderSummary, SendQuoteRequest, SendQuoteResponse } from '../../../core/models/order.models';

@Injectable({
  providedIn: 'root',
})
export class AdminOrderService {
  private readonly http = inject(HttpClient);

  list(): Observable<AdminOrderSummary[]> {
    return this.http.get<AdminOrderSummary[]>(`${environment.apiUrl}/orders/admin`);
  }

  get(orderId: number): Observable<AdminOrderSummary> {
    return this.http.get<AdminOrderSummary>(`${environment.apiUrl}/orders/${orderId}/admin`);
  }

  updateStatus(orderId: number, status: string): Observable<{ message: string; orderId: number; status: string; updatedAt: string }> {
    return this.http.patch<{ message: string; orderId: number; status: string; updatedAt: string }>(
      `${environment.apiUrl}/orders/${orderId}/status`,
      { status },
    );
  }

  sendQuote(orderId: number, payload: SendQuoteRequest): Observable<SendQuoteResponse> {
    return this.http.put<SendQuoteResponse>(
      `${environment.apiUrl}/orders/${orderId}/quote`,
      payload,
    );
  }
}
