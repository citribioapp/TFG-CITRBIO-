import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  CategoryProductsResponse,
  CategoryWithProducts,
} from '../../../core/models/catalog.models';

@Injectable({
  providedIn: 'root',
})
export class CategoryService {
  private readonly http = inject(HttpClient);

  list(): Observable<CategoryWithProducts[]> {
    return this.http.get<CategoryWithProducts[]>(`${environment.apiUrl}/categories`);
  }

  getProducts(categoryId: number): Observable<CategoryProductsResponse> {
    return this.http.get<CategoryProductsResponse>(`${environment.apiUrl}/categories/${categoryId}/products`);
  }
}
