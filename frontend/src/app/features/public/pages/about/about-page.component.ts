import { Component, OnDestroy, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { HeroBannerComponent } from '../../../../shared/components/hero-banner/hero-banner.component';
import { SectionHeaderComponent } from '../../../../shared/components/section-header/section-header.component';

interface PackagingSlide {
  image: string;
  alt: string;
  title: string;
  description: string;
  tag: string;
}

@Component({
  standalone: true,
  imports: [HeroBannerComponent, SectionHeaderComponent, NgClass],
  templateUrl: './about-page.component.html',
})
export class AboutPageComponent implements OnDestroy {
  protected readonly slides: PackagingSlide[] = [
    {
      image: '/carton.png',
      alt: 'Caja de cartón Citribio',
      title: 'Caja de cartón',
      description: 'Protección segura y personalizable, con materiales reciclables y excelente ventilación.',
      tag: 'Reciclable',
    },
    {
      image: '/madera.png',
      alt: 'Caja de madera Citribio',
      title: 'Caja de madera',
      description: 'Sólida y tradicional, garantiza estabilidad y buena conservación en transporte largo.',
      tag: 'Tradicional',
    },
  ];

  protected readonly currentIndex = signal(0);
  private autoSlideTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.startAutoSlide();
  }

  ngOnDestroy(): void {
    this.stopAutoSlide();
  }

  protected prev(): void {
    this.currentIndex.update(i => (i - 1 + this.slides.length) % this.slides.length);
  }

  protected next(): void {
    this.currentIndex.update(i => (i + 1) % this.slides.length);
  }

  protected goTo(index: number): void {
    this.currentIndex.set(index);
  }

  protected pauseAutoSlide(): void {
    this.stopAutoSlide();
  }

  protected resumeAutoSlide(): void {
    this.startAutoSlide();
  }

  private startAutoSlide(): void {
    this.stopAutoSlide();
    this.autoSlideTimer = setInterval(() => {
      this.currentIndex.update(i => (i + 1) % this.slides.length);
    }, 5000);
  }

  private stopAutoSlide(): void {
    if (this.autoSlideTimer !== null) {
      clearInterval(this.autoSlideTimer);
      this.autoSlideTimer = null;
    }
  }
}
