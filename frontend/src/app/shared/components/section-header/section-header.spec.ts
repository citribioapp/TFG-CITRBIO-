// Feature: citribio-frontend-ui, Property 6: SectionHeader refleja sus inputs en el DOM
import { TestBed } from '@angular/core/testing';
import * as fc from 'fast-check';
import { SectionHeaderComponent } from './section-header.component';

/**
 * Validates: Requirements 13.2
 *
 * Property 6: SectionHeader refleja sus inputs en el DOM
 * - title siempre aparece en el DOM
 * - eyebrow aparece cuando no es vacío
 * - description aparece cuando no es vacío
 */
describe('SectionHeaderComponent — Property 6', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SectionHeaderComponent],
    }).compileComponents();
  });

  it('Property 6: title siempre aparece, eyebrow y description cuando no son vacíos', () => {
    fc.assert(
      fc.property(
        fc.record({
          eyebrow: fc.string(),
          title: fc.string({ minLength: 1 }),
          description: fc.string(),
          align: fc.constantFrom('left' as const, 'center' as const),
        }),
        ({ eyebrow, title, description, align }) => {
          const fixture = TestBed.createComponent(SectionHeaderComponent);
          const component = fixture.componentInstance;

          component.eyebrow = eyebrow;
          component.title = title;
          component.description = description;
          component.align = align;
          fixture.detectChanges();

          const el = fixture.nativeElement as HTMLElement;
          const text = el.textContent ?? '';

          // title siempre debe aparecer
          expect(text).toContain(title);

          // eyebrow aparece solo cuando no es vacío
          if (eyebrow.length > 0) {
            expect(text).toContain(eyebrow);
          }

          // description aparece solo cuando no es vacío
          if (description.length > 0) {
            expect(text).toContain(description);
          }

          fixture.destroy();
        }
      ),
      { numRuns: 100 }
    );
  });
});
