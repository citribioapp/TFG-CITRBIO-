import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';

interface OrderSummary {
  orderId: number;
  customerName: string;
  totalPrice: number;
  transferReference: string;
  status: string;
}

@Component({
  standalone: true,
  imports: [],
  templateUrl: './payment-proof-page.component.html',
})
export class PaymentProofPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);

  protected readonly orderId = signal<number | null>(null);
  protected readonly token = signal('');
  protected readonly summary = signal<OrderSummary | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly tokenError = signal(false);
  protected readonly selectedFile = signal<File | null>(null);
  protected readonly selectedFileName = signal('');
  protected readonly fileError = signal('');
  protected readonly isSubmitting = signal(false);
  protected readonly submitted = signal(false);
  protected readonly submitError = signal('');

  protected readonly logoUrl = 'https://citribio-frontend.vercel.app/Citribio.png';

  constructor() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    const token = this.route.snapshot.queryParamMap.get('token') ?? '';

    this.orderId.set(id || null);
    this.token.set(token);

    if (!id || !token) {
      this.tokenError.set(true);
      this.isLoading.set(false);
      return;
    }

    this.http
      .get<OrderSummary>(`${environment.apiUrl}/orders/${id}/payment-proof?token=${encodeURIComponent(token)}`)
      .subscribe({
        next: (data) => {
          this.summary.set(data);
          this.isLoading.set(false);
        },
        error: () => {
          this.tokenError.set(true);
          this.isLoading.set(false);
        },
      });
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.fileError.set('');

    if (!file) {
      this.selectedFile.set(null);
      this.selectedFileName.set('');
      return;
    }

    const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowed.includes(file.type)) {
      this.fileError.set('Solo se permiten archivos PDF, JPG o PNG.');
      this.selectedFile.set(null);
      this.selectedFileName.set('');
      return;
    }

    const maxBytes = 5 * 1024 * 1024; // 5 MB
    if (file.size > maxBytes) {
      this.fileError.set('El archivo no puede superar los 5 MB.');
      this.selectedFile.set(null);
      this.selectedFileName.set('');
      return;
    }

    this.selectedFile.set(file);
    this.selectedFileName.set(file.name);
  }

  protected submit(): void {
    const file = this.selectedFile();
    const id = this.orderId();
    const token = this.token();

    if (!file) {
      this.fileError.set('Debes seleccionar un archivo antes de enviar.');
      return;
    }

    if (!id || !token) return;

    this.isSubmitting.set(true);
    this.submitError.set('');

    const formData = new FormData();
    formData.append('proof', file);

    this.http
      .post<{ message: string }>(
        `${environment.apiUrl}/orders/${id}/payment-proof?token=${encodeURIComponent(token)}`,
        formData,
      )
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.submitted.set(true);
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.submitError.set(
            err?.error?.error ?? 'No se pudo enviar el justificante. Inténtalo de nuevo.',
          );
        },
      });
  }

  protected formatCurrency(value: number): string {
    return value.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
  }
}
