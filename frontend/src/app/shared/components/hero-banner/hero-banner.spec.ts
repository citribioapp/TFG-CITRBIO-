// Feature: citribio-frontend-ui, Property 5: HeroBanner refleja sus inputs en el DOM
import { TestBed } from '@angular/core/testing';
import * as fc from 'fast-check';
import { HeroBannerComponent } from './hero-banner.component';

/**
 * Validates: Requirements 13.1
 *
 * Property 5: HeroBanner refleja sus inputs en el DOM
 * Para cualquier combinación válida de inputs, el título y subtítulo
 * deben aparecer en el HTML renderizado.
 */
describe('HeroBannerComponent - Property 5: refleja sus inputs en el DOM', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeroBannerComponent],
    }).compileComponents();
  });

  it('P5: title y subtitle aparecen en el HTML renderizado para cualquier input válido', () => {
    fc.assert(
      fc.property(
        fc.record({
          backgroundImage: fc.string({ minLength: 1 }),
          title: fc.string({ minLength: 1 }),
          subtitle: fc.string(),
          overlayOpacity: fc.float({ min: 0, max: 1 }),
        }),
        ({ backgroundImage, title, subtitle, overlayOpacity }) => {
          const fixture = TestBed.createComponent(HeroBannerComponent);
          const component = fixture.componentInstance;

          component.backgroundImage = backgroundImage;
          component.title = title;
          component.subtitle = subtitle;
          component.overlayOpacity = overlayOpacity;

          fixture.detectChanges();

          const nativeEl = fixture.nativeElement as HTMLElement;

          // Use textContent to avoid HTML entity encoding issues (e.g. "&" → "&amp;")
          const h1Text = nativeEl.querySelector('h1')?.textContent ?? '';
          const pText = nativeEl.querySelector('p')?.textContent ?? '';

          // title must appear in the h1 text content
          const titleVisible = h1Text.includes(title);

          // subtitle must appear in the p text content only when non-empty (template uses @if)
          const subtitleVisible = subtitle === '' || pText.includes(subtitle);

          fixture.destroy();

          return titleVisible && subtitleVisible;
        }
      ),
      { numRuns: 100 }
    );
  });
});
