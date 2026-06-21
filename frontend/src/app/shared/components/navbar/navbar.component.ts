import { ChangeDetectionStrategy, Component, computed, effect, ElementRef, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NgClass } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter, map, startWith } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { CartStateService } from '../../../core/services/cart-state.service';

interface NavLink {
  label: string;
  path: string;
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, NgClass],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavbarComponent {
  private readonly authState = inject(AuthStateService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly cartState = inject(CartStateService);

  protected readonly mobileMenuOpen = signal(false);
  protected readonly logoError = signal(false);
  protected readonly miniCartOpen = signal(false);
  protected readonly cartCount = this.cartState.count;
  // Only show real backend-loaded items in the mini-cart (filter out optimistic increment() placeholders)
  protected readonly cartItems = computed(() =>
    this.cartState.items().filter(item => item.cartItemId > 0 && item.product.name !== null)
  );

  private miniCartCloseTimer: ReturnType<typeof setTimeout> | null = null;

  protected openMiniCart(): void {
    if (this.miniCartCloseTimer !== null) {
      clearTimeout(this.miniCartCloseTimer);
      this.miniCartCloseTimer = null;
    }
    this.miniCartOpen.set(true);
  }

  protected scheduleMiniCartClose(delayMs = 2000): void {
    if (this.miniCartCloseTimer !== null) {
      clearTimeout(this.miniCartCloseTimer);
    }
    if (delayMs === 0) {
      this.miniCartOpen.set(false);
      this.miniCartCloseTimer = null;
    } else {
      this.miniCartCloseTimer = setTimeout(() => {
        this.miniCartOpen.set(false);
        this.miniCartCloseTimer = null;
      }, delayMs);
    }
  }
  
  // View children for focus management
  protected readonly hamburgerButton = viewChild<ElementRef<HTMLButtonElement>>('hamburgerButton');
  protected readonly closeButton = viewChild<ElementRef<HTMLButtonElement>>('closeButton');
  protected readonly mobileMenu = viewChild<ElementRef<HTMLDivElement>>('mobileMenu');

  protected readonly publicLinks: NavLink[] = [
    { label: 'Inicio', path: '/' },
    { label: 'Nosotros', path: '/nosotros' },
    { label: 'Productos', path: '/productos' },
    { label: 'Contacto', path: '/contacto' },
  ];

  protected readonly isAuthenticated = computed(() => this.authState.isAuthenticated());
  protected readonly isAdmin = computed(() => this.authState.isAdmin());
  protected readonly accountPath = computed(() =>
    this.authState.isAuthenticated() ? '/mi-cuenta' : '/login',
  );

  // Reactive current URL signal — updates on every NavigationEnd event
  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  protected readonly isAccountActive = computed(() =>
    this.currentUrl().startsWith('/mi-cuenta') ||
    this.currentUrl().startsWith('/login') ||
    this.currentUrl().startsWith('/registro'),
  );

  protected readonly isCartActive = computed(() =>
    this.currentUrl().startsWith('/carrito') ||
    this.currentUrl().startsWith('/checkout'),
  );

  constructor() {
    // Handle focus when menu opens/closes
    effect(() => {
      if (this.mobileMenuOpen()) {
        // Menu opened - focus close button after a short delay
        setTimeout(() => {
          this.closeButton()?.nativeElement.focus();
        }, 100);
      }
    });

    // Handle Escape key globally
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Escape' && this.mobileMenuOpen()) {
          this.closeMobileMenu();
        }
      });
    }
  }

  protected toggleMobileMenu(): void {
    const opening = !this.mobileMenuOpen();
    this.mobileMenuOpen.set(opening);
    if (opening) {
      document.body.classList.add('overflow-hidden');
    } else {
      document.body.classList.remove('overflow-hidden');
      // Return focus to hamburger button
      setTimeout(() => {
        this.hamburgerButton()?.nativeElement.focus();
      }, 100);
    }
  }

  protected closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
    document.body.classList.remove('overflow-hidden');
    // Return focus to hamburger button
    setTimeout(() => {
      this.hamburgerButton()?.nativeElement.focus();
    }, 100);
  }

  protected onMenuKeydown(event: KeyboardEvent): void {
    const menu = this.mobileMenu()?.nativeElement;
    if (!menu) return;

    const focusableElements = menu.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href]:not([disabled])'
    );
    const focusableArray = Array.from(focusableElements);
    const firstElement = focusableArray[0];
    const lastElement = focusableArray[focusableArray.length - 1];

    if (event.key === 'Tab') {
      if (event.shiftKey) {
        // Shift+Tab - moving backwards
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab - moving forwards
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement?.focus();
        }
      }
    }
  }

  protected logout(): void {
    this.authService.logout();
    document.body.classList.remove('overflow-hidden');
    this.closeMobileMenu();
    this.router.navigate(['/login']);
  }
}
