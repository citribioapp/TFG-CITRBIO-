import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HeroBannerComponent } from '../../../../shared/components/hero-banner/hero-banner.component';
import { PhonePrefixSelectorComponent } from '../../../../shared/components/phone-prefix-selector/phone-prefix-selector.component';
import { ContactService } from '../../services/contact.service';

@Component({
  standalone: true,
  imports: [HeroBannerComponent, ReactiveFormsModule, NgClass, RouterLink, PhonePrefixSelectorComponent],
  templateUrl: './contact-page.component.html',
})
export class ContactPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly contactService = inject(ContactService);

  isSubmitting = signal(false);
  successMessage = signal('');
  errorMessage = signal('');

  form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    clientType: ['particular', Validators.required],
    phonePrefix: ['+34', Validators.required],
    phoneNumber: ['', [Validators.required, Validators.pattern(/^\d{6,15}$/)]],
    message: ['', [Validators.required, Validators.minLength(10)]],
    privacy: [false, Validators.requiredTrue],
  });

  isInvalid(field: string): boolean {
    return !!(this.form.get(field)?.invalid && this.form.get(field)?.touched);
  }

  onPhoneInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    input.value = input.value.replace(/\D/g, '');
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const { name, email, clientType, phonePrefix, phoneNumber, message } = this.form.value;

    this.contactService
      .send({
        name: name!,
        email: email!,
        clientType: clientType as 'empresa' | 'particular',
        phone: `${phonePrefix}${phoneNumber}`,
        message: message!,
      })
      .subscribe({
        next: () => {
          this.successMessage.set(
            'Mensaje enviado correctamente. Nos pondremos en contacto contigo pronto.'
          );
          this.form.reset({ clientType: 'particular', phonePrefix: '+34' });
          this.isSubmitting.set(false);
        },
        error: () => {
          this.errorMessage.set('Ha ocurrido un error. Por favor, inténtalo de nuevo.');
          this.isSubmitting.set(false);
        },
      });
  }
}
