import {
  itineraryInputSchema,
  MAX_ITINERARY_DAYS,
  MAX_ITINERARY_ITEMS,
  type DestinationSummary,
  type Itinerary,
} from '@smart-tourism/contracts';
import { ArrowDown, ArrowUp, CalendarDays, Map as MapIcon, Plus, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
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
import { useDestinations } from '../features/destinations/api';
import { LazyDestinationMap } from '../features/destinations/lazy-map';
import {
  useDeleteItinerary,
  useItineraries,
  useItinerary,
  useSaveItinerary,
  useSavedDestinations,
} from '../features/trips/api';
import { useDocumentTitle } from '../hooks/use-document-title';
import { ApiClientError } from '../lib/api-client';

export function PlannerPage() {
  useDocumentTitle('Trip planner');
  const itineraries = useItineraries();
  return (
    <>
      <PageHeader
        eyebrow="Trip planner"
        title="Your itineraries"
        description="Pick destinations, put them in order and assign days. Suggestions are not generated automatically."
        actions={
          <ButtonLink to="/planner/new">
            <Plus className="size-4" aria-hidden /> New itinerary
          </ButtonLink>
        }
      />
      <Container className="py-10">
        {itineraries.isPending ? (
          <LoadingState label="Loading itineraries…" />
        ) : itineraries.isError ? (
          <ErrorState
            title="We couldn’t load your itineraries"
            onRetry={() => void itineraries.refetch()}
          />
        ) : itineraries.data.length === 0 ? (
          <EmptyState
            icon={MapIcon}
            title="No itineraries yet"
            description="Start one, then add destinations from Explore India."
            action={<ButtonLink to="/planner/new">Create an itinerary</ButtonLink>}
          />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {itineraries.data.map((it) => (
              <li key={it.id}>
                <Card className="h-full">
                  <CardBody>
                    <Link
                      to={`/planner/${it.id}`}
                      className="text-lg font-semibold text-forest-800 underline"
                    >
                      {it.title}
                    </Link>
                    <p className="mt-2 flex items-center gap-1.5 text-sm text-charcoal-600">
                      <CalendarDays className="size-4" aria-hidden />
                      {it.startDate ?? 'No date set'}
                      {it.durationDays &&
                        ` · ${it.durationDays} day${it.durationDays > 1 ? 's' : ''}`}
                    </p>
                    <p className="mt-1 text-sm text-charcoal-600">
                      {it.itemCount} stop{it.itemCount === 1 ? '' : 's'}
                    </p>
                  </CardBody>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </Container>
    </>
  );
}

interface Stop {
  destination: DestinationSummary;
  available: boolean;
  dayNumber: number | null;
  notes: string;
}

interface Draft {
  title: string;
  startDate: string;
  durationDays: string;
  interests: string;
  notes: string;
  stops: Stop[];
}

const toDraft = (it?: Itinerary): Draft => ({
  title: it?.title ?? '',
  startDate: it?.startDate ?? '',
  durationDays: it?.durationDays ? String(it.durationDays) : '',
  interests: it?.interests.join(', ') ?? '',
  notes: it?.notes ?? '',
  stops:
    it?.items.map((i) => ({
      destination: i.destination,
      available: i.available,
      dayNumber: i.dayNumber,
      notes: i.notes ?? '',
    })) ?? [],
});

export function PlannerEditorPage() {
  const { id } = useParams();
  const itinerary = useItinerary(id);
  useDocumentTitle(id ? (itinerary.data?.title ?? 'Itinerary') : 'New itinerary');

  if (id && itinerary.isPending) return <LoadingState label="Loading itinerary…" />;
  if (id && itinerary.isError) {
    const notFound = itinerary.error instanceof ApiClientError && itinerary.error.status === 404;
    return (
      <Container className="py-16">
        {notFound ? (
          <EmptyState
            title="Itinerary not found"
            action={<ButtonLink to="/planner">Back to your itineraries</ButtonLink>}
          />
        ) : (
          <ErrorState onRetry={() => void itinerary.refetch()} />
        )}
      </Container>
    );
  }
  return <ItineraryEditor key={itinerary.data?.id ?? 'new'} itinerary={itinerary.data} />;
}

function ItineraryEditor({ itinerary }: { itinerary?: Itinerary }) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(itinerary));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const save = useSaveItinerary();
  const remove = useDeleteItinerary();
  const navigate = useNavigate();

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setSaved(false);
    setDraft((d) => ({ ...d, [key]: value }));
  };
  const setStops = (fn: (s: Stop[]) => Stop[]) => set('stops', fn(draft.stops));
  const move = (i: number, by: -1 | 1) =>
    setStops((s) => {
      const next = [...s];
      [next[i], next[i + by]] = [next[i + by]!, next[i]!];
      return next;
    });
  const addStop = (destination: DestinationSummary) =>
    setStops((s) =>
      s.length >= MAX_ITINERARY_ITEMS || s.some((x) => x.destination.slug === destination.slug)
        ? s
        : [...s, { destination, available: true, dayNumber: null, notes: '' }],
    );
  const days = Number(draft.durationDays) || 0;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const input = {
      title: draft.title,
      startDate: draft.startDate || null,
      durationDays: draft.durationDays ? Number(draft.durationDays) : null,
      interests: draft.interests
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      notes: draft.notes,
      items: draft.stops.map((s) => ({
        destinationSlug: s.destination.slug,
        dayNumber: s.dayNumber,
        notes: s.notes,
      })),
    };
    const parsed = itineraryInputSchema.safeParse(input);
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [i.path.join('.'), i.message])));
      return;
    }
    setErrors({});
    try {
      const res = await save.mutateAsync({ id: itinerary?.id, input });
      setSaved(true);
      if (!itinerary) void navigate(`/planner/${res.data.id}`, { replace: true });
    } catch (error) {
      if (error instanceof ApiClientError && error.details)
        setErrors(Object.fromEntries(error.details.map((d) => [d.path, d.message])));
    }
  };

  const onDelete = async () => {
    if (!itinerary || !window.confirm(`Delete “${itinerary.title}”? This cannot be undone.`))
      return;
    await remove.mutateAsync(itinerary.id);
    void navigate('/planner', { replace: true });
  };

  const mapStops = draft.stops.map((s) => s.destination);

  return (
    <>
      <PageHeader
        eyebrow="Trip planner"
        title={itinerary ? itinerary.title : 'New itinerary'}
        actions={
          <ButtonLink to="/planner" variant="ghost">
            All itineraries
          </ButtonLink>
        }
      />
      <Container className="grid grid-cols-[minmax(0,1fr)] gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <form onSubmit={onSubmit} noValidate aria-label="Itinerary" className="min-w-0 space-y-8">
          <Card>
            <CardBody className="grid grid-cols-[minmax(0,1fr)] gap-4 p-6 sm:grid-cols-2">
              <Field label="Title" required error={errors.title} className="sm:col-span-2">
                <Input value={draft.title} onChange={(e) => set('title', e.target.value)} />
              </Field>
              <Field label="Start date" error={errors.startDate}>
                <Input
                  type="date"
                  value={draft.startDate}
                  onChange={(e) => set('startDate', e.target.value)}
                />
              </Field>
              <Field label="Number of days" error={errors.durationDays}>
                <Input
                  type="number"
                  min={1}
                  max={MAX_ITINERARY_DAYS}
                  value={draft.durationDays}
                  onChange={(e) => set('durationDays', e.target.value)}
                />
              </Field>
              <Field
                label="Interests"
                hint="Comma-separated, for example: waterfalls, food"
                error={errors.interests}
                className="sm:col-span-2"
              >
                <Input value={draft.interests} onChange={(e) => set('interests', e.target.value)} />
              </Field>
              <Field label="Notes" error={errors.notes} className="sm:col-span-2">
                <Textarea
                  rows={3}
                  value={draft.notes}
                  onChange={(e) => set('notes', e.target.value)}
                />
              </Field>
            </CardBody>
          </Card>

          <section aria-labelledby="stops-heading">
            <h2 id="stops-heading" className="text-2xl">
              Stops ({draft.stops.length})
            </h2>
            {draft.stops.length === 0 ? (
              <p className="mt-3 text-sm text-charcoal-600">
                No stops yet. Add destinations from the panel.
              </p>
            ) : (
              <ol className="mt-4 space-y-3">
                {draft.stops.map((stop, i) => (
                  <li key={stop.destination.slug}>
                    <Card>
                      <CardBody className="grid gap-3 p-4 sm:grid-cols-[1fr_auto]">
                        <div className="min-w-0">
                          <p className="font-medium">
                            {i + 1}.{' '}
                            <Link
                              to={`/destinations/${stop.destination.slug}`}
                              className="text-forest-800 underline"
                            >
                              {stop.destination.name}
                            </Link>{' '}
                            <span className="text-sm text-charcoal-500">
                              {stop.destination.state}
                            </span>
                          </p>
                          {!stop.available && (
                            <Badge tone="warning" className="mt-1">
                              No longer listed
                            </Badge>
                          )}
                          <div className="mt-3 grid gap-3 sm:grid-cols-[8rem_1fr]">
                            <Field label="Day" error={errors[`items.${i}.dayNumber`]}>
                              <Select
                                value={stop.dayNumber ?? ''}
                                onChange={(e) =>
                                  setStops((s) =>
                                    s.map((x, j) =>
                                      j === i
                                        ? {
                                            ...x,
                                            dayNumber: e.target.value
                                              ? Number(e.target.value)
                                              : null,
                                          }
                                        : x,
                                    ),
                                  )
                                }
                              >
                                <option value="">Any day</option>
                                {Array.from(
                                  { length: days || MAX_ITINERARY_DAYS },
                                  (_, d) => d + 1,
                                ).map((d) => (
                                  <option key={d} value={d}>
                                    Day {d}
                                  </option>
                                ))}
                              </Select>
                            </Field>
                            <Field label="Stop notes" error={errors[`items.${i}.notes`]}>
                              <Input
                                value={stop.notes}
                                onChange={(e) =>
                                  setStops((s) =>
                                    s.map((x, j) =>
                                      j === i ? { ...x, notes: e.target.value } : x,
                                    ),
                                  )
                                }
                              />
                            </Field>
                          </div>
                          {errors[`items.${i}.destinationSlug`] && (
                            <p className="mt-2 text-sm text-red-700">
                              {errors[`items.${i}.destinationSlug`]}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1 sm:flex-col">
                          <Button
                            size="sm"
                            variant="ghost"
                            aria-label={`Move ${stop.destination.name} up`}
                            disabled={i === 0}
                            onClick={() => move(i, -1)}
                          >
                            <ArrowUp className="size-4" aria-hidden />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            aria-label={`Move ${stop.destination.name} down`}
                            disabled={i === draft.stops.length - 1}
                            onClick={() => move(i, 1)}
                          >
                            <ArrowDown className="size-4" aria-hidden />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            aria-label={`Remove ${stop.destination.name}`}
                            onClick={() => setStops((s) => s.filter((_, j) => j !== i))}
                          >
                            <Trash2 className="size-4" aria-hidden />
                          </Button>
                        </div>
                      </CardBody>
                    </Card>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" loading={save.isPending}>
              {itinerary ? 'Save changes' : 'Create itinerary'}
            </Button>
            {itinerary && (
              <Button
                variant="secondary"
                onClick={() => void onDelete()}
                loading={remove.isPending}
              >
                Delete
              </Button>
            )}
            <span aria-live="polite" className="text-sm text-forest-800">
              {saved && 'Saved.'}
            </span>
            {save.isError && !(save.error instanceof ApiClientError && save.error.details) && (
              <span role="alert" className="text-sm text-red-700">
                {save.error.message}
              </span>
            )}
          </div>
        </form>

        <aside className="space-y-6">
          <AddStopPanel onAdd={addStop} added={draft.stops.map((s) => s.destination.slug)} />
          {mapStops.length > 0 && (
            <Card>
              <CardBody>
                <h2 className="font-sans text-sm font-semibold">Map of stops</h2>
                <p className="mt-1 text-xs text-charcoal-500">
                  Markers only. No route or travel time is calculated.
                </p>
                <LazyDestinationMap destinations={mapStops} className="mt-3 h-64 rounded-md" />
              </CardBody>
            </Card>
          )}
        </aside>
      </Container>
    </>
  );
}

function AddStopPanel({
  onAdd,
  added,
}: {
  onAdd: (d: DestinationSummary) => void;
  added: string[];
}) {
  const [q, setQ] = useState('');
  const search = useDestinations({ q: q || undefined, pageSize: 6 });
  const saved = useSavedDestinations();
  const option = (d: DestinationSummary) => (
    <li key={d.slug} className="flex items-center justify-between gap-2 py-1.5">
      <span className="min-w-0 truncate text-sm">
        {d.name} <span className="text-charcoal-500">· {d.state}</span>
      </span>
      <Button
        size="sm"
        variant="secondary"
        disabled={added.includes(d.slug)}
        aria-label={`Add ${d.name}`}
        onClick={() => onAdd(d)}
      >
        {added.includes(d.slug) ? 'Added' : 'Add'}
      </Button>
    </li>
  );
  return (
    <Card>
      <CardBody>
        <h2 className="font-sans text-sm font-semibold">Add stops</h2>
        {saved.data && saved.data.length > 0 && (
          <>
            <h3 className="mt-3 text-xs font-medium tracking-wide text-charcoal-500 uppercase">
              Saved
            </h3>
            <ul>{saved.data.map(option)}</ul>
          </>
        )}
        <Field label="Search destinations" className="mt-4">
          <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} />
        </Field>
        {search.isError ? (
          <p className="mt-2 text-sm text-red-700">Search failed.</p>
        ) : (
          <ul className="mt-2">{search.data?.data.map(option)}</ul>
        )}
      </CardBody>
    </Card>
  );
}
