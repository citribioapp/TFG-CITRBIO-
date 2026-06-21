import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { NgClass } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { CategoryWithProducts } from '../../../../core/models/catalog.models';
import { CategoryService } from '../../../catalog/services/category.service';
import { AdminCategoryService } from '../../services/admin-category.service';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, NgClass],
  templateUrl: './admin-categories-page.component.html',
})
export class AdminCategoriesPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly categoryService = inject(CategoryService);
  private readonly adminCategoryService = inject(AdminCategoryService);
  private readonly router = inject(Router);

  protected readonly categories = signal<CategoryWithProducts[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly successMessage = signal('');
  protected readonly errorMessage = signal('');

  // Create form
  protected readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    description: [''],
  });

  // Edit state
  protected readonly editingCategoryId = signal<number | null>(null);
  protected readonly isSavingEdit = signal(false);
  protected readonly editForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
    description: [''],
  });

  constructor() {
    this.loadCategories();
  }

  private loadCategories(): void {
    this.isLoading.set(true);
    this.categoryService.list().subscribe({
      next: (categories) => {
        this.categories.set(categories);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('No se pudieron cargar las categorias.');
        this.isLoading.set(false);
      },
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage.set('El nombre de la categoria es obligatorio.');
      return;
    }

    this.successMessage.set('');
    this.errorMessage.set('');

    this.adminCategoryService.create(this.form.getRawValue()).subscribe({
      next: (response) => {
        this.successMessage.set('Categoria creada correctamente.');
        this.form.reset({ name: '', description: '' });
        this.loadCategories();
        this.router.navigate(['/admin/productos'], {
          queryParams: { categoryId: response.id },
        });
      },
      error: (error: HttpErrorResponse) =>
        this.errorMessage.set(error.error?.error || 'No se pudo crear la categoria.'),
    });
  }

  protected startEdit(category: CategoryWithProducts): void {
    this.editingCategoryId.set(category.id);
    this.editForm.reset({
      name: category.name,
      description: category.description ?? '',
    });
  }

  protected cancelEdit(): void {
    this.editingCategoryId.set(null);
    this.editForm.reset();
  }

  protected saveEdit(categoryId: number): void {
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    this.isSavingEdit.set(true);
    const { name, description } = this.editForm.getRawValue();

    this.adminCategoryService.update(categoryId, {
      name: name.trim(),
      description: description.trim() || null,
    }).subscribe({
      next: (updated) => {
        this.isSavingEdit.set(false);
        this.editingCategoryId.set(null);
        this.successMessage.set('Categoría actualizada correctamente.');
        // Update the local list without a full reload
        this.categories.update((cats) =>
          cats.map((c) =>
            c.id === categoryId
              ? { ...c, name: updated.name, description: updated.description ?? null }
              : c
          )
        );
        setTimeout(() => this.successMessage.set(''), 3000);
      },
      error: (error: HttpErrorResponse) => {
        this.isSavingEdit.set(false);
        this.errorMessage.set(error.error?.error || 'No se pudo actualizar la categoría.');
        setTimeout(() => this.errorMessage.set(''), 4000);
      },
    });
  }
}
