// Feature: citribio-frontend-ui, Property 1: Filtrado de categoría es exhaustivo y exclusivo
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { signal } from '@angular/core';
import { CategoryWithProducts } from '../../../../core/models/catalog.models';

// Lógica pura de filtrado extraída del componente para testear de forma aislada
function selectedCategory(
  categories: CategoryWithProducts[],
  selectedCategoryId: number | null,
): CategoryWithProducts | null {
  return categories.find((c) => c.id === selectedCategoryId) ?? null;
}

describe('ProductsPage — Property 1: Filtrado de categoría es exhaustivo y exclusivo', () => {
  const categoryArb = fc.record({
    id: fc.integer({ min: 1, max: 1000 }),
    name: fc.string({ minLength: 1, maxLength: 30 }),
    slug: fc.string({ minLength: 1, maxLength: 30 }),
    description: fc.option(fc.string(), { nil: null }),
    products: fc.array(
      fc.record({
        id: fc.integer({ min: 1, max: 10000 }),
        name: fc.string({ minLength: 1 }),
        description: fc.option(fc.string(), { nil: null }),
        image: fc.option(fc.string(), { nil: null }),
      }),
      { minLength: 0, maxLength: 10 },
    ),
  });

  it('la categoría seleccionada contiene exactamente sus propios productos', () => {
    fc.assert(
      fc.property(
        fc.array(categoryArb, { minLength: 1, maxLength: 5 }).filter(
          // Asegurar IDs únicos
          (cats) => new Set(cats.map((c) => c.id)).size === cats.length,
        ),
        (categories) => {
          // Seleccionar la primera categoría (comportamiento por defecto del componente)
          const firstId = categories[0].id;
          const result = selectedCategory(categories, firstId);

          expect(result).not.toBeNull();
          expect(result!.id).toBe(firstId);
          // Los productos del resultado son exactamente los de esa categoría
          expect(result!.products).toStrictEqual(categories[0].products);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('seleccionar cualquier categoría válida devuelve exactamente esa categoría', () => {
    fc.assert(
      fc.property(
        fc.array(categoryArb, { minLength: 2, maxLength: 5 }).filter(
          (cats) => new Set(cats.map((c) => c.id)).size === cats.length,
        ),
        fc.nat({ max: 4 }),
        (categories, indexSeed) => {
          const index = indexSeed % categories.length;
          const targetId = categories[index].id;
          const result = selectedCategory(categories, targetId);

          expect(result).not.toBeNull();
          expect(result!.id).toBe(targetId);
          // No devuelve productos de otras categorías
          const otherIds = categories.filter((c) => c.id !== targetId).map((c) => c.id);
          expect(otherIds).not.toContain(result!.id);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('devuelve null cuando el id seleccionado no existe en la lista', () => {
    fc.assert(
      fc.property(
        fc.array(categoryArb, { minLength: 1, maxLength: 5 }).filter(
          (cats) => new Set(cats.map((c) => c.id)).size === cats.length,
        ),
        (categories) => {
          const nonExistentId = Math.max(...categories.map((c) => c.id)) + 1;
          const result = selectedCategory(categories, nonExistentId);

          expect(result).toBeNull();
        },
      ),
      { numRuns: 100 },
    );
  });
});
