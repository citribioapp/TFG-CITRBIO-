import { Injectable } from '@angular/core';
import { AddCartItemRequest } from '../models/cart.models';

export interface PendingCartAction {
  payload: AddCartItemRequest;
  returnUrl: string;
}

const STORAGE_KEY = 'citribio_pending_cart';

@Injectable({ providedIn: 'root' })
export class PendingCartService {
  save(action: PendingCartAction): void {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(action));
  }

  get(): PendingCartAction | null {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as PendingCartAction;
    } catch {
      return null;
    }
  }

  clear(): void {
    sessionStorage.removeItem(STORAGE_KEY);
  }

  has(): boolean {
    return sessionStorage.getItem(STORAGE_KEY) !== null;
  }
}
