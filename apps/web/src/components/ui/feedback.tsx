import { AlertTriangle, Loader2, SearchX, type LucideIcon } from 'lucide-react';
import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { Button } from './button';

export function Spinner({ className, label = 'Loading' }: { className?: string; label?: string }) {
  return (
    <span role="status" className={cn('inline-flex items-center', className)}>
      <Loader2 className="size-5 animate-spin text-forest-600" aria-hidden />
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn('animate-pulse rounded-md bg-charcoal-100/70', className)}
      {...props}
    />
  );
}

interface StateProps {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  icon?: LucideIcon;
  className?: string;
}

function StatePanel({
  title,
  description,
  action,
  icon: Icon,
  className,
  tone,
  role,
}: StateProps & { tone: 'neutral' | 'error'; role?: string }) {
  return (
    <div
      role={role}
      className={cn(
        'flex flex-col items-center rounded-card border border-dashed px-6 py-12 text-center',
        tone === 'error' ? 'border-red-200 bg-red-50/40' : 'border-charcoal-200 bg-ivory-100/60',
        className,
      )}
    >
      {Icon && (
        <Icon
          className={cn('mb-3 size-8', tone === 'error' ? 'text-red-700' : 'text-charcoal-400')}
          aria-hidden
        />
      )}
      <h3 className="font-sans text-base font-semibold text-charcoal-900">{title}</h3>
      {description && <div className="mt-1 max-w-md text-sm text-charcoal-600">{description}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function EmptyState({ icon = SearchX, ...props }: StateProps) {
  return <StatePanel tone="neutral" icon={icon} {...props} />;
}

export function ErrorState({
  title = 'Something went wrong',
  onRetry,
  ...props
}: Partial<StateProps> & { onRetry?: () => void }) {
  return (
    <StatePanel
      tone="error"
      role="alert"
      icon={AlertTriangle}
      title={title}
      action={
        onRetry ? (
          <Button variant="secondary" size="sm" onClick={onRetry}>
            Try again
          </Button>
        ) : (
          props.action
        )
      }
      {...props}
    />
  );
}

export function LoadingState({
  label = 'Loading…',
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-center gap-3 py-12 text-sm text-charcoal-600',
        className,
      )}
    >
      <Spinner label={label} />
      <span aria-hidden>{label}</span>
    </div>
  );
}
