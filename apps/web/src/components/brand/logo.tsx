import { Link } from 'react-router';
import { cn } from '../../lib/cn';

export const BRAND_NAME = 'Yatra Atlas';

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn('size-8', className)} aria-hidden>
      <rect width="32" height="32" rx="7" fill="var(--color-forest-700)" />
      <path d="M5 23l7-9 5 6 3-4 7 7z" fill="var(--color-ivory-100)" />
      <circle cx="22" cy="10" r="3" fill="var(--color-terracotta-400)" />
    </svg>
  );
}

export function Logo({ className, inverted = false }: { className?: string; inverted?: boolean }) {
  return (
    <Link to="/" className={cn('inline-flex items-center gap-2.5 rounded', className)}>
      <LogoMark />
      <span
        className={cn(
          'font-display text-xl font-medium tracking-tight',
          inverted ? 'text-ivory-50' : 'text-charcoal-900',
        )}
      >
        {BRAND_NAME}
      </span>
    </Link>
  );
}
