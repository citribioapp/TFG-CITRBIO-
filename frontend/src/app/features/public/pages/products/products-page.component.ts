import { Component, ElementRef, inject, signal, viewChild, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { CategoryWithProducts } from '../../../../core/models/catalog.models';
import { ProductCardComponent } from '../../../../shared/components/product-card/product-card.component';
import { CategoryService } from '../../../catalog/services/category.service';
import { environment } from '../../../../../environments/environment';
import {
  NARANJAS_CALIBERS,
  LIMONES_CALIBERS,
  MANDARINAS_CALIBERS,
} from '../../../../core/data/calibers.data';

export interface CitrusVariety {
  name: string;
  /** 1-indexed months that are active (harvest season) */
  activeMonths: number[];
}

export interface CitrusCalendar {
  categorySlug: string;
  title: string;
  varieties: CitrusVariety[];
}

export const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export const CITRUS_CALENDARS: CitrusCalendar[] = [
  {
    categorySlug: 'limones',
    title: 'Calendario de Limones',
    varieties: [
      { name: 'Primofiori / Fino', activeMonths: [10, 11, 12, 1, 2, 3] },
      { name: 'Eureka',       activeMonths: [1, 2, 3, 4, 10, 11, 12] },
      { name: 'Verna',        activeMonths: [2, 3, 4, 5, 6, 7] },
      { name: 'Verdelli',       activeMonths: [5, 6, 7, 8, 9] },
    ],
  },
  {
    categorySlug: 'naranjas',
    title: 'Calendario de Naranjas',
    varieties: [
      
      { name: 'Lanelate',    activeMonths: [1, 2, 3, 4, 5] },
      { name: 'Power',   activeMonths: [1, 2, 3, 4, 5] },
      { name: 'Valencialate / Mignait', activeMonths: [3, 4, 5, 6, 7] },
      { name: 'Chirles', activeMonths: [12, 1, 2, 3] },
      { name: 'Navelina',     activeMonths: [10, 11, 12, 1] },
      { name: 'Newhall', activeMonths: [10, 11, 12, 1] },
      
      
    ],
  },
  {
    categorySlug: 'mandarinas',
    title: 'Calendario de Mandarinas',
    varieties: [
      { name: 'Orri',         activeMonths: [1, 2, 3, 4, 5] },
      { name: 'Nadorcott',    activeMonths: [1, 2, 3, 4] },
      { name: 'Clemenvilla',   activeMonths: [12, 1, 2] },
      { name: 'Clemenules',   activeMonths: [10, 11, 12, 1] },
      { name: 'Oro Nules',     activeMonths: [10, 11] },
      { name: 'Oro Grande',     activeMonths: [11, 12] },
    ],
  },
];

@Component({
  standalone: true,
  imports: [CommonModule, ProductCardComponent],
  templateUrl: './products-page.component.html',
  styleUrl: './products-page.component.css',
})
export class ProductsPageComponent {
  private readonly categoryService = inject(CategoryService);
  private readonly route = inject(ActivatedRoute);

  protected readonly categories = signal<CategoryWithProducts[]>([]);
  protected readonly selectedCategoryId = signal<number | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly searchQuery = signal('');
  protected readonly placeholders = Array.from({ length: 6 }, (_, index) => index);
  protected readonly categoryCarousel = viewChild<ElementRef<HTMLDivElement>>('categoryCarousel');
  protected readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInputRef');

  protected readonly months = MONTHS;

  protected readonly naranjasCalibers = NARANJAS_CALIBERS;
  protected readonly limonesCalibers = LIMONES_CALIBERS;
  protected readonly mandarinasCalibers = MANDARINAS_CALIBERS;

  /** Slug of the currently selected category, normalised to one of the three
   *  caliber groups. Used on mobile to show only the relevant caliber table. */
  protected readonly activeCaliberSlug = computed<'limones' | 'naranjas' | 'mandarinas' | null>(() => {
    const cat = this.selectedCategory();
    if (!cat) return null;
    const slug = (cat.slug?.toLowerCase() ?? cat.name.toLowerCase());
    if (slug.includes('limon')) return 'limones';
    if (slug.includes('naranja')) return 'naranjas';
    if (slug.includes('mandarina')) return 'mandarinas';
    return null;
  });

  /** Calendar matching the currently selected category (by slug match, case-insensitive) */
  protected readonly activeCalendar = computed<CitrusCalendar | null>(() => {
    const cat = this.selectedCategory();
    if (!cat) return null;
    const slug = cat.slug?.toLowerCase() ?? cat.name.toLowerCase();
    return CITRUS_CALENDARS.find(c => slug.includes(c.categorySlug)) ?? null;
  });

  /** Products of the active category filtered by the current search query */
  protected readonly filteredProducts = computed(() => {
    const category = this.selectedCategory();
    if (!category) return [];
    const query = this.searchQuery().trim().toLowerCase();
    if (!query) return category.products;
    return category.products.filter(p =>
      p.name.toLowerCase().includes(query)
    );
  });

  /** True when the user has typed a non-empty search term */
  protected readonly isSearchActive = computed(() => this.searchQuery().trim().length > 0);

  /**
   * Global search results across ALL categories.
   * Each result carries the parent category so the card can navigate correctly.
   * Only populated when isSearchActive() is true.
   */
  protected readonly globalSearchResults = computed<Array<{
    id: number;
    name: string;
    description: string | null;
    image?: string | null;
    categorySlug: string;
    categoryName: string;
    isOutOfSeason: boolean;
  }>>(() => {
    const query = this.searchQuery().trim().toLowerCase();
    if (!query) return [];
    const results: Array<{
      id: number;
      name: string;
      description: string | null;
      image?: string | null;
      categorySlug: string;
      categoryName: string;
      isOutOfSeason: boolean;
    }> = [];
    for (const category of this.categories()) {
      for (const product of category.products) {
        const matchesName = product.name.toLowerCase().includes(query);
        const matchesDesc = product.description?.toLowerCase().includes(query) ?? false;
        if (matchesName || matchesDesc) {
          results.push({
            ...product,
            categorySlug: category.slug,
            categoryName: category.name,
            isOutOfSeason: product.isOutOfSeason ?? false,
          });
        }
      }
    }
    return results;
  });

  private _debounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.categoryService.list().subscribe({
      next: (categories) => {
        this.categories.set(categories);

        if (categories.length > 0) {
          // Handle incoming route fragments and query params:
          //   ?category=limones → restore selected category (back from product detail)
          //   #calendario-limones  → select matching category + scroll to its calendar
          //   #limones / #naranjas / #mandarinas → select matching category + scroll to products section
          //   #clasificacion-oficial → scroll to the calibres section (always in DOM)
          //   (no fragment, no query) → default to first category, center carousel
          const fragment = this.route.snapshot.fragment ?? '';
          const categoryParam = this.route.snapshot.queryParamMap.get('category') ?? '';
          const isCalendarFragment = fragment.startsWith('calendario-');
          const isTemporadaFragment = fragment.startsWith('temporada-');
          const isClasificacion = fragment === 'clasificacion-calibres';
          const hasFragment = fragment.length > 0;
          const fragmentSlug = isCalendarFragment
            ? fragment.replace('calendario-', '')
            : isTemporadaFragment
              ? fragment.replace('temporada-', '')
              : (!isClasificacion && fragment) ? fragment : null;

          // Category param from back-navigation takes priority over fragment slug
          const slugToRestore = categoryParam || fragmentSlug;

          const targetCategory = slugToRestore
            ? categories.find(c =>
                (c.slug?.toLowerCase() ?? c.name.toLowerCase()).includes(slugToRestore.toLowerCase())
              ) ?? categories[0]
            : categories[0];

          this.selectedCategoryId.set(targetCategory.id);

          if (!hasFragment && !categoryParam) {
            // Normal load — center the first category in the carousel
            setTimeout(() => this.centerCarousel(targetCategory.id), 100);
          } else if (categoryParam) {
            // Back-navigation from product detail — scroll to the anchor above the
            // category tabs so the selector is fully visible below the fixed navbar.
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                document.getElementById('productos-categorias-tabs')
                  ?.scrollIntoView({ behavior: 'auto', block: 'start' });
              });
            });
          } else if (isClasificacion) {
            // Always in DOM — scroll on next paint
            requestAnimationFrame(() => {
              document.getElementById('clasificacion-calibres')
                ?.scrollIntoView({ behavior: 'auto', block: 'start' });
            });
          } else if (isCalendarFragment || isTemporadaFragment) {
            // Inside @if — wait two frames for Angular to render the block
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                document.getElementById(fragment)
                  ?.scrollIntoView({ behavior: 'auto', block: 'start' });
              });
            });
          } else if (fragmentSlug) {
            requestAnimationFrame(() => {
              document.getElementById('productos-section')
                ?.scrollIntoView({ behavior: 'auto', block: 'start' });
            });
          }
        }

        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Revisa la conexion con la API o el despliegue del backend.');
        this.isLoading.set(false);
      },
    });
  }

  protected selectCategory(categoryId: number): void {
    this.selectedCategoryId.set(categoryId);
    this.searchQuery.set('');
    const el = this.searchInput()?.nativeElement;
    if (el) el.value = '';
    this.centerCarousel(categoryId);
  }

  protected onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    if (this._debounceTimer !== null) {
      clearTimeout(this._debounceTimer);
    }
    this._debounceTimer = setTimeout(() => {
      this.searchQuery.set(value);
      this._debounceTimer = null;
    }, 280);
  }

  protected clearSearch(): void {
    this.searchQuery.set('');
    const el = this.searchInput()?.nativeElement;
    if (el) {
      el.value = '';
      el.focus();
    }
  }

  private centerCarousel(categoryId: number): void {
    // Auto-scroll to center the selected category button in the carousel
    setTimeout(() => {
      const carousel = this.categoryCarousel()?.nativeElement;
      if (!carousel) return;

      const categoryIndex = this.categories().findIndex(c => c.id === categoryId);
      if (categoryIndex === -1) return;

      const selectedButton = carousel.querySelector(`button:nth-child(${categoryIndex + 1})`) as HTMLElement;
      if (!selectedButton) return;

      selectedButton.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
    }, 50);
  }

  protected selectedCategory(): CategoryWithProducts | null {
    return this.categories().find((category) => category.id === this.selectedCategoryId()) ?? null;
  }

  protected scrollCategories(direction: 'left' | 'right'): void {
    const carousel = this.categoryCarousel()?.nativeElement;
    if (!carousel) return;
    const offset = direction === 'left' ? -240 : 240;
    carousel.scrollBy({ left: offset, behavior: 'smooth' });
  }

  protected resolveImageUrl(imagePath: string): string {
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }
    const baseUrl = environment.apiUrl.replace(/\/api$/, '');
    return `${baseUrl}${imagePath}`;
  }

  protected isMonthActive(variety: CitrusVariety, monthIndex: number): boolean {
    // monthIndex is 0-based; activeMonths is 1-based
    return variety.activeMonths.includes(monthIndex + 1);
  }

  protected scrollToCalendar(): void {
    const calendar = this.activeCalendar();
    if (!calendar) return;
    const el = document.getElementById(`calendario-${calendar.categorySlug}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
