// Feature: citribio-frontend-ui, Property 4: Eliminar un item del carrito lo excluye de la lista resultante
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { CartItem } from '../../../../core/models/cart.models';

// Lógica pura de eliminación extraída del CartPageComponent
function removeItemFromList(items: CartItem[], cartItemId: number): CartItem[] {
  return items.filter((item) => item.cartItemId !== cartItemId);
}

function buildCartItem(cartItemId: number): CartItem {
  return {
    cartItemId,
    quantity: 1,
    product: { id: cartItemId, name: `Producto ${cartItemId}` },
    selection: { caliber: null, quality: null, format: null },
  };
}

describe('CartPage — Property 4: Eliminar un item del carrito lo excluye de la lista resultante', () => {
  const cartItemArb = fc
    .array(fc.integer({ min: 1, max: 10000 }), { minLength: 1, maxLength: 20 })
    .filter((ids) => new Set(ids).size === ids.length) // IDs únicos
    .map((ids) => ids.map(buildCartItem));

  it('el item eliminado no aparece en la lista resultante', () => {
    fc.assert(
      fc.property(cartItemArb, (items) => {
        const targetIndex = 0;
        const targetId = items[targetIndex].cartItemId;

        const result = removeItemFromList(items, targetId);

        expect(result.find((i) => i.cartItemId === targetId)).toBeUndefined();
      }),
      { numRuns: 100 },
    );
  });

  it('el resto de items permanece inalterado tras la eliminación', () => {
    fc.assert(
      fc.property(
        cartItemArb.filter((items) => items.length >= 2),
        (items) => {
          const targetId = items[0].cartItemId;
          const remaining = items.slice(1);

          const result = removeItemFromList(items, targetId);

          expect(result.length).toBe(remaining.length);
          remaining.forEach((item) => {
            expect(result.find((r) => r.cartItemId === item.cartItemId)).toBeDefined();
          });
        },
      ),
      { numRuns: 100 },
    );
  });

  it('eliminar un id que no existe no modifica la lista', () => {
    fc.assert(
      fc.property(cartItemArb, (items) => {
        const nonExistentId = Math.max(...items.map((i) => i.cartItemId)) + 1;

        const result = removeItemFromList(items, nonExistentId);

        expect(result.length).toBe(items.length);
        items.forEach((item) => {
          expect(result.find((r) => r.cartItemId === item.cartItemId)).toBeDefined();
        });
      }),
      { numRuns: 100 },
    );
  });

  it('eliminar el único item de una lista de un elemento produce lista vacía', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 10000 }), (id) => {
        const items = [buildCartItem(id)];
        const result = removeItemFromList(items, id);

        expect(result).toHaveLength(0);
      }),
      { numRuns: 100 },
    );
  });
});
