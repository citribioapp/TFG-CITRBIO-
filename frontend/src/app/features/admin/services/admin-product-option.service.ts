import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ProductOption } from '../../../core/models/catalog.models';

export type ProductOptionType = 'calibers' | 'qualities' | 'formats';

export interface ProductOptionsResponse {
  productId: number;
  productName: string;
  calibers: ProductOption[];
  qualities: ProductOption[];
  formats: ProductOption[];
}

@Injectable({
  providedIn: 'root',
})
export class AdminProductOptionService {
  private readonly http = inject(HttpClient);

  // Gestion generica de opciones para no duplicar tres servicios casi iguales.
  create(productId: number, type: ProductOptionType, name: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${environment.apiUrl}/products/${productId}/${type}`, {
      name,
    });
  }

  getOptions(productId: number): Observable<ProductOptionsResponse> {
    return this.http.get<ProductOptionsResponse>(`${environment.apiUrl}/products/${productId}/options`);
  }

  delete(productId: number, type: ProductOptionType, optionId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${environment.apiUrl}/products/${productId}/${type}/${optionId}`,
    );
  }

  update(productId: number, type: ProductOptionType, optionId: number, name: string): Observable<{ id: number; name: string }> {
    return this.http.put<{ id: number; name: string }>(
      `${environment.apiUrl}/products/${productId}/${type}/${optionId}`,
      { name },
    );
  }
}
