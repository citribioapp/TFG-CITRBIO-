// Feature: citribio-frontend-ui, Property 7: ButtonComponent aplica las clases correctas para cada variante y tamaño
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { ButtonComponent } from './button.component';

describe('ButtonComponent — Property 7', () => {
  const variantClassMap: Record<string, string> = {
    primary: 'bg-citri-green',
    secondary: 'bg-citri-yellow',
    outline: 'border-citri-green',
  };

  const sizeClassMap: Record<string, string> = {
    sm: 'px-3',
    md: 'px-5',
    lg: 'px-7',
  };

  it('aplica al menos una clase específica de la variante y una del tamaño para cualquier combinación válida', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('primary' as const, 'secondary' as const, 'outline' as const),
        fc.constantFrom('sm' as const, 'md' as const, 'lg' as const),
        (variant, size) => {
          const comp = new ButtonComponent();
          comp.variant = variant;
          comp.size = size;
          comp.disabled = false;

          const classes = comp.buttonClasses;

          expect(classes).toContain(variantClassMap[variant]);
          expect(classes).toContain(sizeClassMap[size]);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('añade clases de disabled cuando disabled es true', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('primary' as const, 'secondary' as const, 'outline' as const),
        fc.constantFrom('sm' as const, 'md' as const, 'lg' as const),
        (variant, size) => {
          const comp = new ButtonComponent();
          comp.variant = variant;
          comp.size = size;
          comp.disabled = true;

          const classes = comp.buttonClasses;

          expect(classes).toContain('opacity-50');
          expect(classes).toContain('cursor-not-allowed');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('no añade clases de disabled cuando disabled es false', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('primary' as const, 'secondary' as const, 'outline' as const),
        fc.constantFrom('sm' as const, 'md' as const, 'lg' as const),
        (variant, size) => {
          const comp = new ButtonComponent();
          comp.variant = variant;
          comp.size = size;
          comp.disabled = false;

          const classes = comp.buttonClasses;

          expect(classes).not.toContain('opacity-50');
        },
      ),
      { numRuns: 100 },
    );
  });
});
