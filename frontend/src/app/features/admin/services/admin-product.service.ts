import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  CreateProductRequest,
  ProductImage,
  UpdateProductRequest,
} from '../../../core/models/catalog.models';

@Injectable({
  providedIn: 'root',
})
export class AdminProductService {
  private readonly http = inject(HttpClient);

  create(payload: CreateProductRequest): Observable<{ id: number; name: string }> {
    return this.http.post<{ id: number; name: string }>(`${environment.apiUrl}/products`, payload);
  }

  update(productId: number, payload: UpdateProductRequest): Observable<{ id: number; name: string }> {
    return this.http.put<{ id: number; name: string }>(
      `${environment.apiUrl}/products/${productId}`,
      payload,
    );
  }

  delete(productId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${environment.apiUrl}/products/${productId}`);
  }

  listImages(productId: number): Observable<ProductImage[]> {
    return this.http.get<ProductImage[]>(`${environment.apiUrl}/products/${productId}/images`);
  }

  uploadImage(productId: number, file: File): Observable<{ message: string }> {
    const formData = new FormData();
    formData.append('image', file);

    return this.http.post<{ message: string }>(`${environment.apiUrl}/products/${productId}/images`, formData);
  }

  deleteImage(imageId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${environment.apiUrl}/product-images/${imageId}`);
  }
}
