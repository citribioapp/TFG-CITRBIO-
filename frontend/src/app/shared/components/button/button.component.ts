import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './button.component.html',
  styleUrl: './button.component.css'
})
export class ButtonComponent {
  @Input() variant: 'primary' | 'secondary' | 'outline' = 'primary';
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() disabled: boolean = false;
  @Input() type: 'button' | 'submit' = 'button';

  get buttonClasses(): string {
    const base = 'inline-flex items-center justify-center font-semibold rounded-citri-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';

    const variantClasses: Record<string, string> = {
      primary: 'bg-citri-green text-white hover:bg-citri-green-dark active:scale-95 focus:ring-citri-green',
      secondary: 'bg-citri-yellow text-citri-gray-900 hover:brightness-95 active:scale-95 focus:ring-citri-yellow',
      outline: 'border-2 border-citri-green text-citri-green hover:bg-citri-green-light active:scale-95 focus:ring-citri-green'
    };

    const sizeClasses: Record<string, string> = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-5 py-2.5 text-base',
      lg: 'px-7 py-3.5 text-lg'
    };

    const disabledClasses = this.disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : '';

    return [base, variantClasses[this.variant], sizeClasses[this.size], disabledClasses]
      .filter(Boolean)
      .join(' ');
  }
}
