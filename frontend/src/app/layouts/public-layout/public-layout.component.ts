import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { CookieConsentComponent } from '../../shared/components/cookie-consent/cookie-consent.component';

@Component({
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, FooterComponent, CookieConsentComponent],
  templateUrl: './public-layout.component.html',
  styleUrl: './public-layout.component.css',
})
export class PublicLayoutComponent {}
