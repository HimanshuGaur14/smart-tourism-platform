import { enquiryStatusSchema, type OwnedListing } from '@smart-tourism/contracts';
import { Inbox, Pencil, Plus, Store, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  CardBody,
  Container,
  Dialog,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  Select,
} from '../components/ui';
import {
  listingTypeLabels,
  useDeleteListing,
  useMyListings,
  useReceivedEnquiries,
  useSaveListing,
  useSetEnquiryStatus,
} from '../features/marketplace/api';
import { SampleBadge } from '../features/marketplace/listing-card';
import { ListingForm } from '../features/vendor/listing-form';
import { useDocumentTitle } from '../hooks/use-document-title';
import { enquiryStatusTone } from '../features/marketplace/api';

export function ModerationBadge({ listing }: { listing: OwnedListing }) {
  if (listing.moderationStatus === 'REJECTED') return <Badge tone="danger">Rejected</Badge>;
  if (listing.moderationStatus === 'PENDING') return <Badge tone="warning">Awaiting review</Badge>;
  return listing.isActive ? <Badge tone="forest">Live</Badge> : <Badge>Paused</Badge>;
}

function ListingRow({ listing }: { listing: OwnedListing }) {
  const save = useSaveListing();
  const remove = useDeleteListing();
  const [confirm, setConfirm] = useState(false);

  return (
    <li className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to={`/marketplace/${listing.slug}`}
            className="font-medium text-forest-800 underline"
          >
            {listing.title}
          </Link>
          <ModerationBadge listing={listing} />
          {listing.isSample && <SampleBadge />}
        </div>
        <p className="mt-1 text-sm text-charcoal-500">
          {listingTypeLabels[listing.type]} · {listing.district}, {listing.state} ·{' '}
          {listing.enquiryCount} {listing.enquiryCount === 1 ? 'enquiry' : 'enquiries'}
        </p>
        {listing.moderationNote && (
          <p className="mt-1 text-sm text-red-800">Reviewer note: {listing.moderationNote}</p>
        )}
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        <Button
          variant="secondary"
          size="sm"
          loading={save.isPending}
          onClick={() => save.mutate({ id: listing.id, input: { isActive: !listing.isActive } })}
          aria-label={`${listing.isActive ? 'Pause' : 'Activate'} ${listing.title}`}
        >
          {listing.isActive ? 'Pause' : 'Activate'}
        </Button>
        <ButtonLink
          to={`/vendor/listings/${listing.id}/edit`}
          variant="secondary"
          size="sm"
          aria-label={`Edit ${listing.title}`}
        >
          <Pencil className="size-4" aria-hidden /> Edit
        </ButtonLink>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setConfirm(true)}
          aria-label={`Delete ${listing.title}`}
          leadingIcon={<Trash2 className="size-4" aria-hidden />}
        >
          Delete
        </Button>
      </div>
      <Dialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Delete this listing?"
        description="It and its enquiries will be permanently removed."
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={remove.isPending}
              onClick={() => remove.mutate(listing.id, { onSuccess: () => setConfirm(false) })}
            >
              Delete
            </Button>
          </>
        }
      />
      {(save.isError || remove.isError) && (
        <p role="alert" className="text-sm text-red-700">
          {(save.error ?? remove.error)?.message}
        </p>
      )}
    </li>
  );
}

export function VendorDashboardPage() {
  useDocumentTitle('Vendor dashboard');
  const listings = useMyListings();
  const enquiries = useReceivedEnquiries();
  const setStatus = useSetEnquiryStatus();

  return (
    <>
      <PageHeader
        eyebrow="Vendor dashboard"
        title="Your listings"
        description="Create listings, pause them when you’re unavailable, and reply to enquiries."
        actions={
          <ButtonLink to="/vendor/listings/new">
            <Plus className="size-4" aria-hidden /> New listing
          </ButtonLink>
        }
      />
      <Container className="space-y-12 py-10">
        <section aria-labelledby="listings-heading">
          <h2 id="listings-heading" className="text-2xl">
            Listings
          </h2>
          <div className="mt-4">
            {listings.isPending ? (
              <LoadingState label="Loading listings…" />
            ) : listings.isError ? (
              <ErrorState
                title="We couldn’t load your listings"
                onRetry={() => void listings.refetch()}
              />
            ) : listings.data.length === 0 ? (
              <EmptyState
                icon={Store}
                title="No listings yet"
                description="Create your first listing. It goes live after a quick review."
                action={<ButtonLink to="/vendor/listings/new">Create a listing</ButtonLink>}
              />
            ) : (
              <ul className="divide-y divide-charcoal-100 rounded-card border border-charcoal-100 bg-white">
                {listings.data.map((l) => (
                  <ListingRow key={l.id} listing={l} />
                ))}
              </ul>
            )}
          </div>
        </section>

        <section aria-labelledby="enquiries-heading">
          <h2 id="enquiries-heading" className="text-2xl">
            Enquiries received
          </h2>
          <div className="mt-4">
            {enquiries.isPending ? (
              <LoadingState label="Loading enquiries…" />
            ) : enquiries.isError ? (
              <ErrorState
                title="We couldn’t load enquiries"
                onRetry={() => void enquiries.refetch()}
              />
            ) : enquiries.data.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title="No enquiries yet"
                description="Enquiries about your live listings will appear here."
              />
            ) : (
              <ul className="space-y-3">
                {enquiries.data.map((e) => (
                  <li key={e.id}>
                    <Card>
                      <CardBody className="flex flex-col gap-3 sm:flex-row sm:justify-between">
                        <div className="min-w-0">
                          <p className="text-sm text-charcoal-500">
                            {e.listing.title} · {new Date(e.createdAt).toLocaleDateString()}
                          </p>
                          <p className="mt-1 font-medium">
                            {e.name} ·{' '}
                            <a href={`mailto:${e.email}`} className="text-forest-700 underline">
                              {e.email}
                            </a>
                            {e.phone && ` · ${e.phone}`}
                          </p>
                          <p className="mt-2 whitespace-pre-line text-charcoal-700">{e.message}</p>
                          <p className="mt-1 text-xs text-charcoal-500">
                            {e.travelDate ? `Travel date ${e.travelDate}` : 'No travel date'}
                            {e.groupSize ? ` · group of ${e.groupSize}` : ''}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-start gap-2">
                          <Badge tone={enquiryStatusTone[e.status]} className="mt-2">
                            {e.status.toLowerCase()}
                          </Badge>
                          <Select
                            aria-label={`Status for enquiry from ${e.name}`}
                            value={e.status}
                            className="w-36"
                            onChange={(ev) =>
                              setStatus.mutate({
                                id: e.id,
                                status: enquiryStatusSchema.parse(ev.target.value),
                              })
                            }
                          >
                            <option value="NEW">New</option>
                            <option value="RESPONDED">Responded</option>
                            <option value="CLOSED">Closed</option>
                          </Select>
                        </div>
                      </CardBody>
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </Container>
    </>
  );
}

export function VendorListingEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const listings = useMyListings();
  useDocumentTitle(id ? 'Edit listing' : 'New listing');
  const listing = id ? listings.data?.find((l) => l.id === id) : undefined;

  return (
    <>
      <PageHeader eyebrow="Vendor dashboard" title={id ? 'Edit listing' : 'New listing'} />
      <Container className="max-w-3xl py-10">
        {id && listings.isPending ? (
          <LoadingState />
        ) : id && listings.isError ? (
          <ErrorState onRetry={() => void listings.refetch()} />
        ) : id && !listing ? (
          <EmptyState
            title="Listing not found"
            description="It may have been deleted, or it belongs to another account."
            action={<ButtonLink to="/vendor">Back to dashboard</ButtonLink>}
          />
        ) : (
          <Card>
            <CardBody className="p-6">
              <ListingForm listing={listing} onSaved={() => navigate('/vendor')} />
            </CardBody>
          </Card>
        )}
      </Container>
    </>
  );
}
