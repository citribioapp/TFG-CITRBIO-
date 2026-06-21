import { Component, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { PendingCartService } from '../../../../core/services/pending-cart.service';
import { CartService } from '../../../cart/services/cart.service';
import { CartStateService } from '../../../../core/services/cart-state.service';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, NgClass],
  templateUrl: './login-page.component.html',
})
export class LoginPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly route = inject(ActivatedRoute);
  private readonly pendingCart = inject(PendingCartService);
  private readonly cartService = inject(CartService);
  private readonly cartState = inject(CartStateService);

  protected readonly errorMessage = signal('');
  protected readonly showPassword = signal(false);
  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage.set('Debes completar el email y la contraseña.');
      return;
    }

    this.errorMessage.set('');

    this.authService.login(this.form.getRawValue()).subscribe({
      next: (user) => {
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

        const redirectTo = this.route.snapshot.queryParamMap.get('redirectTo');
        const targetRoute = redirectTo || (user.roles.includes('ROLE_ADMIN') ? '/admin' : '/mi-cuenta');
        this.router.navigateByUrl(targetRoute);
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage.set(this.resolveLoginError(error));
      },
    });
  }

  private resolveLoginError(error: HttpErrorResponse): string {
    if (error.status === 0) {
      return 'No se pudo conectar con el servidor. Comprueba tu conexión a internet.';
    }
    if (error.status === 401) {
      return 'El email o la contraseña no son correctos.';
    }
    if (error.status === 429) {
      return 'Demasiados intentos. Espera unos minutos antes de volver a intentarlo.';
    }
    if (error.status >= 500) {
      return 'Ha ocurrido un error interno en el servidor. Inténtalo de nuevo más tarde.';
    }
    // Try to extract a message from the backend body
    const msg = error.error?.message || error.error?.error;
    if (msg && typeof msg === 'string') return msg;
    return 'No se pudo iniciar sesión. Inténtalo de nuevo.';
  }

  protected togglePasswordVisibility(): void {
    this.showPassword.update((value) => !value);
  }

  isInvalid(field: string): boolean {
    return !!(this.form.get(field)?.invalid && this.form.get(field)?.touched);
  }
}
