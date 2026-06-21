import { ChangeDetectionStrategy, Component, EventEmitter, inject, Input, Output, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthStateService } from '../../../core/services/auth-state.service';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './product-card.component.html',
  styleUrl: './product-card.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductCardComponent {
  private readonly router = inject(Router);
  private readonly authState = inject(AuthStateService);

  @Input({ required: true }) name = '';
  @Input() description: string | null = null;
  @Input() image: string | null = null;
  @Input({ required: true }) productId: number = 0;
  /** Slug of the category this card belongs to — passed through to the detail URL */
  @Input() categorySlug: string | null = null;
  @Input() isOutOfSeason = false;
  @Output() addToCart = new EventEmitter<number>();

  imageError = signal(false);

  readonly isAdmin = this.authState.isAdmin;

  onImageError(): void {
    this.imageError.set(true);
  }

  onAddToCart(event: MouseEvent): void {
    event.stopPropagation();
    event.preventDefault();
    if (this.addToCart.observed) {
      this.addToCart.emit(this.productId);
    } else {
      this.router.navigate(['/productos', this.productId], {
        queryParams: this.categorySlug ? { category: this.categorySlug } : {},
      });
    }
  }

  onEditProduct(event: MouseEvent): void {
    event.stopPropagation();
    event.preventDefault();
    this.router.navigate(['/admin/productos-admin'], {
      queryParams: this.categorySlug ? { category: this.categorySlug } : {},
    });
  }
}
