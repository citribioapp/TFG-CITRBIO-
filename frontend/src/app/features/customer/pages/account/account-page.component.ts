import { Component, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';
import { AuthStateService } from '../../../../core/services/auth-state.service';
import { UserService } from '../../../../core/services/user.service';
import { OrderService } from '../../../orders/services/order.service';
import { CustomerOrderSummary } from '../../../../core/models/order.models';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './account-page.component.html',
})
export class AccountPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly authState = inject(AuthStateService);
  private readonly userService = inject(UserService);
  private readonly orderService = inject(OrderService);

  protected readonly currentUser = this.authState.currentUser;
  protected readonly isLoadingProfile = this.authState.isLoadingProfile;
  protected readonly successMessage = signal('');
  protected readonly errorMessage = signal('');
  protected readonly activeTab = signal<'profile' | 'orders' | 'logout'>('profile');
  protected readonly orders = signal<CustomerOrderSummary[]>([]);
  protected readonly isLoadingOrders = signal(false);
  protected readonly ordersErrorMessage = signal('');
  protected readonly expandedOrderIds = signal<number[]>([]);
  protected readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    lastName: ['', Validators.required],
    deliveryAddress: ['', Validators.required],
    phone: ['', Validators.required],
  });

  constructor() {
    // Si entramos con la sesion ya resuelta, cargamos el formulario desde el estado global.
    effect(() => {
      const user = this.currentUser();

      if (!user) {
        return;
      }

      this.form.patchValue({
        name: user.name,
        lastName: user.lastName,
        deliveryAddress: user.deliveryAddress,
        phone: user.phone,
      });
    });

    if (!this.currentUser()) {
      this.userService.getProfile().subscribe({
        error: () => this.errorMessage.set('No se pudo cargar el perfil del usuario.'),
      });
    }

    this.route.queryParamMap.subscribe((params) => {
      const tab = params.get('tab');

      if (tab === 'orders' || tab === 'logout' || tab === 'profile') {
        this.activeTab.set(tab);

        if (tab === 'orders') {
          this.loadOrders();
        }

        return;
      }

      this.activeTab.set('profile');
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage.set('Debes completar todos los campos obligatorios del perfil.');
      return;
    }

    this.successMessage.set('');
    this.errorMessage.set('');

    this.userService.updateProfile(this.form.getRawValue()).subscribe({
      next: (response) => this.successMessage.set(response.message),
      error: () => this.errorMessage.set('No se pudo actualizar el perfil.'),
    });
  }

  protected selectTab(tab: 'profile' | 'orders' | 'logout'): void {
    this.activeTab.set(tab);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: tab === 'profile' ? null : tab },
      queryParamsHandling: 'merge',
    });

    if (tab === 'orders') {
      this.loadOrders();
    }
  }

  protected toggleOrder(orderId: number): void {
    this.expandedOrderIds.update((ids) =>
      ids.includes(orderId) ? ids.filter((id) => id !== orderId) : [...ids, orderId],
    );
  }

  protected isExpanded(orderId: number): boolean {
    return this.expandedOrderIds().includes(orderId);
  }

  protected getStatusLabel(status: string): string {
    const normalizedStatus = status.trim().toLowerCase();

    switch (normalizedStatus) {
      case 'under_review':
        return 'En revisión';
      case 'quote_sent':
        return 'Presupuesto enviado';
      case 'payment_received':
        return 'Pago recibido';
      case 'shipped':
        return 'Enviado';
      // Legacy: map old statuses safely
      case 'confirmed':
        return 'Presupuesto enviado';
      default:
        return status;
    }
  }

  protected logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  private loadOrders(): void {
    if (this.isLoadingOrders() || this.orders().length > 0) {
      return;
    }

    this.isLoadingOrders.set(true);
    this.ordersErrorMessage.set('');

    this.orderService.listMyOrders().subscribe({
      next: (orders) => {
        this.orders.set(orders);
        this.isLoadingOrders.set(false);
      },
      error: () => {
        this.ordersErrorMessage.set('No se pudieron cargar tus pedidos.');
        this.isLoadingOrders.set(false);
      },
    });
  }
}
