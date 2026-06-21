import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HeroBannerComponent } from '../../../../shared/components/hero-banner/hero-banner.component';

@Component({
  standalone: true,
  imports: [HeroBannerComponent, RouterLink],
  templateUrl: './home-page.component.html',
})
export class HomePageComponent {}
