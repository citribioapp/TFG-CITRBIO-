import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProductDetail } from '../../../../core/models/catalog.models';
import { AuthStateService } from '../../../../core/services/auth-state.service';
import { ProductService } from '../../../catalog/services/product.service';
import { CartService } from '../../../cart/services/cart.service';
import { PendingCartService } from '../../../../core/services/pending-cart.service';
import { CartStateService } from '../../../../core/services/cart-state.service';
import { LoginModalComponent } from '../../../../shared/components/login-modal/login-modal.component';
import { environment } from '../../../../../environments/environment';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, LoginModalComponent],
  templateUrl: './product-detail-page.component.html',
  styleUrl: './product-detail-page.component.css',
})
export class ProductDetailPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly productService = inject(ProductService);
  private readonly cartService = inject(CartService);
  private readonly authState = inject(AuthStateService);
  private readonly pendingCart = inject(PendingCartService);
  private readonly cartState = inject(CartStateService);

  protected readonly product = signal<ProductDetail | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly successMessage = signal('');
  protected readonly errorMessage = signal('');
  protected readonly showLoginModal = signal(false);

  /** Query params to pass back to /productos so the correct category is restored */
  protected backQueryParams(): Record<string, string> {
    const category = this.route.snapshot.queryParamMap.get('category');
    return category ? { category } : {};
  }

  /** Label for the back link — uses the product's category name when available */
  protected get backLabel(): string {
    const categoryName =
      this.product()?.category?.name ??
      this.route.snapshot.queryParamMap.get('category') ??
      null;
    return categoryName ? `Volver a ${categoryName}` : 'Volver a productos';
  }

  /** Fragment anchor on /productos for the season calendar of this product's category */
  protected seasonCalendarFragment(): string {
    const name = this.normalizedCategoryName();
    if (name.includes('limon')) return 'temporada-limones';
    if (name.includes('mandarin')) return 'temporada-mandarinas';
    if (name.includes('naranja')) return 'temporada-naranjas';
    return 'productos-section';
  }

  /** CTA label for the season calendar link */
  protected seasonCalendarLabel(): string {
    const name = this.normalizedCategoryName();
    if (name.includes('limon')) return 'Ver temporada del limón';
    if (name.includes('mandarin')) return 'Ver temporada de la mandarina';
    if (name.includes('naranja')) return 'Ver temporada de la naranja';
    return 'Ver calendario de temporada';
  }

  private normalizedCategoryName(): string {
    const raw = this.product()?.category?.name ?? '';
    return raw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  protected readonly form = this.fb.nonNullable.group({
    caliberId: [0, Validators.min(1)],
    qualityId: [0, Validators.min(1)],
    formatId: [0, Validators.min(1)],
    quantity: [1, [Validators.required, Validators.min(1)]],
  });

  constructor() {
    this.route.paramMap.subscribe((params) => {
      const rawId = params.get('id');
      const productId = rawId ? Number(rawId) : null;

      if (!productId || !Number.isFinite(productId)) {
        this.errorMessage.set('Producto no valido.');
        this.isLoading.set(false);
        return;
      }

      this.loadProduct(productId);
    });
  }

  private loadProduct(productId: number): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.productService.getById(productId).subscribe({
      next: (product) => {
        this.product.set(product);
        this.form.patchValue({
          caliberId: product.options.calibers[0]?.id ?? 0,
          qualityId: product.options.qualities[0]?.id ?? 0,
          formatId: product.options.formats[0]?.id ?? 0,
          quantity: 1,
        });
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('No se pudo cargar el producto.');
        this.isLoading.set(false);
      },
    });
  }

  protected addToCart(): void {
    const product = this.product();
    if (!product) return;

    // Block out-of-season products on the frontend too
    if (product.isOutOfSeason) {
      this.errorMessage.set('Esta variedad no está disponible actualmente.');
      return;
    }

    if (
      product.options.calibers.length === 0 ||
      product.options.qualities.length === 0 ||
      product.options.formats.length === 0
    ) {
      this.errorMessage.set('Este producto todavia no tiene todas sus opciones configuradas.');
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage.set('Debes seleccionar todas las opciones del producto.');
      return;
    }

    if (!this.authState.isAuthenticated()) {
      // Save the pending action and show the modal instead of redirecting
      this.pendingCart.save({
        payload: {
          productId: product.id,
          caliberId: this.form.getRawValue().caliberId,
          qualityId: this.form.getRawValue().qualityId,
          formatId: this.form.getRawValue().formatId,
          quantity: this.form.getRawValue().quantity,
        },
        returnUrl: this.router.url,
      });
      this.showLoginModal.set(true);
      return;
    }

    this.executeAddToCart();
  }

  protected onModalConfirm(): void {
    this.showLoginModal.set(false);
    this.router.navigate(['/login'], {
      queryParams: { redirectTo: this.router.url },
    });
  }

  protected onModalCancel(): void {
    this.showLoginModal.set(false);
    // Clear the pending action if user cancels
    this.pendingCart.clear();
  }

  private executeAddToCart(): void {
    const product = this.product();
    if (!product) return;

    this.successMessage.set('');
    this.errorMessage.set('');

    this.cartService
      .addItem({
        productId: product.id,
        caliberId: this.form.getRawValue().caliberId,
        qualityId: this.form.getRawValue().qualityId,
        formatId: this.form.getRawValue().formatId,
        quantity: this.form.getRawValue().quantity,
      })
      .subscribe({
        next: (response) => {
          this.successMessage.set(response.message);
          this.cartState.increment(this.form.getRawValue().quantity);
        },
        error: () => this.errorMessage.set('No se pudo añadir el producto al carrito.'),
      });
  }

  protected resolveImageUrl(imagePath: string): string {
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }
    const baseUrl = environment.apiUrl.replace(/\/api$/, '');
    return `${baseUrl}${imagePath}`;
  }
}