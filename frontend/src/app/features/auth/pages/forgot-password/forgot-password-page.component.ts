import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, NgClass],
  templateUrl: './forgot-password-page.component.html',
})
export class ForgotPasswordPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);

  protected readonly message = signal('');
  protected readonly errorMessage = signal('');

  protected readonly requestForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  isInvalid(field: string): boolean {
    const control = this.requestForm.get(field);
    return !!(control && control.invalid && control.touched);
  }

  submit(): void {
    if (this.requestForm.invalid) {
      this.requestForm.markAllAsTouched();
      return;
    }

    this.message.set('');
    this.errorMessage.set('');

    this.authService.forgotPassword(this.requestForm.getRawValue()).subscribe({
      next: (response) => {
        this.message.set(response.message);
      },
      error: (error) => {
        this.errorMessage.set(
          error.error?.error || 'No se pudo solicitar el restablecimiento de contraseña.',
        );
      },
    });
  }
}
