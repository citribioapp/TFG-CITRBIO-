import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  CategoryProductsResponse,
  CategoryWithProducts,
  ProductImage,
} from '../../../../core/models/catalog.models';
import { CategoryService } from '../../../catalog/services/category.service';
import { AdminProductService } from '../../services/admin-product.service';
import { environment } from '../../../../../environments/environment';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './admin-products-page.component.html',
})
export class AdminProductsPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly categoryService = inject(CategoryService);
  private readonly adminProductService = inject(AdminProductService);

  protected readonly categories = signal<CategoryWithProducts[]>([]);
  protected readonly selectedCategoryId = signal<number | null>(null);
  protected readonly selectedCategoryName = signal('');
  protected readonly selectedProductId = signal<number | null>(null);
  protected readonly selectedProductImages = signal<ProductImage[]>([]);
  protected readonly products = signal<CategoryProductsResponse['products']>([]);
  protected readonly isLoading = signal(true);
  protected readonly uploadingImage = signal(false);
  protected readonly successMessage = signal('');
  protected readonly errorMessage = signal('');
  protected readonly selectedFileName = signal('');
  private selectedFile: File | null = null;
  protected readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    description: [''],
  });

  constructor() {
    this.loadCategories();

    this.route.queryParamMap.subscribe((params) => {
      const rawCategoryId = params.get('categoryId');
      const categoryId = rawCategoryId ? Number(rawCategoryId) : null;

      this.selectedCategoryId.set(Number.isFinite(categoryId) ? categoryId : null);
      this.syncSelectedCategoryName();

      if (this.selectedCategoryId()) {
        this.loadProducts(this.selectedCategoryId() as number);
      } else {
        this.products.set([]);
        this.selectedProductId.set(null);
        this.selectedProductImages.set([]);
        this.isLoading.set(false);
      }
    });
  }

  private loadCategories(): void {
    this.categoryService.list().subscribe({
      next: (categories) => {
        this.categories.set(categories);
        this.syncSelectedCategoryName();
      },
      error: () => this.errorMessage.set('No se pudieron cargar las categorias.'),
    });
  }

  private syncSelectedCategoryName(): void {
    const currentId = this.selectedCategoryId();
    const category = this.categories().find((item) => item.id === currentId);
    this.selectedCategoryName.set(category?.name ?? '');
  }

  private loadProducts(categoryId: number): void {
    this.isLoading.set(true);

    this.categoryService.getProducts(categoryId).subscribe({
      next: (response) => {
        this.products.set(response.products);
        this.selectedCategoryName.set(response.category.name);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('No se pudieron cargar los productos de la categoria.');
        this.isLoading.set(false);
      },
    });
  }

  protected onCategoryChange(rawCategoryId: string): void {
    const categoryId = rawCategoryId ? Number(rawCategoryId) : null;

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { categoryId },
      queryParamsHandling: 'merge',
    });
  }

  protected toggleImageManager(productId: number): void {
    if (this.selectedProductId() === productId) {
      this.selectedProductId.set(null);
      this.selectedProductImages.set([]);
      this.selectedFile = null;
      return;
    }

    this.selectedProductId.set(productId);
    this.selectedProductImages.set([]);
    this.selectedFile = null;
    this.loadImages(productId);
  }

  protected onFileSelected(productId: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    if (this.selectedProductId() !== productId) {
      this.selectedProductId.set(productId);
    }

    this.selectedFile = file;
    this.selectedFileName.set(file?.name ?? '');
    this.successMessage.set('');

    if (file) {
      this.errorMessage.set('');
    }
  }

  protected openFilePicker(input: HTMLInputElement): void {
    input.click();
  }

  protected uploadSelectedImage(productId: number): void {
    if (!this.selectedFile) {
      this.errorMessage.set('Debes seleccionar una imagen antes de subirla.');
      return;
    }

    this.uploadingImage.set(true);
    this.successMessage.set('');
    this.errorMessage.set('');

    this.adminProductService.uploadImage(productId, this.selectedFile).subscribe({
      next: () => {
        this.successMessage.set('Imagen subida correctamente.');
        this.selectedFile = null;
        this.selectedFileName.set('');
        this.uploadingImage.set(false);
        this.loadImages(productId);
      },
      error: (error) => {
        this.errorMessage.set(error?.error?.error || 'No se pudo subir la imagen.');
        this.uploadingImage.set(false);
      },
    });
  }

  protected deleteImage(imageId: number): void {
    const productId = this.selectedProductId();

    if (!productId) {
      return;
    }

    this.successMessage.set('');
    this.errorMessage.set('');

    this.adminProductService.deleteImage(imageId).subscribe({
      next: () => {
        this.successMessage.set('Imagen eliminada correctamente.');
        this.loadImages(productId);
      },
      error: () => this.errorMessage.set('No se pudo eliminar la imagen.'),
    });
  }

  protected resolveImageUrl(imagePath: string): string {
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }

    const baseUrl = environment.apiUrl.replace(/\/api$/, '');
    return `${baseUrl}${imagePath}`;
  }

  private loadImages(productId: number): void {
    this.adminProductService.listImages(productId).subscribe({
      next: (images) => this.selectedProductImages.set(images),
      error: () => this.errorMessage.set('No se pudieron cargar las imagenes del producto.'),
    });
  }

  submit(): void {
    const categoryId = this.selectedCategoryId();

    if (!categoryId) {
      this.errorMessage.set('Debes seleccionar una categoria.');
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage.set('El nombre del producto es obligatorio.');
      return;
    }

    this.successMessage.set('');
    this.errorMessage.set('');

    this.adminProductService
      .create({
        categoryId,
        name: this.form.getRawValue().name,
        description: this.form.getRawValue().description || null,
        isActive: true,
      })
      .subscribe({
        next: () => {
          this.successMessage.set('Producto creado correctamente.');
          this.form.reset({ name: '', description: '' });
          this.loadProducts(categoryId);
        },
        error: () => this.errorMessage.set('No se pudo crear el producto.'),
      });
  }
}
