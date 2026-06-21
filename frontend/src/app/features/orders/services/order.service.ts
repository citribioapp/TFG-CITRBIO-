import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { CreateOrderResponse, CustomerOrderSummary } from '../../../core/models/order.models';

@Injectable({
  providedIn: 'root',
})
export class OrderService {
  private readonly http = inject(HttpClient);

  createOrder(): Observable<CreateOrderResponse> {
    return this.http.post<CreateOrderResponse>(`${environment.apiUrl}/orders`, {});
  }

  listMyOrders(): Observable<CustomerOrderSummary[]> {
    return this.http.get<CustomerOrderSummary[]>(`${environment.apiUrl}/orders`);
  }
}
