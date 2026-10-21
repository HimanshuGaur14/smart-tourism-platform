import { isRouteErrorResponse, useRouteError } from 'react-router';
import { ButtonLink, Container, ErrorState } from '../components/ui';
import { NotFoundPage } from './not-found-page';

/** Catches render and loader errors so users never see a blank screen. */
export function RouteError() {
  const error = useRouteError();
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundPage />;

  return (
    <Container className="py-20">
      <ErrorState
        title="This page failed to load"
        description="Please refresh, or return to the home page."
        action={<ButtonLink to="/">Go to home</ButtonLink>}
      />
    </Container>
  );
}
