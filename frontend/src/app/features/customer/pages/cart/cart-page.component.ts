import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CartItem } from '../../../../core/models/cart.models';
import { CartService } from '../../../cart/services/cart.service';
import { CartStateService } from '../../../../core/services/cart-state.service';
import { AuthStateService } from '../../../../core/services/auth-state.service';
import { environment } from '../../../../../environments/environment';

@Component({
  standalone: true,
  imports: [RouterLink],
  templateUrl: './cart-page.component.html',
})
export class CartPageComponent {
  private readonly cartService = inject(CartService);
  private readonly cartState = inject(CartStateService);
  private readonly authState = inject(AuthStateService);

  protected readonly items = signal<CartItem[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly isAuthenticated = this.authState.isAuthenticated;

  // Delete confirmation
  protected readonly itemPendingDelete = signal<CartItem | null>(null);
  protected readonly isDeleting = signal(false);

  // Toast
  protected readonly toastMessage = signal('');
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  // Quantity update tracking
  protected readonly updatingItemId = signal<number | null>(null);

  // Computed totals
  protected readonly totalItems = computed(() =>
    this.items().reduce((sum, item) => sum + item.quantity, 0),
  );

  constructor() {
    if (!this.authState.isAuthenticated()) {
      this.isLoading.set(false);
      return;
    }
    this.loadCart();
  }

  private loadCart(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.cartService.getCart().subscribe({
      next: (response) => {
        this.items.set(response.items);
        this.cartState.setItems(response.items);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('No se pudo cargar el carrito.');
        this.isLoading.set(false);
      },
    });
  }

  // ── Quantity controls ──────────────────────────────────────────────────────

  protected increaseQuantity(item: CartItem): void {
    this.updateQuantity(item, item.quantity + 1);
  }

  protected decreaseQuantity(item: CartItem): void {
    if (item.quantity <= 1) return;
    this.updateQuantity(item, item.quantity - 1);
  }

  private updateQuantity(item: CartItem, newQty: number): void {
    // Optimistic update
    this.items.update((items) =>
      items.map((i) => (i.cartItemId === item.cartItemId ? { ...i, quantity: newQty } : i)),
    );
    this.cartState.setItems(this.items());
  }

  // ── Delete flow ────────────────────────────────────────────────────────────

  protected requestDelete(item: CartItem): void {
    this.itemPendingDelete.set(item);
  }

  protected cancelDelete(): void {
    this.itemPendingDelete.set(null);
  }

  protected confirmDelete(): void {
    const item = this.itemPendingDelete();
    if (!item) return;

    this.isDeleting.set(true);
    this.errorMessage.set('');

    this.cartService.removeItem(item.cartItemId).subscribe({
      next: () => {
        this.items.update((items) => items.filter((i) => i.cartItemId !== item.cartItemId));
        this.cartState.setItems(this.items());
        this.itemPendingDelete.set(null);
        this.isDeleting.set(false);
        this.showToast('Producto eliminado del carrito');
      },
      error: () => {
        this.errorMessage.set('No se pudo eliminar el producto del carrito.');
        this.itemPendingDelete.set(null);
        this.isDeleting.set(false);
      },
    });
  }

  private showToast(message: string): void {
    this.toastMessage.set(message);
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toastMessage.set(''), 3000);
  }

  protected resolveImageUrl(imagePath: string): string {
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }
    const baseUrl = environment.apiUrl.replace(/\/api$/, '');
    return `${baseUrl}${imagePath}`;
  }
}
