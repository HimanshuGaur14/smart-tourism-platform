import { useDocumentTitle } from '../hooks/use-document-title';
import { MapPinOff } from 'lucide-react';
import { ButtonLink, Container, EmptyState } from '../components/ui';

export function NotFoundPage() {
  useDocumentTitle('Page not found');
  return (
    <Container className="py-20">
      <EmptyState
        icon={MapPinOff}
        title="We couldn’t find that page"
        description="The link may be broken or the page may have moved."
        action={<ButtonLink to="/">Go to home</ButtonLink>}
      />
    </Container>
  );
}
