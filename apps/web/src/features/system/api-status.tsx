import { cn } from '../../lib/cn';
import { useApiHealth } from './use-api-health';

/** Small, honest indicator of whether the backend is reachable. */
export function ApiStatus({ className }: { className?: string }) {
  const { data, isPending, isError } = useApiHealth();

  const state = isPending ? 'checking' : isError ? 'offline' : 'online';
  const label = {
    checking: 'Checking service status…',
    offline: 'Service unreachable',
    online: `Service online · v${data?.version ?? ''}`,
  }[state];

  return (
    <p
      className={cn('inline-flex items-center gap-2 text-xs', className)}
      role="status"
      aria-live="polite"
    >
      <span
        aria-hidden
        className={cn(
          'size-2 rounded-full',
          state === 'checking' && 'animate-pulse bg-charcoal-300',
          state === 'offline' && 'bg-red-500',
          state === 'online' && 'bg-forest-400',
        )}
      />
      {label}
    </p>
  );
}
