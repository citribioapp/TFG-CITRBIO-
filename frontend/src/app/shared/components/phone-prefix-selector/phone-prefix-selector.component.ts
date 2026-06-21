import {
  Component,
  forwardRef,
  HostListener,
  signal,
  computed,
  ElementRef,
  inject,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { NgClass } from '@angular/common';

export interface CountryPrefix {
  code: string;   // ISO 3166-1 alpha-2 lowercase, e.g. 'es'
  prefix: string; // e.g. '+34'
  name: string;
}

export const COUNTRY_PREFIXES: CountryPrefix[] = [
  { code: 'es', prefix: '+34', name: 'España' },
  { code: 'fr', prefix: '+33', name: 'Francia' },
  { code: 'de', prefix: '+49', name: 'Alemania' },
  { code: 'gb', prefix: '+44', name: 'Reino Unido' },
  { code: 'it', prefix: '+39', name: 'Italia' },
  { code: 'pt', prefix: '+351', name: 'Portugal' },
  { code: 'nl', prefix: '+31', name: 'Países Bajos' },
  { code: 'be', prefix: '+32', name: 'Bélgica' },
  { code: 'ch', prefix: '+41', name: 'Suiza' },
  { code: 'us', prefix: '+1', name: 'Estados Unidos' },
];

@Component({
  selector: 'app-phone-prefix-selector',
  standalone: true,
  imports: [NgClass],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => PhonePrefixSelectorComponent),
      multi: true,
    },
  ],
  templateUrl: './phone-prefix-selector.component.html',
})
export class PhonePrefixSelectorComponent implements ControlValueAccessor {
  private readonly el = inject(ElementRef);

  protected readonly countries = COUNTRY_PREFIXES;
  protected readonly isOpen = signal(false);
  protected readonly selectedPrefix = signal('+34');
  protected isDisabled = false;

  protected readonly selectedCountry = computed(
    () => this.countries.find((c) => c.prefix === this.selectedPrefix()) ?? this.countries[0],
  );

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: string): void {
    if (value) this.selectedPrefix.set(value);
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled = isDisabled;
  }

  toggleDropdown(): void {
    if (this.isDisabled) return;
    this.isOpen.update((v) => !v);
    this.onTouched();
  }

  select(country: CountryPrefix): void {
    this.selectedPrefix.set(country.prefix);
    this.onChange(country.prefix);
    this.isOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.el.nativeElement.contains(event.target)) {
      this.isOpen.set(false);
    }
  }
}
