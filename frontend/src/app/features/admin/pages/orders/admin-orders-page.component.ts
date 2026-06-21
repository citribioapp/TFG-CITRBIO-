import { DOCUMENT } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminOrderSummary } from '../../../../core/models/order.models';
import { AdminOrderService } from '../../services/admin-order.service';
import { NotificationService } from '../../../../core/services/notification.service';

type FilterStatus = 'all' | 'under_review' | 'quote_sent' | 'payment_received' | 'shipped';

interface StatusFilter {
  key: FilterStatus;
  label: string;
}

interface ActionConfig {
  label: string;
  /** routerLink segments — null means no navigation (view-only fallback) */
  link: (string | number)[] | null;
  /** Tailwind classes for the button */
  classes: string;
}

@Component({
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './admin-orders-page.component.html',
})
export class AdminOrdersPageComponent {
  private readonly adminOrderService = inject(AdminOrderService);
  private readonly notificationService = inject(NotificationService);
  private readonly document = inject(DOCUMENT);

  protected readonly orders = signal<AdminOrderSummary[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly expandedOrderIds = signal<number[]>([]);
  protected readonly updatingOrderIds = signal<number[]>([]);

  /** Currently active filter tab */
  protected readonly activeFilter = signal<FilterStatus>('all');

  /** Free-text search query */
  protected readonly searchQuery = signal('');

  /** Filter tabs definition — order matches the workflow */
  protected readonly statusFilters: StatusFilter[] = [
    { key: 'all',              label: 'Todos' },
    { key: 'under_review',     label: 'En revisión' },
    { key: 'quote_sent',       label: 'Presupuesto enviado' },
    { key: 'payment_received', label: 'Pago recibido' },
    { key: 'shipped',          label: 'Enviado' },
  ];

  /** Orders visible in the list after applying status filter + search query */
  protected readonly filteredOrders = computed(() => {
    const filter = this.activeFilter();
    const query = this.searchQuery().trim().toLowerCase();
    const all = this.orders();

    // 1. Apply status filter
    const byStatus = filter === 'all'
      ? all
      : all.filter((o) => {
          const s = o.status.trim().toLowerCase();
          if (filter === 'quote_sent') return s === 'quote_sent' || s === 'confirmed';
          return s === filter;
        });

    // 2. Apply search query (order ID, customer name, email, phone)
    if (!query) return byStatus;

    return byStatus.filter((o) => {
      if (String(o.id).includes(query)) return true;
      if (o.customer.name?.toLowerCase().includes(query)) return true;
      if (o.customer.email?.toLowerCase().includes(query)) return true;
      if (o.customer.phone?.toLowerCase().includes(query)) return true;
      return false;
    });
  });

  /** Count of orders per filter key */
  protected readonly statusCounts = computed(() => {
    const all = this.orders();
    const counts: Record<FilterStatus, number> = {
      all:              all.length,
      under_review:     0,
      quote_sent:       0,
      payment_received: 0,
      shipped:          0,
    };
    for (const o of all) {
      const s = o.status.trim().toLowerCase() as FilterStatus;
      if (s === 'under_review')     counts.under_review++;
      else if (s === 'quote_sent' || s === ('confirmed' as string)) counts.quote_sent++;
      else if (s === 'payment_received') counts.payment_received++;
      else if (s === 'shipped')     counts.shipped++;
    }
    return counts;
  });

  constructor() {
    this.loadOrders();
  }

  private loadOrders(): void {
    this.isLoading.set(true);
    this.adminOrderService.list().subscribe({
      next: (orders) => {
        this.orders.set(orders);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('No se pudieron cargar los pedidos.');
        this.isLoading.set(false);
      },
    });
  }

  protected setFilter(key: FilterStatus): void {
    this.activeFilter.set(key);
    this.expandedOrderIds.set([]);
  }

  protected clearSearch(): void {
    this.searchQuery.set('');
  }

  protected readonly hasActiveFilters = computed(
    () => this.activeFilter() !== 'all' || this.searchQuery().trim() !== '',
  );

  protected toggleOrder(orderId: number): void {
    this.expandedOrderIds.update((ids) =>
      ids.includes(orderId) ? ids.filter((id) => id !== orderId) : [...ids, orderId],
    );
  }

  protected isExpanded(orderId: number): boolean {
    return this.expandedOrderIds().includes(orderId);
  }

  private scrollToTopAlert(): void {
    setTimeout(() => {
      const pageTopElement = this.document.querySelector('[data-order-page-top]');
      const alertElement = this.document.querySelector('[data-order-alert]');

      if (pageTopElement instanceof HTMLElement) {
        pageTopElement.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
        return;
      }

      if (alertElement instanceof HTMLElement) {
        alertElement.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
        return;
      }

      this.document.defaultView?.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    }, 100);
  }

  protected isUpdating(orderId: number): boolean {
    return this.updatingOrderIds().includes(orderId);
  }

  protected onStatusChange(orderId: number, event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    const newStatus = selectElement.value;

    if (!newStatus) return;

    this.updatingOrderIds.update((ids) => [...ids, orderId]);

    this.adminOrderService.updateStatus(orderId, newStatus).subscribe({
      next: () => {
        this.notificationService.showSuccess('Estado actualizado correctamente');
        this.updatingOrderIds.update((ids) => ids.filter((id) => id !== orderId));
        this.orders.update((orders) =>
          orders.map((order) =>
            order.id === orderId ? { ...order, status: newStatus } : order,
          ),
        );
        this.scrollToTopAlert();
      },
      error: () => {
        this.notificationService.showError('No se pudo actualizar el estado');
        this.updatingOrderIds.update((ids) => ids.filter((id) => id !== orderId));
        this.loadOrders();
        this.scrollToTopAlert();
      },
    });
  }

  protected getStatusLabel(status: string): string {
    switch (status.trim().toLowerCase()) {
      case 'under_review':     return 'En revisión';
      case 'quote_sent':       return 'Presupuesto enviado';
      case 'confirmed':        return 'Presupuesto enviado';
      case 'payment_received': return 'Pago recibido';
      case 'shipped':          return 'Enviado';
      default:                 return status;
    }
  }

  protected getStatusClass(status: string): string {
    switch (status.trim().toLowerCase()) {
      case 'under_review':     return 'bg-amber-50 text-amber-700 border border-amber-300';
      case 'quote_sent':
      case 'confirmed':        return 'bg-blue-50 text-blue-700 border border-blue-200';
      case 'payment_received': return 'bg-green-50 text-green-700 border border-green-300';
      case 'shipped':          return 'bg-slate-100 text-slate-700 border border-slate-300';
      default:                 return 'bg-citri-gray-100 text-citri-gray-600 border border-citri-gray-300';
    }
  }

  /**
   * Returns the primary action button config for a given order status.
   * The link is null for statuses that have no dedicated page yet.
   */
  protected getActionConfig(order: AdminOrderSummary): ActionConfig {
    switch (order.status.trim().toLowerCase()) {
      case 'under_review':
        return {
          label: 'Revisar y añadir precios',
          link: ['/admin/pedidos', order.id, 'revisar'],
          classes:
            'inline-flex items-center gap-1.5 rounded-citri-md bg-citri-orange px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-citri-orange-dark transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-citri-orange focus-visible:ring-offset-1',
        };
      case 'quote_sent':
      case 'confirmed':
        return {
          label: 'Ver presupuesto',
          link: ['/admin/pedidos', order.id, 'revisar'],
          classes:
            'inline-flex items-center gap-1.5 rounded-citri-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1',
        };
      case 'payment_received':
        return {
          label: 'Preparar envío',
          link: ['/admin/pedidos', order.id, 'revisar'],
          classes:
            'inline-flex items-center gap-1.5 rounded-citri-md bg-[#80ba1b] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#6da016] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#80ba1b] focus-visible:ring-offset-1',
        };
      case 'shipped':
        return {
          label: 'Ver pedido',
          link: ['/admin/pedidos', order.id, 'revisar'],
          classes:
            'inline-flex items-center gap-1.5 rounded-citri-md bg-slate-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-1',
        };
      default:
        return {
          label: 'Ver pedido',
          link: ['/admin/pedidos', order.id, 'revisar'],
          classes:
            'inline-flex items-center gap-1.5 rounded-citri-md bg-citri-gray-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-citri-gray-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-citri-gray-500 focus-visible:ring-offset-1',
        };
    }
  }

  /** Format a date string to a readable locale format */
  protected formatDate(dateStr: string): string {
    try {
      return new Date(dateStr).toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  }

  /** Format a number as euros */
  protected formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
    }).format(value);
  }
}
