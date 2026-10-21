import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactElement,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  cloneElement,
} from 'react';
import { cn } from '../../lib/cn';

const control =
  'block w-full rounded-md border border-charcoal-200 bg-white px-3 text-sm text-charcoal-900 placeholder:text-charcoal-400 transition-colors hover:border-charcoal-300 focus-visible:border-forest-500 focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-forest-500/40 disabled:cursor-not-allowed disabled:bg-charcoal-50 aria-invalid:border-red-600';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(control, 'h-10', className)} {...props} />;
  },
);

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, rows = 4, ...props }, ref) {
  return <textarea ref={ref} rows={rows} className={cn(control, 'py-2', className)} {...props} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...props }, ref) {
    return (
      <select ref={ref} className={cn(control, 'h-10 pr-8', className)} {...props}>
        {children}
      </select>
    );
  },
);

interface FieldProps {
  label: string;
  /** A single Input, Select or Textarea. Receives id and aria wiring automatically. */
  children: ReactElement<{ id?: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean }>;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  className?: string;
}

/** Label + control + hint/error with correct accessibility wiring. */
export function Field({ label, children, hint, error, required, className }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={id} className="block text-sm font-medium text-charcoal-800">
        {label}
        {required && (
          <span className="ml-0.5 text-terracotta-600" aria-hidden>
            *
          </span>
        )}
      </label>
      {cloneElement(children, {
        id,
        'aria-describedby': describedBy,
        'aria-invalid': error ? true : undefined,
      })}
      {hint && !error && (
        <p id={hintId} className="text-xs text-charcoal-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-xs font-medium text-red-700" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
