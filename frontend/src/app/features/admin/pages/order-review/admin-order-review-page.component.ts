import { DOCUMENT } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminOrderSummary, CustomerOrderItemSummary } from '../../../../core/models/order.models';
import { AdminOrderService } from '../../services/admin-order.service';
import { NotificationService } from '../../../../core/services/notification.service';

/** Working copy of an order item with an editable unit price */
interface ReviewItem extends CustomerOrderItemSummary {
  unitPriceInput: string; // string so the input can be empty/partial while typing
}

@Component({
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './admin-order-review-page.component.html',
})
export class AdminOrderReviewPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly adminOrderService = inject(AdminOrderService);
  private readonly notificationService = inject(NotificationService);
  private readonly document = inject(DOCUMENT);

  protected readonly order = signal<AdminOrderSummary | null>(null);
  protected readonly reviewItems = signal<ReviewItem[]>([]);
  protected readonly shippingInput = signal('');

  protected readonly isLoading = signal(true);
  protected readonly isSubmitting = signal(false);
  protected readonly loadError = signal('');
  protected readonly submitError = signal('');
  protected readonly successMessage = signal('');
  protected readonly isShippingStage = computed(() => this.order()?.status?.trim().toLowerCase() === 'payment_received');
  protected readonly isShipped = computed(() => this.order()?.status?.trim().toLowerCase() === 'shipped');
  protected readonly pageDescription = computed(() =>
    this.isShipped()
      ? 'Este pedido ya ha sido enviado al cliente.'
      : this.isShippingStage()
      ? 'Revisa el pedido final y envíalo al cliente.'
      : 'Añade los precios y envía el presupuesto al cliente.',
  );
  protected readonly submitButtonLabel = computed(() =>
    this.isShippingStage() ? 'Enviar pedido al cliente' : 'Enviar presupuesto al cliente',
  );

  // ── Decimal parsing helper ───────────────────────────────────────────────
  // Accepts both dot (5.00) and comma (5,00) decimal separators.
  // Returns NaN for empty or non-numeric strings.
  private parseDecimal(value: string): number {
    if (value == null) return NaN;
    const normalised = String(value).trim().replace(',', '.');
    if (normalised === '') return NaN;
    return parseFloat(normalised);
  }

  // ── Computed totals ──────────────────────────────────────────────────────

  protected readonly productsSubtotal = computed(() => {
    return this.reviewItems().reduce((sum, item) => {
      const price = this.parseDecimal(item.unitPriceInput);
      if (isNaN(price) || price < 0) return sum;
      return sum + price * (item.quantity ?? 1);
    }, 0);
  });

  protected readonly shippingCost = computed(() => {
    const v = this.parseDecimal(this.shippingInput());
    return isNaN(v) || v <= 0 ? 0 : v;
  });

  protected readonly total = computed(() => this.productsSubtotal() + this.shippingCost());

  // ── Validation ───────────────────────────────────────────────────────────

  protected readonly validationErrors = computed(() => {
    const errors: string[] = [];

    for (const item of this.reviewItems()) {
      const price = this.parseDecimal(item.unitPriceInput);
      if (item.unitPriceInput.trim() === '' || isNaN(price) || price < 0) {
        errors.push(`Introduce un precio válido para "${item.product}".`);
      }
    }

    const shipping = this.parseDecimal(this.shippingInput());
    if (this.shippingInput().trim() === '' || isNaN(shipping) || shipping <= 0) {
      errors.push('Introduce un coste de envío válido.');
    }

    return errors;
  });

  protected readonly isValid = computed(() => this.validationErrors().length === 0);

  // ── Lifecycle ────────────────────────────────────────────────────────────

  constructor() {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    if (!id || isNaN(id)) {
      this.loadError.set('ID de pedido no válido.');
      this.isLoading.set(false);
      return;
    }

    this.adminOrderService.get(id).subscribe({
      next: (order) => {
        this.order.set(order);

        // Pre-fill unit prices if the order already has them (e.g. re-opening)
        const items: ReviewItem[] = (order.items ?? []).map((item) => ({
          ...item,
          unitPriceInput: item.unitPrice != null ? String(item.unitPrice) : '',
        }));
        this.reviewItems.set(items);

        if (order.shippingPrice != null && order.shippingPrice !== 0) {
          this.shippingInput.set(String(order.shippingPrice));
        }

        this.isLoading.set(false);
      },
      error: () => {
        this.loadError.set('No se pudo cargar el pedido.');
        this.isLoading.set(false);
      },
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  protected lineSubtotal(item: ReviewItem): number {
    const price = this.parseDecimal(item.unitPriceInput);
    if (isNaN(price) || price < 0) return 0;
    return price * (item.quantity ?? 1);
  }

  protected updateItemPrice(index: number, value: string): void {
    this.reviewItems.update((items) => {
      const updated = [...items];
      updated[index] = { ...updated[index], unitPriceInput: value ?? '' };
      return updated;
    });
  }

  /** Blur the input on Enter key — confirms the value without submitting the form. */
  protected onPriceKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      (event.target as HTMLElement).blur();
    }
  }

  protected getStatusLabel(status: string): string {
    switch (status.trim().toLowerCase()) {
      case 'under_review':      return 'En revisión';
      case 'quote_sent':        return 'Presupuesto enviado';
      case 'payment_received':  return 'Pago recibido';
      case 'shipped':           return 'Enviado';
      case 'confirmed':         return 'Presupuesto enviado';
      default:                  return status;
    }
  }

  protected getStatusClass(status: string): string {
    switch (status.trim().toLowerCase()) {
      case 'under_review':      return 'bg-yellow-50 text-yellow-700 border border-yellow-300';
      case 'quote_sent':        return 'bg-blue-50 text-blue-700 border border-blue-200';
      case 'payment_received':  return 'bg-citri-green-light text-citri-green border border-citri-green';
      case 'shipped':           return 'bg-purple-50 text-purple-700 border border-purple-200';
      case 'confirmed':         return 'bg-blue-50 text-blue-700 border border-blue-200';
      default:                  return 'bg-citri-gray-100 text-citri-gray-600 border border-citri-gray-300';
    }
  }

  protected formatCurrency(value: number): string {
    return value.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
  }

  protected formatDate(dateStr: string): string {
    try {
      return new Date(dateStr).toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
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

  // ── Submit ───────────────────────────────────────────────────────────────

  protected submit(): void {
    if (!this.isValid() || this.isSubmitting()) return;

    this.submitError.set('');
    this.isSubmitting.set(true);

    const orderId = this.order()!.id;

    if (this.isShippingStage()) {
      this.adminOrderService.updateStatus(orderId, 'shipped').subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.order.update((o) => o ? { ...o, status: 'shipped' } : o);
          this.successMessage.set('Pedido enviado correctamente al cliente.');
          this.notificationService.showSuccess('Pedido enviado correctamente');
          this.scrollToTopAlert();
        },
        error: (err) => {
          this.isSubmitting.set(false);
          const msg = err?.error?.error ?? 'No se pudo enviar el pedido. Inténtalo de nuevo.';
          this.submitError.set(msg);
          this.scrollToTopAlert();
        },
      });
      return;
    }

    // Normalise comma decimals to dot decimals before sending to backend
    const payload = {
      items: this.reviewItems().map((item) => ({
        orderItemId: item.id,
        unitPrice: this.parseDecimal(item.unitPriceInput),
      })),
      shippingPrice: this.parseDecimal(this.shippingInput()),
    };

    this.adminOrderService.sendQuote(orderId, payload).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        // Update the local order status so the badge reflects the new state
        this.order.update((o) => o ? { ...o, status: 'quote_sent' } : o);
        this.successMessage.set(
          res.warning
            ? res.warning
            : res.emailSent
              ? 'Presupuesto enviado correctamente al cliente.'
              : 'Presupuesto guardado. No se pudo enviar el email al cliente.',
        );
        this.notificationService.showSuccess('Presupuesto enviado correctamente');
        this.scrollToTopAlert();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        const msg = err?.error?.error ?? 'No se pudo enviar el presupuesto. Inténtalo de nuevo.';
        this.submitError.set(msg);
        this.scrollToTopAlert();
      },
    });
  }
}
