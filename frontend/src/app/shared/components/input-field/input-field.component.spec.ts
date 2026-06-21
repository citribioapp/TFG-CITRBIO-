// Feature: citribio-frontend-ui, Property 8: InputFieldComponent muestra el error cuando el control es inválido y tocado
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { InputFieldComponent } from './input-field.component';

describe('InputFieldComponent — Property 8', () => {
  it('hasError es true para cualquier errorMessage no vacío cuando el control está tocado', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        (errorMessage) => {
          const comp = new InputFieldComponent();
          comp.label = 'Test';
          comp.errorMessage = errorMessage;
          comp.touched.set(true);

          expect(comp.hasError).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('hasError es false cuando el control NO está tocado, aunque haya errorMessage', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        (errorMessage) => {
          const comp = new InputFieldComponent();
          comp.label = 'Test';
          comp.errorMessage = errorMessage;
          comp.touched.set(false);

          expect(comp.hasError).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('hasError es false cuando errorMessage está vacío, aunque el control esté tocado', () => {
    fc.assert(
      fc.property(
        fc.constant(''),
        (errorMessage) => {
          const comp = new InputFieldComponent();
          comp.label = 'Test';
          comp.errorMessage = errorMessage;
          comp.touched.set(true);

          expect(comp.hasError).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('writeValue actualiza el signal value para cualquier string', () => {
    fc.assert(
      fc.property(
        fc.string(),
        (value) => {
          const comp = new InputFieldComponent();
          comp.label = 'Test';
          comp.writeValue(value);

          expect(comp.value()).toBe(value);
        },
      ),
      { numRuns: 100 },
    );
  });
});
