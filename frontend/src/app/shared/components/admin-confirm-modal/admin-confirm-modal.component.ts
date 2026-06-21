import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-admin-confirm-modal',
  standalone: true,
  templateUrl: './admin-confirm-modal.component.html',
})
export class AdminConfirmModalComponent {
  title = input('Confirmar acción');
  message = input('¿Estás seguro de que quieres continuar?');
  confirmLabel = input('Confirmar');
  cancelLabel = input('Cancelar');
  destructive = input(false);
  loading = input(false);

  confirmed = output<void>();
  cancelled = output<void>();
}
