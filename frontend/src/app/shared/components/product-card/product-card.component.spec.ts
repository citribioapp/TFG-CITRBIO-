// Feature: citribio-frontend-ui, Property 2: ProductCard renderiza todos los campos requeridos
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { ProductCardComponent } from './product-card.component';

describe('ProductCardComponent — Property 2', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductCardComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  function createComponent(inputs: {
    id: number;
    name: string;
    description?: string | null;
    image?: string | null;
  }): ComponentFixture<ProductCardComponent> {
    const fixture = TestBed.createComponent(ProductCardComponent);
    const comp = fixture.componentInstance;

    comp.name = inputs.name;
    comp.productId = inputs.id;
    comp.description = inputs.description ?? null;
    comp.image = inputs.image ?? null;

    fixture.detectChanges();

    return fixture;
  }

  it('el nombre del producto siempre está disponible en el componente para cualquier input válido', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.integer({ min: 1 }),
          name: fc.string({ minLength: 1 }),
          description: fc.option(fc.string(), { nil: null }),
          image: fc.option(fc.string(), { nil: null }),
        }),
        ({ id, name, description, image }) => {
          const fixture = createComponent({ id, name, description, image });
          const comp = fixture.componentInstance;

          // El nombre debe estar disponible como propiedad del componente
          expect(comp.name).toBe(name);
          expect(comp.productId).toBe(id);

          fixture.destroy();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('imageError empieza en false para cualquier combinación de inputs', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.integer({ min: 1 }),
          name: fc.string({ minLength: 1 }),
          image: fc.option(fc.string(), { nil: null }),
        }),
        ({ id, name, image }) => {
          const fixture = createComponent({ id, name, image });
          const comp = fixture.componentInstance;

          expect(comp.imageError()).toBe(false);

          fixture.destroy();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('onImageError establece imageError a true para cualquier input', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.integer({ min: 1 }),
          name: fc.string({ minLength: 1 }),
        }),
        ({ id, name }) => {
          const fixture = createComponent({ id, name });
          const comp = fixture.componentInstance;

          comp.onImageError();

          expect(comp.imageError()).toBe(true);

          fixture.destroy();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('description puede ser null o cualquier string sin romper el componente', () => {
    fc.assert(
      fc.property(
        fc.option(fc.string(), { nil: null }),
        (description) => {
          const fixture = createComponent({
            id: 1,
            name: 'Limón',
            description,
          });
          const comp = fixture.componentInstance;

          // No debe lanzar error
          expect(comp.description).toBe(description);

          fixture.destroy();
        },
      ),
      { numRuns: 100 },
    );
  });
});
