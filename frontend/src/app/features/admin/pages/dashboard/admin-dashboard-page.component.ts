import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminMetricsService, AdminMetrics } from '../../services/admin-metrics.service';
import { AdminOrderSummary } from '../../../../core/models/order.models';
import { AdminOrderService } from '../../services/admin-order.service';
import { forkJoin } from 'rxjs';

@Component({
  standalone: true,
  imports: [RouterLink],
  templateUrl: './admin-dashboard-page.component.html',
})
export class AdminDashboardPageComponent {
  private readonly metricsService = inject(AdminMetricsService);
  private readonly adminOrderService = inject(AdminOrderService);

  protected readonly metrics = signal<AdminMetrics | null>(null);
  protected readonly orders = signal<AdminOrderSummary[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal('');

  protected readonly totalOrdersCount = computed(() => this.orders().length);
  protected readonly statusCounts = computed(() => {
    const counts = {
      under_review: 0,
      quote_sent: 0,
      payment_received: 0,
      shipped: 0,
    };

    for (const order of this.orders()) {
      const status = order.status.trim().toLowerCase();

      if (status === 'under_review') counts.under_review++;
      else if (status === 'quote_sent' || status === 'confirmed') counts.quote_sent++;
      else if (status === 'payment_received') counts.payment_received++;
      else if (status === 'shipped') counts.shipped++;
    }

    return counts;
  });

  constructor() {
    forkJoin({
      metrics: this.metricsService.getMetrics(),
      orders: this.adminOrderService.list(),
    }).subscribe({
      next: ({ metrics, orders }) => {
        this.metrics.set(metrics);
        this.orders.set(orders);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('No se pudieron cargar las métricas.');
        this.isLoading.set(false);
      },
    });
  }

  protected getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      all:              'Todos',
      under_review:     'En revisión',
      quote_sent:       'Presupuesto enviado',
      payment_received: 'Pago recibido',
      shipped:          'Enviados',
      // Legacy
      confirmed:        'Presupuesto enviado',
    };
    return labels[status] || status;
  }

  protected getStatusEntries(): Array<[string, number]> {
    const counts = this.statusCounts();
    const entries: Array<[string, number]> = [
      ['all', this.totalOrdersCount()],
      ['under_review', counts.under_review],
      ['quote_sent', counts.quote_sent],
      ['payment_received', counts.payment_received],
      ['shipped', counts.shipped],
    ];

    return entries.filter(([, count]) => count > 0);
  }
}
