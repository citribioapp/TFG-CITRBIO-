import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgClass } from '@angular/common';
import { CustomerOrderSummary } from '../../../../core/models/order.models';
import { OrderService } from '../../../orders/services/order.service';

@Component({
  standalone: true,
  imports: [RouterLink, NgClass],
  templateUrl: './customer-orders-page.component.html',
})
export class CustomerOrdersPageComponent {
  private readonly orderService = inject(OrderService);

  protected readonly orders = signal<CustomerOrderSummary[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly placeholders = Array.from({ length: 3 }, (_, index) => index);
  protected readonly expandedOrderIds = signal<number[]>([]);

  constructor() {
    // El listado de pedidos nos permite comprobar pronto que el login y el JWT ya
    // funcionan tambien en vistas protegidas.
    this.orderService.listMyOrders().subscribe({
      next: (orders) => {
        this.orders.set(orders);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('No se pudieron cargar tus pedidos.');
        this.isLoading.set(false);
      },
    });
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
      case 'under_review':      return 'En revisión';
      case 'quote_sent':        return 'Presupuesto enviado';
      case 'payment_received':  return 'Pago recibido';
      case 'shipped':           return 'Enviado';
      // Legacy: map old statuses safely
      case 'confirmed':         return 'Presupuesto enviado';
      default: return status;
    }
  }

  protected getStatusClass(status: string): string {
    switch (status.trim().toLowerCase()) {
      case 'under_review':      return 'bg-yellow-50 text-yellow-700 border border-yellow-300';
      case 'quote_sent':        return 'bg-blue-50 text-blue-700 border border-blue-200';
      case 'payment_received':  return 'bg-citri-green-light text-citri-green border border-citri-green';
      case 'shipped':           return 'bg-indigo-50 text-indigo-700 border border-indigo-200';
      // Legacy
      case 'confirmed':         return 'bg-blue-50 text-blue-700 border border-blue-200';
      default: return 'bg-citri-gray-100 text-citri-gray-600 border border-citri-gray-300';
    }
  }
}
