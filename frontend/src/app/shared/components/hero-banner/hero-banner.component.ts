import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-hero-banner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './hero-banner.component.html',
  styleUrl: './hero-banner.component.css'
})
export class HeroBannerComponent {
  @Input({ required: true }) backgroundImage: string = '';
  @Input({ required: true }) title: string = '';
  @Input() subtitle: string = '';
  @Input() overlayOpacity: number = 0.5;
  @Input() titleSize: 'large' | 'medium' = 'large';
  @Input() heroSize: 'full' | 'half' = 'full';

  get overlayStyle(): string {
    return `rgba(45, 98, 53, ${this.overlayOpacity})`;
  }

  get titleClass(): string {
    return this.titleSize === 'medium'
      ? 'font-citri-sans font-bold text-white text-4xl md:text-4xl lg:text-5xl uppercase tracking-wide text-left md:text-center'
      : 'font-citri-sans font-bold text-white text-5xl md:text-5xl lg:text-6xl uppercase tracking-wide text-left md:text-center';
  }

  get heightClass(): string {
    return this.heroSize === 'half'
      ? 'min-h-[420px] md:min-h-[480px]'
      : 'min-h-[600px] md:min-h-screen';
  }

  get paddingClass(): string {
    return this.heroSize === 'half'
      ? 'pt-[140px] md:pt-[160px]'
      : 'pt-[220px] md:pt-[30vh]';
  }
}
