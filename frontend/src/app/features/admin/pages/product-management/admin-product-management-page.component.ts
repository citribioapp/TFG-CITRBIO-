import { Component, ElementRef, inject, signal, computed, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgClass } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import {
  CategoryWithProducts,
  CategoryProductsResponse,
  ProductImage,
} from '../../../../core/models/catalog.models';
import { CategoryService } from '../../../catalog/services/category.service';
import { AdminCategoryService } from '../../services/admin-category.service';
import { environment } from '../../../../../environments/environment';
import { AdminProductService } from '../../services/admin-product.service';
import {
  AdminProductOptionService,
  ProductOptionType,
  ProductOptionsResponse,
} from '../../services/admin-product-option.service';
import { ProductOption } from '../../../../core/models/catalog.models';

interface ProductRow {
  id: number;
  name: string;
  description: string | null;
  image: string | null;
  isOutOfSeason: boolean;
}

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, NgClass],
  templateUrl: './admin-product-management-page.component.html',
})
export class AdminProductManagementPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly categoryService = inject(CategoryService);
  private readonly adminCategoryService = inject(AdminCategoryService);
  private readonly adminProductService = inject(AdminProductService);
  private readonly adminProductOptionService = inject(AdminProductOptionService);
  private readonly route = inject(ActivatedRoute);

  // ── State ──────────────────────────────────────────────────────────────────

  protected readonly categories = signal<CategoryWithProducts[]>([]);
  protected readonly selectedCategoryId = signal<number | null>(null);
  protected readonly products = signal<ProductRow[]>([]);
  protected readonly isLoadingCategories = signal(true);
  protected readonly isLoadingProducts = signal(false);

  // Category creation
  protected readonly showCategoryForm = signal(false);
  protected readonly categoryForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
    description: [''],
  });

  // ── Create flow (step-by-step) ─────────────────────────────────────────────
  // null = not creating; 'data' | 'image' | 'options' = active step
  protected readonly createStep = signal<'data' | 'image' | 'options' | null>(null);
  protected readonly createdProductId = signal<number | null>(null);
  protected readonly createImageUploaded = signal(false);
  protected readonly createProductForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
    description: [''],
  });

  // ── Inline edit (inside product card) ─────────────────────────────────────
  protected readonly editingProductId = signal<number | null>(null);
  protected readonly editProductForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
    description: [''],
  });

  // Image management (shared between create step 3 and inline edit)
  protected readonly imageTargetProductId = signal<number | null>(null);
  protected readonly productImages = signal<ProductImage[]>([]);
  protected readonly uploadingImage = signal(false);
  protected readonly selectedFileName = signal('');
  private selectedFile: File | null = null;
  protected readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  // Options management (shared between create step 4 and inline edit)
  protected readonly optionsTargetProductId = signal<number | null>(null);
  protected readonly optionsProductName = signal('');
  protected readonly options = signal<ProductOptionsResponse | null>(null);
  protected readonly optionForms = {
    calibers: this.fb.nonNullable.group({ name: ['', Validators.required] }),
    qualities: this.fb.nonNullable.group({ name: ['', Validators.required] }),
    formats: this.fb.nonNullable.group({ name: ['', Validators.required] }),
  };
  protected readonly optionTypes: Array<{
    key: ProductOptionType; label: string; singleLabel: string;
    requiredMsg: string;
  }> = [
    { key: 'calibers', label: 'Calibres', singleLabel: 'Calibre', requiredMsg: 'Debes añadir al menos un calibre.' },
    { key: 'qualities', label: 'Calidades', singleLabel: 'Calidad', requiredMsg: 'Debes añadir al menos una calidad.' },
    { key: 'formats', label: 'Formatos', singleLabel: 'Formato', requiredMsg: 'Debes añadir al menos un formato.' },
  ];
  // Inline option editing: tracks which option chip is being edited
  protected readonly editingOptionKey = signal<string | null>(null); // composite "type:id"
  protected readonly editOptionForm = this.fb.nonNullable.group({ name: ['', Validators.required] });

  // Confirmation modals
  protected readonly confirmDeleteCategory = signal<CategoryWithProducts | null>(null);
  protected readonly confirmDeleteProduct = signal<ProductRow | null>(null);
  protected readonly isDeletingCategory = signal(false);
  protected readonly isDeletingProduct = signal(false);
  protected readonly togglingOutOfSeasonIds = signal<number[]>([]);

  // Feedback
  protected readonly successMessage = signal('');
  protected readonly errorMessage = signal('');
  private feedbackTimer: ReturnType<typeof setTimeout> | null = null;

  // Computed
  protected readonly selectedCategory = computed(() =>
    this.categories().find(c => c.id === this.selectedCategoryId()) ?? null,
  );

  constructor() {
    this.loadCategories();
  }

  // ── Categories ─────────────────────────────────────────────────────────────

  private loadCategories(): void {
    this.isLoadingCategories.set(true);
    this.categoryService.list().subscribe({
      next: (cats) => {
        this.categories.set(cats);
        this.isLoadingCategories.set(false);
        // Auto-select category from ?category query param (e.g. coming from product card "Editar producto")
        const categoryParam = this.route.snapshot.queryParamMap.get('category');
        if (categoryParam) {
          const normalize = (s: string) =>
            s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-');
          const paramNorm = normalize(categoryParam);
          const match = cats.find(c => normalize(c.name) === paramNorm || normalize(c.name).includes(paramNorm) || paramNorm.includes(normalize(c.name)));
          if (match) {
            this.selectedCategoryId.set(match.id);
            this.loadProducts(match.id);
          }
        }
      },
      error: () => {
        this.showError('No se pudieron cargar las categorías.');
        this.isLoadingCategories.set(false);
      },
    });
  }

  protected selectCategory(id: number): void {
    if (this.selectedCategoryId() === id) return;
    this.selectedCategoryId.set(id);
    this.createStep.set(null);
    this.editingProductId.set(null);
    this.loadProducts(id);
  }

  protected submitCategory(): void {
    if (this.categoryForm.invalid) {
      this.categoryForm.markAllAsTouched();
      return;
    }
    this.adminCategoryService.create(this.categoryForm.getRawValue()).subscribe({
      next: (created) => {
        this.categoryForm.reset();
        this.showCategoryForm.set(false);
        this.loadCategories();
        this.showSuccess('Categoría creada correctamente.');
        setTimeout(() => {
          this.selectedCategoryId.set(created.id);
          this.loadProducts(created.id);
        }, 300);
      },
      error: (e: HttpErrorResponse) =>
        this.showError(e.error?.error || 'No se pudo crear la categoría.'),
    });
  }

  protected requestDeleteCategory(cat: CategoryWithProducts): void {
    this.confirmDeleteCategory.set(cat);
  }

  protected cancelDeleteCategory(): void {
    this.confirmDeleteCategory.set(null);
  }

  protected executeDeleteCategory(): void {
    const cat = this.confirmDeleteCategory();
    if (!cat) return;
    this.isDeletingCategory.set(true);
    this.adminCategoryService.delete(cat.id).subscribe({
      next: () => {
        this.isDeletingCategory.set(false);
        this.confirmDeleteCategory.set(null);
        if (this.selectedCategoryId() === cat.id) {
          this.selectedCategoryId.set(null);
          this.products.set([]);
        }
        this.loadCategories();
        this.showSuccess('Categoría eliminada.');
      },
      error: (e: HttpErrorResponse) => {
        this.isDeletingCategory.set(false);
        this.confirmDeleteCategory.set(null);
        this.showError(e.error?.error || 'No se pudo eliminar la categoría.');
      },
    });
  }

  // ── Products ───────────────────────────────────────────────────────────────

  private loadProducts(categoryId: number): void {
    this.isLoadingProducts.set(true);
    this.categoryService.getProducts(categoryId).subscribe({
      next: (response: CategoryProductsResponse) => {
        this.products.set(response.products.map(p => ({
          id: p.id,
          name: p.name,
          description: p.description ?? null,
          image: p.image ?? null,
          isOutOfSeason: p.isOutOfSeason ?? false,
        })));
        this.isLoadingProducts.set(false);
      },
      error: () => {
        this.showError('No se pudieron cargar los productos.');
        this.isLoadingProducts.set(false);
      },
    });
  }

  // ── Default options by category ───────────────────────────────────────────

  private readonly DEFAULT_FORMATS = [
    'Caja 6kg', 'Caja 10kg', 'Caja 15kg', 'Malla',
  ];

  private readonly DEFAULT_QUALITIES = [
    'Calidad I Extra', 'Calidad Primera', 'Calidad I Standar',
    'Calidad Standar', 'Calidad Segunda',
  ];

  private readonly DEFAULT_CALIBERS: Record<string, string[]> = {
    limones: [
      'Calibre 1 (72–83Ø) mm', 'Calibre 2 (68–78Ø) mm', 'Calibre 3 (63–72Ø) mm',
      'Calibre 4 (58–67Ø) mm', 'Calibre 5 (53–62Ø) mm', 'Calibre 6 (48–57Ø) mm',
      'Calibre 7 (45–52Ø) mm',
    ],
    mandarinas: [
      'Calibre 1-XXX (+78Ø) mm', 'Calibre 1-XX (67–78Ø) mm', 'Calibre 1-X (63–74Ø) mm',
      'Calibre 2 (58–69Ø) mm', 'Calibre 3 (54–64Ø) mm', 'Calibre 4 (50–60Ø) mm',
      'Calibre 5 (46–56Ø) mm', 'Calibre 6 (43–52Ø) mm', 'Calibre 7 (41–48Ø) mm',
      'Calibre 8 (39–46Ø) mm',
    ],
    naranjas: [
      'Calibre 0 (92–110Ø) mm', 'Calibre 1 (87–100Ø) mm', 'Calibre 2 (84–96Ø) mm',
      'Calibre 3 (81–92Ø) mm', 'Calibre 4 (77–88Ø) mm', 'Calibre 5 (73–84Ø) mm',
      'Calibre 6 (70–80Ø) mm', 'Calibre 7 (67–76Ø) mm', 'Calibre 8 (64–73Ø) mm',
      'Calibre 9 (62–70Ø) mm', 'Calibre 10 (60–68Ø) mm',
    ],
  };

  /**
   * Resolve the category slug key used for caliber defaults.
   * Matches loosely so "Limones", "limones", "Limón" etc. all resolve.
   */
  private resolveCategoryKey(): string | null {
    const name = (this.selectedCategory()?.name ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (name.includes('limon')) return 'limones';
    if (name.includes('mandarin')) return 'mandarinas';
    if (name.includes('naranja')) return 'naranjas';
    return null;
  }

  /**
   * Seed default options for a newly created product.
   * Only runs when the product has no existing options (prevents duplicates).
   * Called after loadOptions resolves during the create flow.
   */
  private seedDefaultOptions(productId: number, existingOptions: ProductOptionsResponse): void {
    const catKey = this.resolveCategoryKey();
    const defaultCalibers = catKey ? (this.DEFAULT_CALIBERS[catKey] ?? []) : [];

    // Only seed if the product truly has no options yet
    const alreadyHasOptions =
      existingOptions.calibers.length > 0 ||
      existingOptions.qualities.length > 0 ||
      existingOptions.formats.length > 0;

    if (alreadyHasOptions) return;

    const creates: Promise<unknown>[] = [
      ...defaultCalibers.map(name =>
        this.adminProductOptionService.create(productId, 'calibers', name).toPromise().catch(() => null)
      ),
      ...this.DEFAULT_QUALITIES.map(name =>
        this.adminProductOptionService.create(productId, 'qualities', name).toPromise().catch(() => null)
      ),
      ...this.DEFAULT_FORMATS.map(name =>
        this.adminProductOptionService.create(productId, 'formats', name).toPromise().catch(() => null)
      ),
    ];

    Promise.all(creates).then(() => {
      // Reload options so the UI shows the seeded defaults
      this.loadOptions(productId);
    });
  }

  // ── Create flow ────────────────────────────────────────────────────────────

  protected startCreateProduct(): void {
    this.createProductForm.reset({ name: '', description: '' });
    this.createdProductId.set(null);
    this.createImageUploaded.set(false);
    this.createStep.set('data');
    this.editingProductId.set(null);
  }

  protected submitCreateData(): void {
    const categoryId = this.selectedCategoryId();
    if (!categoryId || this.createProductForm.invalid) {
      this.createProductForm.markAllAsTouched();
      return;
    }
    const { name, description } = this.createProductForm.getRawValue();
    // Create as inactive (draft) — only activated on final save
    this.adminProductService.create({ categoryId, name, description: description || null, isActive: false }).subscribe({
      next: (created) => {
        this.createdProductId.set(created.id);
        this.imageTargetProductId.set(created.id);
        this.productImages.set([]);
        this.createStep.set('image');
      },
      error: () => this.showError('No se pudo crear el producto.'),
    });
  }

  protected skipCreateImage(): void {
    const productId = this.createdProductId();
    if (!productId) return;
    this.optionsTargetProductId.set(productId);
    this.optionsProductName.set(this.createProductForm.getRawValue().name);
    this.loadOptions(productId);
    this.createStep.set('options');
  }

  /** Navigate to a previous/adjacent step without losing state. */
  protected selectCreateStep(step: 'data' | 'image' | 'options'): void {
    // Can only go to 'image' or 'options' if a product has already been created
    if (step === 'image' && !this.createdProductId()) return;
    if (step === 'options' && !this.createdProductId()) return;
    // Block advancing to options until image is uploaded
    if (step === 'options' && !this.createImageUploaded()) return;
    // If going back to 'image', set the image target so upload still works
    if (step === 'image') {
      this.imageTargetProductId.set(this.createdProductId());
      this.loadImages(this.createdProductId()!);
    }
    // If going back to 'options', reload options so the list is current
    if (step === 'options') {
      const productId = this.createdProductId()!;
      this.optionsTargetProductId.set(productId);
      this.optionsProductName.set(this.createProductForm.getRawValue().name);
      this.loadOptions(productId);
    }
    this.createStep.set(step);
  }

  /** Upload image for the create flow — stays on image step to show preview. */
  protected onFileSelectedAndUploadCreate(event: Event): void {
    this.onFileSelected(event);
    if (this.selectedFile) {
      this.submitCreateImage();
    }
  }

  protected submitCreateImage(): void {
    const productId = this.imageTargetProductId();
    if (!productId || !this.selectedFile) return;
    this.uploadingImage.set(true);
    this.adminProductService.uploadImage(productId, this.selectedFile).subscribe({
      next: () => {
        this.uploadingImage.set(false);
        this.selectedFile = null;
        this.selectedFileName.set('');
        this.loadImages(productId);
        this.createImageUploaded.set(true);
        // Stay on image step — user must click "Siguiente paso" after seeing preview
      },
      error: (e) => {
        this.uploadingImage.set(false);
        this.showError(e?.error?.error || 'No se pudo subir la imagen.');
      },
    });
  }

  /** Advance from image step to options step — only allowed after image is uploaded. */
  protected advanceToOptions(): void {
    if (!this.createImageUploaded()) {
      this.showError('Debes subir una imagen antes de continuar.');
      return;
    }
    const productId = this.createdProductId()!;
    this.optionsTargetProductId.set(productId);
    this.optionsProductName.set(this.createProductForm.getRawValue().name);
    this.loadOptions(productId);
    this.createStep.set('options');
  }

  /** Replace the uploaded image — resets upload state and opens file picker. */
  protected replaceCreateImage(): void {
    const productId = this.imageTargetProductId();
    if (!productId) return;
    // Delete existing images then reset state so the user can pick a new file
    const existing = this.productImages();
    const deleteAll = existing.map(img =>
      this.adminProductService.deleteImage(img.id).toPromise().catch(() => null)
    );
    Promise.all(deleteAll).then(() => {
      this.productImages.set([]);
      this.createImageUploaded.set(false);
      this.selectedFileName.set('');
    });
  }

  protected finishCreate(): void {
    if (!this.createImageUploaded()) {
      this.showError('Debes subir una imagen del producto antes de finalizar.');
      return;
    }
    if (this.getOptions('calibers').length === 0) {
      this.showError('Debes añadir al menos un calibre.');
      return;
    }
    if (this.getOptions('qualities').length === 0) {
      this.showError('Debes añadir al menos una calidad.');
      return;
    }
    if (this.getOptions('formats').length === 0) {
      this.showError('Debes añadir al menos un formato.');
      return;
    }
    const productId = this.createdProductId();
    const catId = this.selectedCategoryId();
    if (!productId) return;
    // Activate the product — makes it visible publicly
    this.adminProductService.update(productId, { isActive: true }).subscribe({
      next: () => {
        if (catId) this.loadProducts(catId);
        this.resetCreateFlow();
        this.showSuccess('Producto guardado correctamente.');
      },
      error: () => this.showError('No se pudo guardar el producto.'),
    });
  }

  protected cancelCreate(): void {
    const productId = this.createdProductId();
    // If a draft product was created but not finished, delete it to avoid orphans
    if (productId) {
      this.adminProductService.delete(productId).subscribe({ error: () => null });
    }
    this.resetCreateFlow();
  }

  /** Reset all create-flow state without deleting anything (used after successful save). */
  private resetCreateFlow(): void {
    this.createStep.set(null);
    this.createdProductId.set(null);
    this.createImageUploaded.set(false);
    this.createProductForm.reset();
    this.selectedFile = null;
    this.selectedFileName.set('');
    this.imageTargetProductId.set(null);
    this.optionsTargetProductId.set(null);
    this.options.set(null);
  }

  protected openInlineEdit(product: ProductRow): void {
    if (this.editingProductId() === product.id) {
      this.closeInlineEdit();
      return;
    }
    this.createStep.set(null);
    this.editProductForm.patchValue({ name: product.name, description: product.description ?? '' });
    this.editingProductId.set(product.id);
    this.imageTargetProductId.set(product.id);
    this.optionsTargetProductId.set(product.id);
    this.optionsProductName.set(product.name);
    this.loadImages(product.id);
    this.loadOptions(product.id);
  }

  protected closeInlineEdit(): void {
    const scrollY = window.scrollY;
    this.editingProductId.set(null);
    this.editProductForm.reset();
    this.imageTargetProductId.set(null);
    this.optionsTargetProductId.set(null);
    this.options.set(null);
    this.productImages.set([]);
    // Restore scroll position so the panel collapse doesn't jump the viewport
    requestAnimationFrame(() => window.scrollTo({ top: scrollY, behavior: 'instant' as ScrollBehavior }));
  }

  protected submitInlineEdit(): void {
    const productId = this.editingProductId();
    const categoryId = this.selectedCategoryId();
    if (!productId || this.editProductForm.invalid) {
      this.editProductForm.markAllAsTouched();
      return;
    }
    const { name, description } = this.editProductForm.getRawValue();
    this.adminProductService.update(productId, { name, description: description || null }).subscribe({
      next: () => {
        this.showSuccess('Producto actualizado.');
        if (categoryId) this.loadProducts(categoryId);
        this.closeInlineEdit();
        setTimeout(() => {
          const el = document.getElementById('admin-products-header');
          if (!el) return;
          const navbarOffset = 96;
          const y = el.getBoundingClientRect().top + window.scrollY - navbarOffset;
          window.scrollTo({ top: Math.max(y, 0), behavior: 'smooth' });
        }, 250);
      },
      error: () => this.showError('No se pudo actualizar el producto.'),
    });
  }

  // ── Delete product ─────────────────────────────────────────────────────────

  protected requestDeleteProduct(product: ProductRow): void {
    this.confirmDeleteProduct.set(product);
  }

  protected cancelDeleteProduct(): void {
    this.confirmDeleteProduct.set(null);
  }

  protected executeDeleteProduct(): void {
    const product = this.confirmDeleteProduct();
    if (!product) return;
    this.isDeletingProduct.set(true);
    this.adminProductService.delete(product.id).subscribe({
      next: () => {
        this.isDeletingProduct.set(false);
        this.confirmDeleteProduct.set(null);
        if (this.editingProductId() === product.id) this.closeInlineEdit();
        const catId = this.selectedCategoryId();
        if (catId) this.loadProducts(catId);
        this.showSuccess('Producto eliminado.');
      },
      error: (e: HttpErrorResponse) => {
        this.isDeletingProduct.set(false);
        this.confirmDeleteProduct.set(null);
        this.showError(e.error?.error || 'No se pudo eliminar el producto.');
      },
    });
  }

  // ── Images ─────────────────────────────────────────────────────────────────

  private loadImages(productId: number): void {
    this.adminProductService.listImages(productId).subscribe({
      next: (imgs) => this.productImages.set(imgs),
      error: () => this.showError('No se pudieron cargar las imágenes.'),
    });
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.selectedFile = file;
    this.selectedFileName.set(file?.name ?? '');
  }

  /** Auto-upload: select file then immediately upload it, replacing any existing image. */
  protected onFileSelectedAndUpload(event: Event): void {
    this.onFileSelected(event);
    if (this.selectedFile) {
      // Delete all existing images first so only the new one remains
      const existingImages = this.productImages();
      const deleteAll = existingImages.map(img =>
        this.adminProductService.deleteImage(img.id).toPromise().catch(() => null)
      );
      Promise.all(deleteAll).then(() => {
        this.uploadImage();
      });
    }
  }

  protected uploadImage(): void {
    const productId = this.imageTargetProductId();
    if (!productId || !this.selectedFile) return;
    this.uploadingImage.set(true);
    this.adminProductService.uploadImage(productId, this.selectedFile).subscribe({
      next: () => {
        this.uploadingImage.set(false);
        this.selectedFile = null;
        this.selectedFileName.set('');
        const fi = this.fileInput()?.nativeElement;
        if (fi) fi.value = '';
        this.loadImages(productId);
        this.showSuccess('Imagen subida correctamente.');
      },
      error: (e) => {
        this.uploadingImage.set(false);
        this.showError(e?.error?.error || 'No se pudo subir la imagen.');
      },
    });
  }

  protected deleteImage(imageId: number): void {
    const productId = this.imageTargetProductId();
    if (!productId) return;
    this.adminProductService.deleteImage(imageId).subscribe({
      next: () => {
        this.loadImages(productId);
        this.showSuccess('Imagen eliminada.');
      },
      error: () => this.showError('No se pudo eliminar la imagen.'),
    });
  }

  protected resolveImageUrl(imagePath: string): string {
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) return imagePath;
    const baseUrl = environment.apiUrl.replace(/\/api$/, '');
    return `${baseUrl}${imagePath}`;
  }

  // ── Options ────────────────────────────────────────────────────────────────

  private loadOptions(productId: number): void {
    this.adminProductOptionService.getOptions(productId).subscribe({
      next: (resp) => {
        this.options.set(resp);
        // Seed defaults only during the create flow (not when editing existing products)
        if (this.createStep() === 'options' && this.createdProductId() === productId) {
          this.seedDefaultOptions(productId, resp);
        }
      },
      error: () => this.showError('No se pudieron cargar las características.'),
    });
  }

  protected getOptions(type: ProductOptionType): ProductOption[] {
    return this.options()?.[type] ?? [];
  }

  /** Returns true if all three option types have at least one entry. */
  protected hasRequiredOptions(): boolean {
    return (
      this.getOptions('calibers').length > 0 &&
      this.getOptions('qualities').length > 0 &&
      this.getOptions('formats').length > 0
    );
  }

  protected submitOption(type: ProductOptionType): void {
    const productId = this.optionsTargetProductId();
    const form = this.optionForms[type];
    if (!productId || form.invalid) {
      form.markAllAsTouched();
      // Focus the input immediately so the admin sees the red border and error
      setTimeout(() => {
        (document.getElementById(`opt-input-${type}`) as HTMLInputElement | null)?.focus();
      }, 0);
      return;
    }
    const name = form.getRawValue().name.trim();
    if (!name) {
      form.markAllAsTouched();
      setTimeout(() => {
        (document.getElementById(`opt-input-${type}`) as HTMLInputElement | null)?.focus();
      }, 0);
      return;
    }
    this.adminProductOptionService.create(productId, type, name).subscribe({
      next: () => {
        form.reset({ name: '' });
        this.loadOptions(productId);
        this.showSuccess('Característica añadida.');
      },
      error: (e) => this.showError(e?.error?.error || 'No se pudo añadir la característica.'),
    });
  }

  protected removeOption(type: ProductOptionType, optionId: number): void {
    const productId = this.optionsTargetProductId();
    if (!productId) return;
    // Cancel any inline edit for this option before deleting
    this.editingOptionKey.set(null);
    this.adminProductOptionService.delete(productId, type, optionId).subscribe({
      next: () => {
        this.loadOptions(productId);
        this.showSuccess('Característica eliminada.');
      },
      error: () => this.showError('No se pudo eliminar la característica.'),
    });
  }

  /** Open inline edit for a specific option chip. */
  protected startEditOption(type: ProductOptionType, opt: ProductOption): void {
    this.editingOptionKey.set(`${type}:${opt.id}`);
    this.editOptionForm.reset({ name: opt.name });
  }

  protected cancelEditOption(): void {
    this.editingOptionKey.set(null);
    this.editOptionForm.reset();
  }

  protected saveEditOption(type: ProductOptionType, optionId: number): void {
    const productId = this.optionsTargetProductId();
    if (!productId || this.editOptionForm.invalid) { this.editOptionForm.markAllAsTouched(); return; }
    const name = this.editOptionForm.getRawValue().name.trim();
    if (!name) { this.editOptionForm.markAllAsTouched(); return; }
    this.adminProductOptionService.update(productId, type, optionId, name).subscribe({
      next: () => {
        this.editingOptionKey.set(null);
        this.editOptionForm.reset();
        this.loadOptions(productId);
        this.showSuccess('Característica actualizada.');
      },
      error: (e) => this.showError(e?.error?.error || 'No se pudo actualizar la característica.'),
    });
  }

  protected isEditingOption(type: ProductOptionType, optionId: number): boolean {
    return this.editingOptionKey() === `${type}:${optionId}`;
  }

  /** Returns true when the add-form name control for a given type is invalid and touched. */
  protected isOptionNameInvalid(type: ProductOptionType): boolean {
    const ctrl = this.optionForms[type].controls['name'];
    return !!(ctrl?.invalid && ctrl?.touched);
  }

  // ── Out-of-season toggle ───────────────────────────────────────────────────

  protected isTogglingOutOfSeason(productId: number): boolean {
    return this.togglingOutOfSeasonIds().includes(productId);
  }

  protected toggleOutOfSeason(product: ProductRow): void {
    if (this.isTogglingOutOfSeason(product.id)) return;
    this.togglingOutOfSeasonIds.update(ids => [...ids, product.id]);
    const newValue = !product.isOutOfSeason;
    this.adminProductService.update(product.id, { isOutOfSeason: newValue }).subscribe({
      next: () => {
        this.togglingOutOfSeasonIds.update(ids => ids.filter(id => id !== product.id));
        // Update local state without reloading the full list
        this.products.update(list =>
          list.map(p => p.id === product.id ? { ...p, isOutOfSeason: newValue } : p)
        );
        this.showSuccess(
          newValue
            ? `"${product.name}" marcado como fuera de temporada.`
            : `"${product.name}" marcado como disponible.`
        );
      },
      error: () => {
        this.togglingOutOfSeasonIds.update(ids => ids.filter(id => id !== product.id));
        this.showError('No se pudo actualizar el estado de temporada.');
      },
    });
  }

  // ── Feedback helpers ───────────────────────────────────────────────────────

  private showSuccess(msg: string): void {
    this.successMessage.set(msg);
    this.errorMessage.set('');
    this.resetFeedbackTimer();
  }

  private showError(msg: string): void {
    this.errorMessage.set(msg);
    this.successMessage.set('');
    this.resetFeedbackTimer();
  }

  private resetFeedbackTimer(): void {
    if (this.feedbackTimer) clearTimeout(this.feedbackTimer);
    this.feedbackTimer = setTimeout(() => {
      this.successMessage.set('');
      this.errorMessage.set('');
    }, 4000);
  }
}
