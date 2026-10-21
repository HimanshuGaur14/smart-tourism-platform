import {
  destinationCategorySlugs,
  destinationInputSchema,
  moderationStatusSchema,
  type AdminDestination,
  type Category,
  type ModerationStatus,
} from '@smart-tourism/contracts';
import { CheckCircle2, ExternalLink, Plus, XCircle } from 'lucide-react';
import { useState, type FormEvent, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { Link, NavLink, useNavigate, useParams } from 'react-router';
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  CardBody,
  Container,
  EmptyState,
  ErrorState,
  Field,
  Input,
  LoadingState,
  PageHeader,
  Select,
  Textarea,
} from '../components/ui';
import {
  useAdminCategories,
  useAdminDestination,
  useAdminDestinations,
  useAdminOverview,
  useDeleteDestination,
  useModerate,
  useModerationQueue,
  useSaveCategory,
  useSaveDestination,
} from '../features/admin/api';
import { categoryMeta } from '../features/destinations/categories';
import { listingTypeLabels } from '../features/marketplace/api';
import { SampleBadge } from '../features/marketplace/listing-card';
import { useDocumentTitle } from '../hooks/use-document-title';
import { ApiClientError } from '../lib/api-client';
import { cn } from '../lib/cn';
import { ModerationBadge } from './vendor-pages';

function AdminShell({
  title,
  actions,
  children,
}: {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  useDocumentTitle(`Admin · ${title}`);
  const tabs = [
    ['/admin', 'Overview & moderation'],
    ['/admin/destinations', 'Destinations'],
    ['/admin/categories', 'Categories'],
  ] as const;
  return (
    <>
      <PageHeader eyebrow="Administration" title={title} actions={actions} />
      <div className="border-b border-charcoal-100 bg-white">
        <Container>
          <nav aria-label="Admin sections" className="-mb-px flex gap-1 overflow-x-auto">
            {tabs.map(([to, label]) => (
              <NavLink
                key={to}
                to={to}
                end
                className={({ isActive }) =>
                  cn(
                    'border-b-2 px-3 py-3 text-sm font-medium whitespace-nowrap',
                    isActive
                      ? 'border-forest-700 text-forest-800'
                      : 'border-transparent text-charcoal-600 hover:text-charcoal-900',
                  )
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
        </Container>
      </div>
      <Container className="py-10">{children}</Container>
    </>
  );
}

function Stat({ label, value, note }: { label: string; value: number | string; note?: string }) {
  return (
    <Card>
      <CardBody>
        <p className="text-sm text-charcoal-500">{label}</p>
        <p className="mt-1 font-display text-3xl text-charcoal-900">{value}</p>
        {note && <p className="mt-1 text-xs text-charcoal-500">{note}</p>}
      </CardBody>
    </Card>
  );
}

export function AdminOverviewPage() {
  const overview = useAdminOverview();
  const [status, setStatus] = useState<ModerationStatus | 'ALL'>('PENDING');
  const [page, setPage] = useState(1);
  const queue = useModerationQueue(status, page);
  const moderate = useModerate();
  const [notes, setNotes] = useState<Record<string, string>>({});

  return (
    <AdminShell title="Overview">
      <section aria-labelledby="platform-heading">
        <h2 id="platform-heading" className="text-2xl">
          Platform activity
        </h2>
        <p className="mt-1 text-sm text-charcoal-500">
          Real counts from the database. Visitor figures live on the Tourism intelligence page and
          are demo data.
        </p>
        <div className="mt-4">
          {overview.isPending ? (
            <LoadingState />
          ) : overview.isError ? (
            <ErrorState onRetry={() => void overview.refetch()} />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Stat
                label="Published destinations"
                value={overview.data.destinations.published}
                note={`${overview.data.destinations.unpublished} unpublished`}
              />
              <Stat
                label="Live listings"
                value={overview.data.listings.approvedActive}
                note={`${overview.data.listings.pending} awaiting review · ${overview.data.listings.sample} samples`}
              />
              <Stat
                label="Enquiries"
                value={overview.data.enquiries.total}
                note={`${overview.data.enquiries.last30Days} in the last 30 days`}
              />
              <Stat
                label="Accounts"
                value={overview.data.users.tourists + overview.data.users.vendors}
                note={`${overview.data.users.tourists} travellers · ${overview.data.users.vendors} vendors`}
              />
            </div>
          )}
        </div>
      </section>

      <section aria-labelledby="moderation-heading" className="mt-12">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="moderation-heading" className="text-2xl">
            Listing moderation
          </h2>
          <Field label="Show">
            <Select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as ModerationStatus | 'ALL');
                setPage(1);
              }}
            >
              {moderationStatusSchema.options.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0) + s.slice(1).toLowerCase()}
                </option>
              ))}
              <option value="ALL">All</option>
            </Select>
          </Field>
        </div>
        <div className="mt-4">
          {queue.isPending ? (
            <LoadingState />
          ) : queue.isError ? (
            <ErrorState onRetry={() => void queue.refetch()} />
          ) : queue.data.data.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="Nothing to review"
              description="New and edited listings will appear here."
            />
          ) : (
            <ul className="space-y-3">
              {queue.data.data.map((l) => (
                <li key={l.id}>
                  <Card>
                    <CardBody className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          to={`/marketplace/${l.slug}`}
                          className="font-medium text-forest-800 underline"
                        >
                          {l.title}
                        </Link>
                        <ModerationBadge listing={l} />
                        {l.isSample && <SampleBadge />}
                      </div>
                      <p className="text-sm text-charcoal-500">
                        {listingTypeLabels[l.type]} · {l.district}, {l.state} · by {l.vendor.name} ·
                        updated {new Date(l.updatedAt).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-charcoal-700">{l.summary}</p>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                        <Field label="Note to vendor (optional)" className="flex-1">
                          <Input
                            value={notes[l.id] ?? ''}
                            onChange={(e) => setNotes((n) => ({ ...n, [l.id]: e.target.value }))}
                            maxLength={500}
                          />
                        </Field>
                        <div className="flex gap-2">
                          <Button
                            size="md"
                            leadingIcon={<CheckCircle2 className="size-4" aria-hidden />}
                            disabled={moderate.isPending || l.moderationStatus === 'APPROVED'}
                            onClick={() =>
                              moderate.mutate({
                                id: l.id,
                                moderationStatus: 'APPROVED',
                                moderationNote: notes[l.id],
                              })
                            }
                            aria-label={`Approve ${l.title}`}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="secondary"
                            leadingIcon={<XCircle className="size-4" aria-hidden />}
                            disabled={moderate.isPending || l.moderationStatus === 'REJECTED'}
                            onClick={() =>
                              moderate.mutate({
                                id: l.id,
                                moderationStatus: 'REJECTED',
                                moderationNote: notes[l.id],
                              })
                            }
                            aria-label={`Reject ${l.title}`}
                          >
                            Reject
                          </Button>
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                </li>
              ))}
            </ul>
          )}
          {queue.data && queue.data.meta.totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-3">
              <Button variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                Previous
              </Button>
              <span className="text-sm">
                Page {page} of {queue.data.meta.totalPages}
              </span>
              <Button
                variant="secondary"
                disabled={page >= queue.data.meta.totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          )}
          {moderate.isError && (
            <p role="alert" className="mt-3 text-sm text-red-700">
              {moderate.error.message}
            </p>
          )}
        </div>
      </section>
    </AdminShell>
  );
}

export function AdminDestinationsPage() {
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const list = useAdminDestinations(query, page);
  const save = useSaveDestination();

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    setQuery(q.trim());
    setPage(1);
  };

  return (
    <AdminShell
      title="Destinations"
      actions={
        <ButtonLink to="/admin/destinations/new">
          <Plus className="size-4" aria-hidden /> New destination
        </ButtonLink>
      }
    >
      <form role="search" onSubmit={onSearch} className="flex max-w-lg items-end gap-2">
        <Field label="Search by name, state or slug" className="flex-1">
          <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} />
        </Field>
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>
      <div className="mt-6">
        {list.isPending ? (
          <LoadingState />
        ) : list.isError ? (
          <ErrorState onRetry={() => void list.refetch()} />
        ) : list.data.data.length === 0 ? (
          <EmptyState title="No destinations found" />
        ) : (
          <div className="overflow-x-auto rounded-card border border-charcoal-100 bg-white">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Destinations</caption>
              <thead className="border-b border-charcoal-100 bg-ivory-100 text-charcoal-600">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Name
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    State
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Category
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-charcoal-100">
                {list.data.data.map((d) => (
                  <tr key={d.id}>
                    <td className="px-4 py-3 font-medium">{d.name}</td>
                    <td className="px-4 py-3">{d.state}</td>
                    <td className="px-4 py-3">{d.category.name}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        <Badge tone={d.published ? 'forest' : 'neutral'}>
                          {d.published ? 'Published' : 'Hidden'}
                        </Badge>
                        {d.featured && <Badge tone="info">Featured</Badge>}
                        {!d.coordinatesVerified && (
                          <Badge tone="warning">Unverified location</Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={save.isPending}
                          onClick={() =>
                            save.mutate({ id: d.id, input: { published: !d.published } })
                          }
                          aria-label={`${d.published ? 'Unpublish' : 'Publish'} ${d.name}`}
                        >
                          {d.published ? 'Unpublish' : 'Publish'}
                        </Button>
                        <ButtonLink
                          to={`/admin/destinations/${d.id}`}
                          variant="secondary"
                          size="sm"
                          aria-label={`Edit ${d.name}`}
                        >
                          Edit
                        </ButtonLink>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {list.data && list.data.meta.totalPages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-3">
            <Button variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Previous
            </Button>
            <span className="text-sm">
              Page {page} of {list.data.meta.totalPages}
            </span>
            <Button
              variant="secondary"
              disabled={page >= list.data.meta.totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </AdminShell>
  );
}

interface DestinationFormValues {
  slug: string;
  name: string;
  state: string;
  district: string;
  category: string;
  shortDescription: string;
  description: string;
  latitude: string;
  longitude: string;
  tags: string;
  bestTimeToVisit: string;
  responsibleTips: string;
  sourceUrls: string;
  coordinatesVerified: boolean;
  featured: boolean;
  hiddenGem: boolean;
  published: boolean;
}

const splitLines = (v: string) =>
  v
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);

function toFormValues(d?: AdminDestination): DestinationFormValues {
  return {
    slug: d?.slug ?? '',
    name: d?.name ?? '',
    state: d?.state ?? '',
    district: d?.district ?? '',
    category: d?.category.slug ?? 'nature',
    shortDescription: d?.shortDescription ?? '',
    description: d?.description ?? '',
    latitude: d ? String(d.latitude) : '',
    longitude: d ? String(d.longitude) : '',
    tags: d?.tags.join(', ') ?? '',
    bestTimeToVisit: d?.bestTimeToVisit ?? '',
    responsibleTips: d?.responsibleTips.join('\n') ?? '',
    sourceUrls: d?.sourceUrls.join('\n') ?? '',
    coordinatesVerified: d?.coordinatesVerified ?? false,
    featured: d?.featured ?? false,
    hiddenGem: d?.hiddenGem ?? false,
    published: d?.published ?? true,
  };
}

function DestinationForm({ destination }: { destination?: AdminDestination }) {
  const navigate = useNavigate();
  const save = useSaveDestination();
  const remove = useDeleteDestination();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<DestinationFormValues>({ defaultValues: toFormValues(destination) });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit(async (v) => {
    setFormError(null);
    const candidate = {
      ...v,
      latitude: v.latitude === '' ? Number.NaN : Number(v.latitude),
      longitude: v.longitude === '' ? Number.NaN : Number(v.longitude),
      tags: v.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      responsibleTips: splitLines(v.responsibleTips),
      sourceUrls: splitLines(v.sourceUrls),
      bestTimeToVisit: v.bestTimeToVisit.trim() || null,
    };
    const parsed = destinationInputSchema.safeParse(candidate);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        form.setError(String(issue.path[0]) as keyof DestinationFormValues, {
          message: issue.message,
        });
      }
      return;
    }
    try {
      await save.mutateAsync({ id: destination?.id, input: parsed.data });
      navigate('/admin/destinations');
    } catch (error) {
      if (error instanceof ApiClientError) {
        for (const d of error.details ?? [])
          form.setError(d.path as keyof DestinationFormValues, { message: d.message });
        setFormError(error.message);
      } else setFormError('Something went wrong.');
    }
  });

  const text = (
    name: keyof DestinationFormValues,
    label: string,
    opts: { hint?: string; required?: boolean; multiline?: boolean } = {},
  ) => (
    <Field label={label} hint={opts.hint} required={opts.required} error={errors[name]?.message}>
      {opts.multiline ? (
        <Textarea rows={4} {...form.register(name)} />
      ) : (
        <Input {...form.register(name)} />
      )}
    </Field>
  );

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {formError && (
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          {formError}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {text('name', 'Name', { required: true })}
        {text('slug', 'Slug', { required: true, hint: 'Lowercase, hyphens. Used in the URL.' })}
        {text('state', 'State or union territory', { required: true })}
        {text('district', 'District', { required: true })}
        <Field label="Category" required error={errors.category?.message}>
          <Select {...form.register('category')}>
            {destinationCategorySlugs.map((s) => (
              <option key={s} value={s}>
                {categoryMeta.find((c) => c.slug === s)?.label ?? s}
              </option>
            ))}
          </Select>
        </Field>
        {text('bestTimeToVisit', 'Best time to visit')}
        {text('latitude', 'Latitude', { required: true, hint: 'Decimal degrees, e.g. 23.47' })}
        {text('longitude', 'Longitude', { required: true, hint: 'Decimal degrees, e.g. 84.27' })}
      </div>
      {text('shortDescription', 'Short description', { required: true })}
      {text('description', 'Description', { required: true, multiline: true })}
      {text('tags', 'Tags', { hint: 'Comma separated' })}
      {text('responsibleTips', 'Responsible travel tips', {
        multiline: true,
        hint: 'One per line',
      })}
      {text('sourceUrls', 'Source URLs', {
        multiline: true,
        hint: 'One per line. Cite where facts and coordinates were checked.',
      })}
      <fieldset className="flex flex-wrap gap-x-6 gap-y-2">
        <legend className="mb-2 text-sm font-medium">Flags</legend>
        {(
          [
            ['published', 'Published'],
            ['featured', 'Featured'],
            ['hiddenGem', 'Hidden gem'],
            ['coordinatesVerified', 'Coordinates verified against a source'],
          ] as const
        ).map(([name, label]) => (
          <label key={name} className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" className="size-4 accent-forest-700" {...form.register(name)} />
            {label}
          </label>
        ))}
      </fieldset>
      <div className="flex flex-wrap gap-3">
        <Button type="submit" loading={save.isPending}>
          {destination ? 'Save changes' : 'Create destination'}
        </Button>
        {destination && (
          <>
            <ButtonLink to={`/destinations/${destination.slug}`} variant="secondary">
              View <ExternalLink className="size-4" aria-hidden />
            </ButtonLink>
            <Button
              variant="ghost"
              loading={remove.isPending}
              onClick={() => {
                if (window.confirm(`Delete ${destination.name}? This cannot be undone.`)) {
                  remove.mutate(destination.id, {
                    onSuccess: () => navigate('/admin/destinations'),
                    onError: (e) => setFormError(e.message),
                  });
                }
              }}
            >
              Delete
            </Button>
          </>
        )}
      </div>
    </form>
  );
}

export function AdminDestinationEditorPage() {
  const { id } = useParams();
  const all = useAdminDestination(id);
  const destination = id ? all.data : undefined;

  return (
    <AdminShell title={id ? 'Edit destination' : 'New destination'}>
      <Card className="max-w-4xl">
        <CardBody className="p-6">
          {id && all.isPending ? (
            <LoadingState />
          ) : id && all.isError ? (
            <ErrorState onRetry={() => void all.refetch()} />
          ) : id && !destination ? (
            <EmptyState title="Destination not found" />
          ) : (
            <DestinationForm key={destination?.id ?? 'new'} destination={destination} />
          )}
        </CardBody>
      </Card>
    </AdminShell>
  );
}

function CategoryRow({ category }: { category: Category }) {
  const save = useSaveCategory();
  const [name, setName] = useState(category.name);
  const [description, setDescription] = useState(category.description);
  const dirty = name !== category.name || description !== category.description;
  return (
    <li className="grid gap-3 p-4 sm:grid-cols-[12rem_1fr_auto] sm:items-end">
      <Field label={`Name (${category.slug})`}>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Description">
        <Input value={description} onChange={(e) => setDescription(e.target.value)} />
      </Field>
      <div className="flex items-center gap-2">
        <span className="text-xs text-charcoal-500">{category.destinationCount} published</span>
        <Button
          size="md"
          disabled={!dirty}
          loading={save.isPending}
          onClick={() => save.mutate({ slug: category.slug, input: { name, description } })}
        >
          Save
        </Button>
      </div>
      {save.isError && (
        <p role="alert" className="text-sm text-red-700 sm:col-span-3">
          {save.error.message}
        </p>
      )}
    </li>
  );
}

export function AdminCategoriesPage() {
  const categories = useAdminCategories();
  return (
    <AdminShell title="Categories">
      <p className="mb-4 max-w-2xl text-sm text-charcoal-600">
        The category list is fixed so filters and icons stay consistent; names and descriptions can
        be edited.
      </p>
      {categories.isPending ? (
        <LoadingState />
      ) : categories.isError ? (
        <ErrorState onRetry={() => void categories.refetch()} />
      ) : (
        <ul className="divide-y divide-charcoal-100 rounded-card border border-charcoal-100 bg-white">
          {categories.data.map((c) => (
            <CategoryRow key={c.slug} category={c} />
          ))}
        </ul>
      )}
    </AdminShell>
  );
}
