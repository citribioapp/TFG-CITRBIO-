import { Component, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';

export const passwordsMatchValidator: ValidatorFn = (
  group: AbstractControl,
): ValidationErrors | null => {
  const password = group.get('newPassword')?.value ?? '';
  const confirm = group.get('confirmPassword')?.value ?? '';
  return password === confirm ? null : { passwordsMismatch: true };
};

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, NgClass],
  templateUrl: './reset-password-page.component.html',
})
export class ResetPasswordPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly message = signal('');
  protected readonly errorMessage = signal('');
  protected readonly showPassword = signal(false);
  protected readonly showRepeatPassword = signal(false);
  protected readonly isSubmitting = signal(false);

  // token is a 6-digit OTP code entered manually by the user (sent by email)
  protected readonly form = this.fb.nonNullable.group(
    {
      token: [
        '',
        [
          Validators.required,
          Validators.pattern(/^\d{6}$/),
        ],
      ],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordsMatchValidator },
  );

  isInvalid(field: string): boolean {
    return !!(this.form.get(field)?.invalid && this.form.get(field)?.touched);
  }

  get passwordsMismatch(): boolean {
    return !!(
      this.form.hasError('passwordsMismatch') &&
      this.form.get('confirmPassword')?.touched
    );
  }

  protected togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  protected toggleRepeatPassword(): void {
    this.showRepeatPassword.update((v) => !v);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.message.set('');
    this.errorMessage.set('');

    const { token, newPassword } = this.form.getRawValue();

    this.authService.resetPassword({ token, newPassword }).subscribe({
      next: (response) => {
        this.isSubmitting.set(false);
        this.message.set(response.message);
        setTimeout(() => this.router.navigate(['/login']), 1500);
      },
      error: (error) => {
        this.isSubmitting.set(false);
        const single = error.error?.error;
        const multiple = Array.isArray(error.error?.errors)
          ? (error.error.errors as string[]).join(' ')
          : null;
        this.errorMessage.set(single || multiple || 'No se pudo restablecer la contraseña.');
      },
    });
  }
}
