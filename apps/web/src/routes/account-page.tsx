import { Bookmark, Inbox } from 'lucide-react';
import { Link } from 'react-router';
import {
  Badge,
  ButtonLink,
  Container,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
} from '../components/ui';
import { DestinationCard, DestinationGrid } from '../features/destinations/destination-card';
import { useSavedDestinations } from '../features/trips/api';
import { useSession } from '../features/auth/session';
import { useMyEnquiries, enquiryStatusTone } from '../features/marketplace/api';
import { useDocumentTitle } from '../hooks/use-document-title';

export function AccountPage() {
  useDocumentTitle('Your account');
  const { user } = useSession();
  const enquiries = useMyEnquiries();

  return (
    <>
      <PageHeader
        eyebrow="Your account"
        title={`Hello, ${user?.name ?? ''}`}
        description={user?.email}
      />
      <Container className="py-10">
        <h2 className="text-2xl">Enquiries you’ve sent</h2>
        <div className="mt-5">
          {enquiries.isPending ? (
            <LoadingState label="Loading enquiries…" />
          ) : enquiries.isError ? (
            <ErrorState
              title="We couldn’t load your enquiries"
              onRetry={() => void enquiries.refetch()}
            />
          ) : enquiries.data.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="No enquiries yet"
              description="Find a homestay, guide or artisan and send them a message."
              action={<ButtonLink to="/marketplace">Browse the marketplace</ButtonLink>}
            />
          ) : (
            <ul className="divide-y divide-charcoal-100 rounded-card border border-charcoal-100 bg-white">
              {enquiries.data.map((e) => (
                <li
                  key={e.id}
                  className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0">
                    <Link
                      to={`/marketplace/${e.listing.slug}`}
                      className="font-medium text-forest-800 underline"
                    >
                      {e.listing.title}
                    </Link>
                    <p className="mt-1 line-clamp-2 text-sm text-charcoal-600">{e.message}</p>
                    <p className="mt-1 text-xs text-charcoal-500">
                      Sent {new Date(e.createdAt).toLocaleDateString()}
                      {e.travelDate && ` · travelling ${e.travelDate}`}
                    </p>
                  </div>
                  <Badge tone={enquiryStatusTone[e.status]}>{e.status.toLowerCase()}</Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
        <SavedSection />
        <p className="mt-10 text-sm text-charcoal-600">
          Your itineraries are in the{' '}
          <Link to="/planner" className="font-medium text-forest-800 underline">
            trip planner
          </Link>
          .
        </p>
      </Container>
    </>
  );
}

function SavedSection() {
  const saved = useSavedDestinations();
  return (
    <section className="mt-12" aria-labelledby="saved-heading">
      <h2 id="saved-heading" className="text-2xl">
        Saved destinations
      </h2>
      <div className="mt-5">
        {saved.isPending ? (
          <LoadingState label="Loading saved destinations…" />
        ) : saved.isError ? (
          <ErrorState
            title="We couldn’t load your saved destinations"
            onRetry={() => void saved.refetch()}
          />
        ) : saved.data.length === 0 ? (
          <EmptyState
            icon={Bookmark}
            title="Nothing saved yet"
            description="Use the Save button on any destination page."
            action={<ButtonLink to="/explore">Explore India</ButtonLink>}
          />
        ) : (
          <DestinationGrid>
            {saved.data.map((d) => (
              <li key={d.slug}>
                <DestinationCard destination={d} />
              </li>
            ))}
          </DestinationGrid>
        )}
      </div>
    </section>
  );
}
