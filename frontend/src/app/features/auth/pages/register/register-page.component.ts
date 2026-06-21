import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgClass } from '@angular/common';
import { AuthService } from '../../../../core/services/auth.service';
import { PendingCartService } from '../../../../core/services/pending-cart.service';
import { CartService } from '../../../cart/services/cart.service';
import { CartStateService } from '../../../../core/services/cart-state.service';
import { PhonePrefixSelectorComponent } from '../../../../shared/components/phone-prefix-selector/phone-prefix-selector.component';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, NgClass, PhonePrefixSelectorComponent],
  templateUrl: './register-page.component.html',
})
export class RegisterPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly route = inject(ActivatedRoute);
  private readonly pendingCart = inject(PendingCartService);
  private readonly cartService = inject(CartService);
  private readonly cartState = inject(CartStateService);

  protected readonly message = signal('');
  protected readonly errorMessage = signal('');
  protected readonly showPassword = signal(false);
  protected readonly showRepeatPassword = signal(false);

  protected readonly form = this.fb.nonNullable.group(
    {
      name: ['', [Validators.required, Validators.maxLength(100)]],
      lastName: ['', [Validators.required, Validators.maxLength(150)]],
      dni: ['', [Validators.required, Validators.pattern(/^\d{8}[A-Za-z]$/)]],
      email: ['', [Validators.required, Validators.email]],
      deliveryAddress: ['', [Validators.required, Validators.maxLength(255)]],
      phonePrefix: ['+34', Validators.required],
      phoneNumber: ['', [Validators.required, Validators.pattern(/^\d{9}$/)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      repeatPassword: ['', Validators.required],
      privacy: [false, Validators.requiredTrue],
    },
    { validators: this.passwordsMatchValidator },
  );

  private passwordsMatchValidator(group: AbstractControl) {
    const password = group.get('password')?.value;
    const repeatPassword = group.get('repeatPassword')?.value;
    return password === repeatPassword ? null : { passwordsMismatch: true };
  }

  togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  toggleRepeatPassword(): void {
    this.showRepeatPassword.update((v) => !v);
  }

  /** Strip any non-digit characters typed into the phone number field */
  onPhoneInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').slice(0, 9);
    input.value = digits;
    this.form.get('phoneNumber')?.setValue(digits, { emitEvent: false });
  }

  isInvalid(field: string): boolean {
    return !!(this.form.get(field)?.invalid && this.form.get(field)?.touched);
  }

  get passwordsMismatch(): boolean {
    return !!(this.form.errors?.['passwordsMismatch'] && this.form.get('repeatPassword')?.touched);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage.set('Debes completar todos los campos obligatorios.');
      return;
    }

    this.message.set('');
    this.errorMessage.set('');

    const { repeatPassword, privacy, phonePrefix, phoneNumber, ...rest } = this.form.getRawValue();
    const registerData = { ...rest, phone: `${phonePrefix}${phoneNumber}` };

    this.authService.register(registerData).subscribe({
      next: () => {
        // Registration succeeded — auto-login with the same credentials
        this.authService.login({ email: registerData.email, password: registerData.password }).subscribe({
          next: (user) => {
            // Handle pending cart action (e.g. user was adding to cart before registering)
            const pending = this.pendingCart.get();
            if (pending) {
              this.cartService.addItem(pending.payload).subscribe({
                next: () => {
                  this.cartState.increment(pending.payload.quantity);
                  this.pendingCart.clear();
                  this.router.navigateByUrl(pending.returnUrl);
                },
                error: () => {
                  this.pendingCart.clear();
                  this.router.navigateByUrl(pending.returnUrl);
                },
              });
              return;
            }

            // Redirect to previous page, admin panel, or home
            const redirectTo = this.route.snapshot.queryParamMap.get('redirectTo');
            const targetRoute = user.roles.includes('ROLE_ADMIN')
              ? '/admin'
              : redirectTo || '/';
            this.router.navigateByUrl(targetRoute);
          },
          error: () => {
            // Auto-login failed (unlikely) — fall back to login page
            this.router.navigateByUrl('/login');
          },
        });
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage.set(this.resolveRegisterError(error));
      },
    });
  }

  private resolveRegisterError(error: HttpErrorResponse): string {
    if (error.status === 0) {
      return 'No se pudo conectar con el servidor. Comprueba tu conexión a internet.';
    }
    if (error.status === 409) {
      // Backend returns { error: "Ya existe un usuario con ese email." }
      // or { error: "Ya existe un usuario con ese DNI." }
      return error.error?.error || 'Este email o DNI ya está registrado.';
    }
    if (error.status === 400) {
      // Backend returns { errors: string[] } for validation failures
      if (Array.isArray(error.error?.errors) && error.error.errors.length > 0) {
        return (error.error.errors as string[]).join(' ');
      }
      return error.error?.error || 'Los datos introducidos no son válidos.';
    }
    if (error.status >= 500) {
      return 'Ha ocurrido un error interno en el servidor. Inténtalo de nuevo más tarde.';
    }
    return error.error?.error || 'No se pudo completar el registro. Inténtalo de nuevo.';
  }
}
