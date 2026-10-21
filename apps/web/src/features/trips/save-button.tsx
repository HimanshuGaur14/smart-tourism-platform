import { Bookmark, BookmarkCheck } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import { Button } from '../../components/ui';
import { useSession } from '../auth/session';
import { useSavedDestinations, useToggleSaved } from './api';

/** Save/unsave toggle. Signed-out visitors are sent to sign in first. */
export function SaveDestinationButton({ slug, name }: { slug: string; name: string }) {
  const { user } = useSession();
  const saved = useSavedDestinations(!!user);
  const toggle = useToggleSaved();
  const navigate = useNavigate();
  const location = useLocation();
  const isSaved = !!saved.data?.some((d) => d.slug === slug);

  if (!user) {
    return (
      <Button
        variant="secondary"
        leadingIcon={<Bookmark className="size-4" aria-hidden />}
        onClick={() => void navigate(`/login?next=${encodeURIComponent(location.pathname)}`)}
      >
        Sign in to save
      </Button>
    );
  }
  return (
    <div className="flex items-center gap-3">
      <Button
        variant={isSaved ? 'primary' : 'secondary'}
        aria-pressed={isSaved}
        loading={toggle.isPending}
        disabled={saved.isPending}
        leadingIcon={
          isSaved ? (
            <BookmarkCheck className="size-4" aria-hidden />
          ) : (
            <Bookmark className="size-4" aria-hidden />
          )
        }
        onClick={() => toggle.mutate({ slug, saved: isSaved })}
      >
        {isSaved ? 'Saved' : `Save ${name}`}
      </Button>
      {toggle.isError && (
        <span role="alert" className="text-sm text-red-700">
          Couldn’t update. Try again.
        </span>
      )}
    </div>
  );
}
