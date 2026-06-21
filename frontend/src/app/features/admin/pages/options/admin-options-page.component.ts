import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProductOption } from '../../../../core/models/catalog.models';
import { CategoryService } from '../../../catalog/services/category.service';
import {
  AdminProductOptionService,
  ProductOptionType,
  ProductOptionsResponse,
} from '../../services/admin-product-option.service';

interface CategoryChoice {
  id: number;
  name: string;
}

interface ProductChoice {
  id: number;
  name: string;
  description: string | null;
}

// Tracks which single option row is being edited
interface EditingOption {
  type: ProductOptionType;
  id: number;
  name: string; // current input value
}

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './admin-options-page.component.html',
})
export class AdminOptionsPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly categoryService = inject(CategoryService);
  private readonly adminProductOptionService = inject(AdminProductOptionService);

  protected readonly categories = signal<CategoryChoice[]>([]);
  protected readonly products = signal<ProductChoice[]>([]);
  protected readonly isLoadingProducts = signal(false);
  protected readonly productId = signal<number | null>(null);
  protected readonly selectedCategoryId = signal<number | null>(null);
  protected readonly productName = signal('');
  protected readonly options = signal<ProductOptionsResponse | null>(null);
  protected readonly successMessage = signal('');
  protected readonly errorMessage = signal('');

  // Edit state — only one option can be edited at a time across all panels
  protected readonly editingOption = signal<EditingOption | null>(null);
  protected readonly isSavingOption = signal(false);

  protected readonly optionTypes: Array<{
    key: ProductOptionType;
    label: string;
    singleLabel: string;
    helpText: string;
  }> = [
    {
      key: 'calibers',
      label: 'Calibres',
      singleLabel: 'Calibre',
      helpText: 'Anade todos los calibres disponibles para este producto.',
    },
    {
      key: 'qualities',
      label: 'Calidades',
      singleLabel: 'Calidad',
      helpText: 'Anade las calidades que vas a ofrecer en este producto.',
    },
    {
      key: 'formats',
      label: 'Formatos',
      singleLabel: 'Formato',
      helpText: 'Anade los formatos o presentaciones disponibles.',
    },
  ];

  protected readonly forms = {
    calibers: this.fb.nonNullable.group({
      name: ['', Validators.required],
    }),
    qualities: this.fb.nonNullable.group({
      name: ['', Validators.required],
    }),
    formats: this.fb.nonNullable.group({
      name: ['', Validators.required],
    }),
  };

  constructor() {
    this.loadCategories();

    this.route.queryParamMap.subscribe((params) => {
      const rawProductId = params.get('productId');
      const rawCategoryId = params.get('categoryId');
      const productId = rawProductId ? Number(rawProductId) : null;
      const categoryId = rawCategoryId ? Number(rawCategoryId) : null;

      this.selectedCategoryId.set(Number.isFinite(categoryId) ? categoryId : null);
      this.productId.set(Number.isFinite(productId) ? productId : null);

      if (this.selectedCategoryId()) {
        this.loadProducts(this.selectedCategoryId() as number);
      } else {
        this.products.set([]);
      }

      if (this.productId()) {
        this.loadOptions(this.productId() as number);
      } else {
        this.options.set(null);
        this.productName.set('');
      }
    });
  }

  private loadCategories(): void {
    this.categoryService.list().subscribe({
      next: (categories) => {
        this.categories.set(
          categories.map((category) => ({
            id: category.id,
            name: category.name,
          })),
        );
      },
      error: () => this.errorMessage.set('No se pudieron cargar las categorias.'),
    });
  }

  private loadProducts(categoryId: number): void {
    this.isLoadingProducts.set(true);

    this.categoryService.getProducts(categoryId).subscribe({
      next: (response) => {
        this.products.set(response.products);
        this.isLoadingProducts.set(false);

        const selectedProduct = response.products.find((product) => product.id === this.productId());

        if (!selectedProduct && this.productId()) {
          this.productId.set(null);
          this.options.set(null);
          this.productName.set('');
        }
      },
      error: () => {
        this.products.set([]);
        this.isLoadingProducts.set(false);
        this.errorMessage.set('No se pudieron cargar los productos de la categoria.');
      },
    });
  }

  private loadOptions(productId: number): void {
    this.adminProductOptionService.getOptions(productId).subscribe({
      next: (response) => {
        this.options.set(response);
        this.productName.set(response.productName);
      },
      error: () => this.errorMessage.set('No se pudieron cargar las caracteristicas del producto.'),
    });
  }

  protected onCategoryChange(rawCategoryId: string): void {
    const categoryId = rawCategoryId ? Number(rawCategoryId) : null;

    this.successMessage.set('');
    this.errorMessage.set('');

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { categoryId, productId: null },
      queryParamsHandling: 'merge',
    });
  }

  protected onProductChange(rawProductId: string): void {
    const productId = rawProductId ? Number(rawProductId) : null;

    this.successMessage.set('');
    this.errorMessage.set('');

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { productId },
      queryParamsHandling: 'merge',
    });
  }

  protected getOptions(type: ProductOptionType): ProductOption[] {
    const current = this.options();
    if (!current) return [];
    return current[type];
  }

  submit(type: ProductOptionType): void {
    const productId = this.productId();
    const form = this.forms[type];

    if (!productId) {
      this.errorMessage.set('Debes seleccionar un producto.');
      return;
    }

    if (form.invalid) {
      form.markAllAsTouched();
      this.errorMessage.set('El nombre de la caracteristica es obligatorio.');
      return;
    }

    this.successMessage.set('');
    this.errorMessage.set('');

    this.adminProductOptionService.create(productId, type, form.getRawValue().name).subscribe({
      next: () => {
        this.successMessage.set('Caracteristica anadida correctamente.');
        form.reset({ name: '' });
        this.loadOptions(productId);
      },
      error: () => this.errorMessage.set('No se pudo anadir la caracteristica.'),
    });
  }

  protected removeOption(type: ProductOptionType, optionId: number): void {
    const productId = this.productId();
    if (!productId) return;

    this.successMessage.set('');
    this.errorMessage.set('');

    this.adminProductOptionService.delete(productId, type, optionId).subscribe({
      next: () => {
        this.successMessage.set('Caracteristica eliminada correctamente.');
        this.loadOptions(productId);
      },
      error: () => this.errorMessage.set('No se pudo eliminar la caracteristica.'),
    });
  }

  // ── Edit option ──────────────────────────────────────────────────────────

  protected startEditOption(type: ProductOptionType, option: ProductOption): void {
    this.editingOption.set({ type, id: option.id, name: option.name });
  }

  protected cancelEditOption(): void {
    this.editingOption.set(null);
  }

  protected isEditingOption(type: ProductOptionType, optionId: number): boolean {
    const e = this.editingOption();
    return e !== null && e.type === type && e.id === optionId;
  }

  protected onEditNameInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    const current = this.editingOption();
    if (current) {
      this.editingOption.set({ ...current, name: value });
    }
  }

  protected saveEditOption(): void {
    const productId = this.productId();
    const editing = this.editingOption();

    if (!productId || !editing) return;

    const name = editing.name.trim();
    if (!name) {
      this.errorMessage.set('El nombre no puede estar vacío.');
      return;
    }

    this.isSavingOption.set(true);
    this.successMessage.set('');
    this.errorMessage.set('');

    this.adminProductOptionService.update(productId, editing.type, editing.id, name).subscribe({
      next: (updated) => {
        this.isSavingOption.set(false);
        this.editingOption.set(null);
        this.successMessage.set('Característica actualizada correctamente.');
        // Update local state without a full reload
        this.options.update((opts) => {
          if (!opts) return opts;
          return {
            ...opts,
            [editing.type]: opts[editing.type].map((o) =>
              o.id === editing.id ? { ...o, name: updated.name } : o,
            ),
          };
        });
        setTimeout(() => this.successMessage.set(''), 3000);
      },
      error: () => {
        this.isSavingOption.set(false);
        this.errorMessage.set('No se pudo actualizar la característica.');
        setTimeout(() => this.errorMessage.set(''), 4000);
      },
    });
  }
}
