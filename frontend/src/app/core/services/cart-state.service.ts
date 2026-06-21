import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { EMPTY } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { CartItem, CartResponse } from '../models/cart.models';
import { environment } from '../../../environments/environment';

/**
 * Reactive store for cart state.
 * Source of truth for the navbar badge, mini-cart summary and cart page.
 * Call loadFromBackend() whenever the user session is established (login, refresh).
 */
@Injectable({ providedIn: 'root' })
export class CartStateService {
  private readonly http = inject(HttpClient);
  private readonly itemsSignal = signal<CartItem[]>([]);

  readonly items = computed(() => this.itemsSignal());

  readonly count = computed(() =>
    this.itemsSignal().reduce((sum, item) => sum + item.quantity, 0),
  );

  /** Fetch the real cart from the backend and populate the store. */
  loadFromBackend(): void {
    this.http
      .get<CartResponse>(`${environment.apiUrl}/cart`)
      .pipe(
        tap((response) => this.itemsSignal.set(response.items)),
        catchError(() => EMPTY), // silently ignore errors (e.g. unauthenticated)
      )
      .subscribe();
  }

  setItems(items: CartItem[]): void {
    this.itemsSignal.set(items);
  }

  increment(quantity = 1): void {
    // Optimistic increment when we know an item was added but don't reload the full cart
    this.itemsSignal.update((items) => [
      ...items,
      {
        cartItemId: -Date.now(), // temporary id
        quantity,
        product: { id: null, name: null },
        selection: { caliber: null, quality: null, format: null },
      },
    ]);
  }

  clear(): void {
    this.itemsSignal.set([]);
  }
}
