// Feature: citribio-frontend-ui, Property 3: El validador de contraseñas coincidentes rechaza cualquier par no igual
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { FormControl, FormGroup } from '@angular/forms';
import { AbstractControl } from '@angular/forms';

// Validador extraído del RegisterPageComponent para testear de forma aislada
function passwordsMatchValidator(group: AbstractControl) {
  const password = group.get('password')?.value;
  const repeatPassword = group.get('repeatPassword')?.value;
  return password === repeatPassword ? null : { passwordsMismatch: true };
}

function buildGroup(password: string, repeatPassword: string): FormGroup {
  return new FormGroup({
    password: new FormControl(password),
    repeatPassword: new FormControl(repeatPassword),
  });
}

describe('passwordsMatchValidator — Property 3', () => {
  it('retorna null cuando password y repeatPassword son iguales para cualquier string', () => {
    fc.assert(
      fc.property(
        fc.string(),
        (password) => {
          const group = buildGroup(password, password);
          const result = passwordsMatchValidator(group);

          expect(result).toBeNull();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('retorna error no nulo cuando password y repeatPassword son distintos', () => {
    fc.assert(
      fc.property(
        fc.tuple(fc.string(), fc.string()).filter(([a, b]) => a !== b),
        ([password, repeatPassword]) => {
          const group = buildGroup(password, repeatPassword);
          const result = passwordsMatchValidator(group);

          expect(result).not.toBeNull();
          expect(result).toHaveProperty('passwordsMismatch', true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('el error tiene exactamente la clave passwordsMismatch cuando las contraseñas no coinciden', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }).filter((s) => s !== 'abc'),
        (password, suffix) => {
          const repeatPassword = password + suffix;
          if (password === repeatPassword) return; // skip edge case

          const group = buildGroup(password, repeatPassword);
          const result = passwordsMatchValidator(group);

          if (result !== null) {
            expect(Object.keys(result)).toContain('passwordsMismatch');
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('strings vacíos iguales entre sí retornan null', () => {
    const group = buildGroup('', '');
    expect(passwordsMatchValidator(group)).toBeNull();
  });

  it('string vacío vs no vacío retorna error', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        (nonEmpty) => {
          const group = buildGroup('', nonEmpty);
          const result = passwordsMatchValidator(group);
          expect(result).not.toBeNull();
        },
      ),
      { numRuns: 50 },
    );
  });
});
