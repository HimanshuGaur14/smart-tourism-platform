import { AlertTriangle, ArrowRight, Info } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Badge,
  Card,
  CardBody,
  Container,
  DemoDataBadge,
  ErrorState,
  Field,
  ForecastSourceBadge,
  PageHeader,
  Select,
  Skeleton,
} from '../components/ui';
import {
  crowdLevelLabels,
  MONTH_NAMES,
  useDestinationInsights,
  useFootfall,
  useForecasts,
} from '../features/analytics/api';
import { crowdTone, forecastNote } from '../features/analytics/forecast-format';
import { useCategories, useStates } from '../features/destinations/api';
import { useDocumentTitle } from '../hooks/use-document-title';

// Colour-blind-safe categorical palette that holds contrast on the ivory background.
const SERIES_COLORS = ['#1f6f50', '#c2553a', '#2f5d9e', '#a67c00', '#7a4b94', '#4a4a4a'];
const MAX_COMPARE = 4;
const numberFmt = new Intl.NumberFormat('en-IN');
const monthLabel = (ym: string) => {
  const [y = '', m = '1'] = ym.split('-');
  return `${MONTH_NAMES[Number(m) - 1]} ${y.slice(2)}`;
};

function ChartCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardBody>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="font-sans text-base font-semibold text-charcoal-900">{title}</h2>
            <p className="mt-0.5 text-sm text-charcoal-600">{description}</p>
          </div>
          <DemoDataBadge label="Demo data" />
        </div>
        <div className="mt-4">{children}</div>
      </CardBody>
    </Card>
  );
}

export function IntelligencePage() {
  useDocumentTitle('Tourism intelligence');
  const [state, setState] = useState('');
  const [category, setCategory] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [months, setMonths] = useState(12);
  const [days, setDays] = useState(7);

  const states = useStates();
  const categories = useCategories();
  const insights = useDestinationInsights({
    state: state || undefined,
    category: category || undefined,
  });
  const ranked = [...(insights.data?.insights ?? [])].sort(
    (a, b) => b.visitorsLast12Months - a.visitorsLast12Months,
  );
  // Until the visitor picks destinations, compare the busiest few in the current filter.
  const compare = selected.length ? selected : ranked.slice(0, 3).map((i) => i.destination.slug);
  const footfall = useFootfall(compare, months);
  const forecasts = useForecasts(compare, days);

  const toggle = (slug: string) =>
    setSelected((cur) =>
      cur.includes(slug)
        ? cur.filter((s) => s !== slug)
        : cur.length >= MAX_COMPARE
          ? cur
          : [...cur, slug],
    );

  const trendRows =
    footfall.data?.months.map((month, i) => {
      const row: Record<string, string | number> = { month: monthLabel(month) };
      for (const s of footfall.data.series) row[s.destination.name] = s.points[i]?.visitors ?? 0;
      return row;
    }) ?? [];
  const seasonRows =
    footfall.data?.seasonality.map((s) => ({ month: MONTH_NAMES[s.month - 1], index: s.index })) ??
    [];
  const comparisonRows = ranked
    .slice(0, 10)
    .map((i) => ({ name: i.destination.name, visitors: i.visitorsLast12Months }));

  return (
    <Container className="py-10">
      <PageHeader
        eyebrow="Tourism intelligence"
        title="Visitor trends and crowd outlook"
        description="Explore seasonal demand, compare destinations and see where it is quieter."
        actions={<ForecastSourceBadge source={insights.data?.source ?? 'DEMO'} />}
      />

      <div
        role="note"
        className="mt-6 flex gap-3 rounded-card border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"
      >
        <Info className="mt-0.5 size-5 shrink-0" aria-hidden />
        <div>
          <p className="font-semibold">All figures on this page are illustrative demo data.</p>
          <p className="mt-1">
            {insights.data?.disclaimer ??
              'They are generated from simple seasonal patterns to demonstrate the dashboard. They are not real visitor counts or verified predictions.'}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="State / UT">
          <Select
            value={state}
            onChange={(e) => {
              setState(e.target.value);
              setSelected([]);
            }}
          >
            <option value="">All states</option>
            {states.data?.map((s) => (
              <option key={s.state} value={s.state}>
                {s.state}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Category">
          <Select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setSelected([]);
            }}
          >
            <option value="">All categories</option>
            {categories.data?.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Trend period">
          <Select value={months} onChange={(e) => setMonths(Number(e.target.value))}>
            <option value={6}>Last 6 months</option>
            <option value={12}>Last 12 months</option>
            <option value={24}>Last 24 months</option>
          </Select>
        </Field>
        <Field label="Forecast horizon">
          <Select value={days} onChange={(e) => setDays(Number(e.target.value))}>
            <option value={7}>Next 7 days</option>
            <option value={14}>Next 14 days</option>
            <option value={30}>Next 30 days</option>
          </Select>
        </Field>
      </div>

      {insights.isError ? (
        <ErrorState
          className="mt-8"
          description="The dashboard data could not be loaded."
          onRetry={() => insights.refetch()}
        />
      ) : (
        <>
          <fieldset className="mt-6">
            <legend className="text-sm font-medium text-charcoal-800">
              Compare destinations (up to {MAX_COMPARE})
              {selected.length === 0 && ', showing the busiest three'}
            </legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {insights.isPending && <Skeleton className="h-8 w-80" />}
              {ranked.map((i) => {
                const on = compare.includes(i.destination.slug);
                return (
                  <label
                    key={i.destination.slug}
                    className={`cursor-pointer rounded-full border px-3 py-1 text-sm has-focus-visible:ring-2 has-focus-visible:ring-forest-600 ${on ? 'border-forest-700 bg-forest-50 text-forest-900' : 'border-charcoal-200 text-charcoal-700'}`}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={on && selected.length > 0}
                      onChange={() => toggle(i.destination.slug)}
                    />
                    {i.destination.name}
                  </label>
                );
              })}
              {insights.data && ranked.length === 0 && (
                <p className="text-sm text-charcoal-600">No destinations match these filters.</p>
              )}
            </div>
          </fieldset>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <ChartCard
              title="Visitor trends"
              description="Monthly visitors for the selected destinations (illustrative)."
            >
              {footfall.isPending ? (
                <Skeleton className="h-72" />
              ) : footfall.isError ? (
                <ErrorState
                  description="Trend data could not be loaded."
                  onRetry={() => footfall.refetch()}
                />
              ) : (
                <div
                  className="h-72"
                  role="img"
                  aria-label="Line chart of illustrative monthly visitors"
                >
                  <ResponsiveContainer>
                    <LineChart data={trendRows} margin={{ left: 8, right: 8 }}>
                      <CartesianGrid stroke="#e7e2d8" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        tickFormatter={(v: number) => numberFmt.format(v)}
                        width={64}
                      />
                      <Tooltip formatter={(v) => numberFmt.format(Number(v))} />
                      <Legend />
                      {footfall.data?.series.map((s, i) => (
                        <Line
                          key={s.destination.slug}
                          type="monotone"
                          dataKey={s.destination.name}
                          stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
                          strokeWidth={2}
                          dot={false}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartCard>

            <ChartCard
              title="Seasonal demand"
              description="Share of a typical year's visitors in each month for the selection (1.0 = average month)."
            >
              {footfall.isPending ? (
                <Skeleton className="h-72" />
              ) : (
                <div
                  className="h-72"
                  role="img"
                  aria-label="Bar chart of illustrative seasonal demand index by month"
                >
                  <ResponsiveContainer>
                    <BarChart data={seasonRows}>
                      <CartesianGrid stroke="#e7e2d8" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} width={40} />
                      <Tooltip formatter={(v) => Number(v).toFixed(2)} />
                      <Bar
                        dataKey="index"
                        name="Demand index"
                        fill="#c2553a"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartCard>

            <ChartCard
              title="Destination comparison"
              description="Visitors over the last 12 months, top 10 for the current filters (illustrative)."
            >
              {insights.isPending ? (
                <Skeleton className="h-80" />
              ) : (
                <div
                  className="h-80"
                  role="img"
                  aria-label="Bar chart comparing illustrative annual visitors by destination"
                >
                  <ResponsiveContainer>
                    <BarChart data={comparisonRows} layout="vertical" margin={{ left: 16 }}>
                      <CartesianGrid stroke="#e7e2d8" horizontal={false} />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 12 }}
                        tickFormatter={(v: number) => numberFmt.format(v)}
                      />
                      <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(v) => numberFmt.format(Number(v))} />
                      <Bar
                        dataKey="visitors"
                        name="Visitors (demo)"
                        fill="#1f6f50"
                        radius={[0, 4, 4, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartCard>

            <ChartCard
              title="Current crowd levels"
              description="How many destinations in the current filter sit at each crowd level."
            >
              <ul className="space-y-3">
                {insights.data?.crowdDistribution.map((c) => {
                  const total =
                    insights.data.crowdDistribution.reduce((n, x) => n + x.count, 0) || 1;
                  return (
                    <li key={c.level}>
                      <div className="flex justify-between text-sm">
                        <Badge tone={crowdTone[c.level]}>{crowdLevelLabels[c.level]}</Badge>
                        <span className="text-charcoal-700">{c.count}</span>
                      </div>
                      <div className="mt-1 h-2 rounded-full bg-charcoal-100">
                        <div
                          className="h-2 rounded-full bg-forest-600"
                          style={{ width: `${(c.count / total) * 100}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </ChartCard>
          </div>

          <Card className="mt-6">
            <CardBody>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-sans text-base font-semibold text-charcoal-900">
                  Crowd forecast
                </h2>
                {forecasts.data?.[0] && <ForecastSourceBadge source={forecasts.data[0].source} />}
              </div>
              {forecasts.data?.[0] && (
                <p className="mt-1 text-sm text-charcoal-600">{forecastNote(forecasts.data[0])}</p>
              )}
              {forecasts.isPending ? (
                <Skeleton className="mt-4 h-40" />
              ) : forecasts.isError ? (
                <ErrorState
                  className="mt-4"
                  description="Forecasts could not be loaded."
                  onRetry={() => forecasts.refetch()}
                />
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[32rem] text-left text-sm">
                    <caption className="sr-only">Crowd forecast by destination and date</caption>
                    <thead>
                      <tr className="border-b border-charcoal-200 text-charcoal-600">
                        <th scope="col" className="py-2 pr-4 font-medium">
                          Destination
                        </th>
                        <th scope="col" className="py-2 pr-4 font-medium">
                          Source
                        </th>
                        <th scope="col" className="py-2 pr-4 font-medium">
                          Peak day
                        </th>
                        <th scope="col" className="py-2 pr-4 font-medium">
                          Quietest day
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {forecasts.data?.map((f) => {
                        const sorted = [...f.points].sort(
                          (a, b) => b.predictedVisitors - a.predictedVisitors,
                        );
                        const peak = sorted[0];
                        const quiet = sorted.at(-1);
                        return (
                          <tr key={f.destination.slug} className="border-b border-charcoal-100">
                            <th scope="row" className="py-2 pr-4 font-medium">
                              <Link
                                to={`/destinations/${f.destination.slug}`}
                                className="text-forest-700 underline"
                              >
                                {f.destination.name}
                              </Link>
                            </th>
                            <td className="py-2 pr-4">
                              <ForecastSourceBadge source={f.source} />
                            </td>
                            <td className="py-2 pr-4">
                              {peak ? (
                                <>
                                  {peak.date}{' '}
                                  <Badge tone={crowdTone[peak.crowdLevel]}>
                                    {crowdLevelLabels[peak.crowdLevel]}
                                  </Badge>
                                </>
                              ) : (
                                'Unavailable'
                              )}
                            </td>
                            <td className="py-2 pr-4">
                              {quiet ? (
                                <>
                                  {quiet.date}{' '}
                                  <Badge tone={crowdTone[quiet.crowdLevel]}>
                                    {crowdLevelLabels[quiet.crowdLevel]}
                                  </Badge>
                                </>
                              ) : (
                                'Unavailable'
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardBody>
          </Card>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <ChartCard
              title="Unusual months"
              description="Months that differ sharply from the seasonal pattern (illustrative)."
            >
              {insights.data?.anomalies.length ? (
                <ul className="space-y-2 text-sm">
                  {insights.data.anomalies.map((a) => (
                    <li key={`${a.destination.slug}-${a.month}`} className="flex items-start gap-2">
                      <AlertTriangle
                        className="mt-0.5 size-4 shrink-0 text-amber-700"
                        aria-hidden
                      />
                      <span>
                        <strong>{a.destination.name}</strong>, {monthLabel(a.month)}:{' '}
                        {a.kind === 'SPIKE' ? 'above' : 'below'} the usual pattern by{' '}
                        {Math.abs(Math.round(a.deviationPct))}% ({numberFmt.format(a.visitors)} vs
                        about {numberFmt.format(a.expected)}).
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-charcoal-600">No unusual months for this selection.</p>
              )}
            </ChartCard>

            <ChartCard
              title="Quieter alternatives"
              description="Similar places with lower current crowd levels."
            >
              {insights.data?.alternatives.length ? (
                <ul className="space-y-4 text-sm">
                  {insights.data.alternatives.map((alt) => (
                    <li key={alt.for.slug}>
                      <p>
                        Instead of <strong>{alt.for.name}</strong>{' '}
                        <Badge tone={crowdTone[alt.for.crowdLevel]}>
                          {crowdLevelLabels[alt.for.crowdLevel]}
                        </Badge>
                      </p>
                      <ul className="mt-1 space-y-1">
                        {alt.suggestions.map((s) => (
                          <li key={s.slug}>
                            <Link
                              to={`/destinations/${s.slug}`}
                              className="inline-flex items-center gap-1 text-forest-700 underline"
                            >
                              <ArrowRight className="size-3.5" aria-hidden /> {s.name}, {s.state}
                            </Link>{' '}
                            <Badge tone={crowdTone[s.crowdLevel]}>
                              {crowdLevelLabels[s.crowdLevel]}
                            </Badge>
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-charcoal-600">
                  No quieter alternatives for this selection.
                </p>
              )}
            </ChartCard>
          </div>
        </>
      )}
    </Container>
  );
}
