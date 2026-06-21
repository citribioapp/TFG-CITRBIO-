import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ProductDetail, ProductSummary } from '../../../core/models/catalog.models';

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  private readonly http = inject(HttpClient);

  list(): Observable<ProductSummary[]> {
    return this.http.get<ProductSummary[]>(`${environment.apiUrl}/products`);
  }

  getById(productId: number): Observable<ProductDetail> {
    return this.http.get<ProductDetail>(`${environment.apiUrl}/products/${productId}`);
  }
}
