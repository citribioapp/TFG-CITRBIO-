import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CookieConsentService, ConsentPreferences } from '../../../core/services/cookie-consent.service';

@Component({
  selector: 'app-cookie-consent',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './cookie-consent.component.html',
})
export class CookieConsentComponent {
  private readonly consentService = inject(CookieConsentService);

  /** Drives banner visibility */
  protected readonly choice = this.consentService.choice;

  /** Whether the preferences panel is open */
  protected readonly showPrefs = signal(false);

  /** Local editable copy of preferences */
  protected analytics = signal(false);
  protected marketing = signal(false);

  protected accept(): void {
    this.consentService.accept();
  }

  protected deny(): void {
    this.consentService.deny();
  }

  protected openPrefs(): void {
    const current = this.consentService.preferences();
    this.analytics.set(current.analytics);
    this.marketing.set(current.marketing);
    this.showPrefs.set(true);
  }

  protected closePrefs(): void {
    this.showPrefs.set(false);
  }

  protected savePrefs(): void {
    const prefs: ConsentPreferences = {
      analytics: this.analytics(),
      marketing: this.marketing(),
    };
    this.consentService.savePreferences(prefs);
    this.showPrefs.set(false);
  }
}
