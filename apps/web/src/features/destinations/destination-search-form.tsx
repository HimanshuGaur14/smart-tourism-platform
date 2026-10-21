import { Search } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Button } from '../../components/ui';
import { cn } from '../../lib/cn';

interface Props {
  initialQuery?: string;
  className?: string;
  size?: 'md' | 'lg';
  /** Keep the other Explore filters (state, category, sort) when searching. */
  preserveParams?: boolean;
}

/** Destination search that hands off to the Explore page via URL params. */
export function DestinationSearchForm({
  initialQuery = '',
  className,
  size = 'lg',
  preserveParams = false,
}: Props) {
  const [query, setQuery] = useState(initialQuery);
  const navigate = useNavigate();
  const [params] = useSearchParams();

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const q = query.trim();
    const next = new URLSearchParams(preserveParams ? params : undefined);
    next.delete('page');
    if (q) next.set('q', q);
    else next.delete('q');
    const search = next.toString().replace(/\+/g, '%20');
    navigate(search ? `/explore?${search}` : '/explore');
  }

  return (
    <form role="search" onSubmit={onSubmit} className={cn('flex w-full gap-2', className)}>
      <label htmlFor="destination-search" className="sr-only">
        Search destinations, states or districts
      </label>
      <div className="relative flex-1">
        <Search
          className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-charcoal-400"
          aria-hidden
        />
        <input
          id="destination-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Try Ziro Valley, Jharkhand or waterfalls"
          maxLength={100}
          className={cn(
            'w-full rounded-md border border-charcoal-200 bg-white pr-3 pl-11 text-charcoal-900 shadow-card placeholder:text-charcoal-400 focus-visible:border-forest-500 focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-forest-500/40',
            size === 'lg' ? 'h-13 text-base' : 'h-10 text-sm',
          )}
        />
      </div>
      <Button
        type="submit"
        variant="accent"
        size={size === 'lg' ? 'lg' : 'md'}
        className={size === 'lg' ? 'h-13' : undefined}
      >
        Search
      </Button>
    </form>
  );
}
