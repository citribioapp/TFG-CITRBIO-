import { Component, effect, inject } from '@angular/core';
import { NavigationEnd, NavigationStart, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthStateService } from './core/services/auth-state.service';
import { CartStateService } from './core/services/cart-state.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private readonly authState = inject(AuthStateService);
  private readonly cartState = inject(CartStateService);
  private readonly router = inject(Router);

  constructor() {
    this.authState.restoreSession();

    // Load cart from backend whenever the user becomes authenticated.
    // This covers: page refresh (session restored from token), login, and register.
    // The effect runs once when isAuthenticated flips to true.
    effect(() => {
      if (this.authState.isAuthenticated()) {
        this.cartState.loadFromBackend();
      } else {
        // User logged out — clear the cart state immediately
        this.cartState.clear();
      }
    });

    // Track whether the current navigation is a browser back/forward (popstate).
    let isPopstate = false;

    this.router.events
      .pipe(filter(e => e instanceof NavigationStart))
      .subscribe((e: NavigationStart) => {
        isPopstate = e.navigationTrigger === 'popstate';
      });

    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: NavigationEnd) => {
        if (isPopstate) return;
        const hasFragment = e.urlAfterRedirects.includes('#');
        const hasCategoryParam = e.urlAfterRedirects.includes('category=');
        if (!hasFragment && !hasCategoryParam) {
          window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
        }
      });
  }
}
