import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { CreateCategoryRequest } from '../../../core/models/catalog.models';

export interface UpdateCategoryRequest {
  name?: string;
  description?: string | null;
  isActive?: boolean;
}

export interface CategoryResponse {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  isActive?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class AdminCategoryService {
  private readonly http = inject(HttpClient);

  create(payload: CreateCategoryRequest): Observable<CategoryResponse> {
    return this.http.post<CategoryResponse>(
      `${environment.apiUrl}/categories`,
      payload,
    );
  }

  update(categoryId: number, payload: UpdateCategoryRequest): Observable<CategoryResponse> {
    return this.http.put<CategoryResponse>(
      `${environment.apiUrl}/categories/${categoryId}`,
      payload,
    );
  }

  delete(categoryId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${environment.apiUrl}/categories/${categoryId}`);
  }
}
