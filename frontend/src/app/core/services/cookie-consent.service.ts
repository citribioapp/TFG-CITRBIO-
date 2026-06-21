import { Injectable, signal } from '@angular/core';

export type ConsentChoice = 'accepted' | 'denied' | null;

export interface ConsentPreferences {
  analytics: boolean;
  marketing: boolean;
}

const STORAGE_KEY = 'citribio_cookie_consent';
const PREFS_KEY   = 'citribio_cookie_prefs';

@Injectable({ providedIn: 'root' })
export class CookieConsentService {
  /** null = not yet decided, 'accepted' / 'denied' = already stored */
  readonly choice = signal<ConsentChoice>(this._loadChoice());

  readonly preferences = signal<ConsentPreferences>(this._loadPrefs());

  private _loadChoice(): ConsentChoice {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      if (v === 'accepted' || v === 'denied') return v;
    } catch { /* SSR / private mode */ }
    return null;
  }

  private _loadPrefs(): ConsentPreferences {
    try {
      const raw = localStorage.getItem(PREFS_KEY);
      if (raw) return JSON.parse(raw) as ConsentPreferences;
    } catch { /* ignore */ }
    return { analytics: false, marketing: false };
  }

  accept(): void {
    this._save('accepted', { analytics: true, marketing: true });
  }

  deny(): void {
    this._save('denied', { analytics: false, marketing: false });
  }

  savePreferences(prefs: ConsentPreferences): void {
    this._save('accepted', prefs);
  }

  private _save(choice: ConsentChoice, prefs: ConsentPreferences): void {
    try {
      if (choice) localStorage.setItem(STORAGE_KEY, choice);
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch { /* ignore */ }
    this.choice.set(choice);
    this.preferences.set(prefs);
  }
}
