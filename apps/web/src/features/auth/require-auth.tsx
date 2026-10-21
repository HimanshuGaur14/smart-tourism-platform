import type { UserRole } from '@smart-tourism/contracts';
import { ShieldAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { ButtonLink, Container, EmptyState, ErrorState, LoadingState } from '../../components/ui';
import { useSession } from './session';

/**
 * Client-side guard for pages. It only improves the experience: every API call behind
 * these pages is also checked on the server.
 */
export function RequireAuth({ roles, children }: { roles?: UserRole[]; children: ReactNode }) {
  const session = useSession();
  const location = useLocation();

  if (session.isPending) return <LoadingState label="Checking your session…" />;
  if (session.isError) {
    return (
      <Container className="py-16">
        <ErrorState title="We couldn’t check your session" onRetry={() => void session.refetch()} />
      </Container>
    );
  }
  if (!session.user) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  if (roles && !session.hasRole(...roles)) {
    return (
      <Container className="py-16">
        <EmptyState
          icon={ShieldAlert}
          title="You don’t have access to this page"
          description="This area is for a different type of account."
          action={<ButtonLink to="/">Go to home</ButtonLink>}
        />
      </Container>
    );
  }
  return <>{children}</>;
}
