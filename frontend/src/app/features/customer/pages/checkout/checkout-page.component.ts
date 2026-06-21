import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { OrderService } from '../../../orders/services/order.service';
import { CartStateService } from '../../../../core/services/cart-state.service';
import { AuthStateService } from '../../../../core/services/auth-state.service';
import { environment } from '../../../../../environments/environment';

@Component({
  standalone: true,
  imports: [RouterLink],
  templateUrl: './checkout-page.component.html',
})
export class CheckoutPageComponent {
  private readonly orderService = inject(OrderService);
  private readonly cartState = inject(CartStateService);
  private readonly authState = inject(AuthStateService);

  protected readonly isSubmitting = signal(false);
  protected readonly isCompleted = signal(false);
  protected readonly successMessage = signal('');
  protected readonly errorMessage = signal('');
  protected readonly warningMessage = signal('');

  protected readonly currentUser = this.authState.currentUser;

  /** Real cart items only (filter out optimistic placeholders) */
  protected readonly cartItems = computed(() =>
    this.cartState.items().filter(item => item.cartItemId > 0 && item.product.name !== null)
  );

  protected resolveImageUrl(imagePath: string | null | undefined): string | null {
    if (!imagePath) return null;
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) return imagePath;
    const base = environment.apiUrl.replace(/\/api$/, '');
    return `${base}${imagePath}`;
  }

  protected submitOrder(): void {
    this.isSubmitting.set(true);
    this.successMessage.set('');
    this.errorMessage.set('');
    this.warningMessage.set('');

    this.orderService.createOrder().subscribe({
      next: (response) => {
        this.isCompleted.set(true);
        this.successMessage.set('Pedido enviado para revisión');
        this.warningMessage.set(response.warning || '');
        this.isSubmitting.set(false);
        this.cartState.clear();
        // Scroll to top so the success message is immediately visible
        window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
      },
      error: (error) => {
        this.errorMessage.set(error.error?.error || 'No se pudo finalizar el pedido.');
        this.isSubmitting.set(false);
      },
    });
  }
}
