import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CookieConsentService } from '../../../../core/services/cookie-consent.service';

@Component({
  standalone: true,
  imports: [RouterLink],
  templateUrl: './cookie-policy-page.component.html',
})
export class CookiePolicyPageComponent {
  private readonly consentService = inject(CookieConsentService);

  protected resetConsent(): void {
    try {
      localStorage.removeItem('citribio_cookie_consent');
      localStorage.removeItem('citribio_cookie_prefs');
    } catch { /* ignore */ }
    this.consentService.choice.set(null);
  }
}
