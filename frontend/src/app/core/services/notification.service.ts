import { Injectable, signal } from '@angular/core';

export type NotificationKind = 'success' | 'error' | 'info';

export interface NotificationMessage {
  kind: NotificationKind;
  text: string;
}

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  // Dejamos un servicio muy simple para futuras toasts o banners globales.
  readonly message = signal<NotificationMessage | null>(null);

  show(kind: NotificationKind, text: string): void {
    this.message.set({ kind, text });
  }

  showSuccess(text: string): void {
    this.show('success', text);
  }

  showError(text: string): void {
    this.show('error', text);
  }

  showInfo(text: string): void {
    this.show('info', text);
  }

  clear(): void {
    this.message.set(null);
  }
}
