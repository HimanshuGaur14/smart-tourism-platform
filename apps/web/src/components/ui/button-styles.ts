import { cn } from '../../lib/cn';

export type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2 rounded-md font-medium whitespace-nowrap transition-colors duration-150 disabled:pointer-events-none disabled:opacity-55 aria-disabled:pointer-events-none aria-disabled:opacity-55';

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-forest-700 text-ivory-50 hover:bg-forest-800 active:bg-forest-900',
  accent: 'bg-terracotta-600 text-white hover:bg-terracotta-700',
  secondary:
    'border border-charcoal-200 bg-white text-charcoal-800 hover:border-charcoal-300 hover:bg-ivory-100',
  ghost: 'text-charcoal-700 hover:bg-ivory-200 hover:text-charcoal-900',
  danger: 'bg-red-700 text-white hover:bg-red-800',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
};

export function buttonClasses(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  className?: string,
): string {
  return cn(base, variants[variant], sizes[size], className);
}
