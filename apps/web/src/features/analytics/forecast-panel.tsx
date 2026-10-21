import { Badge, ForecastSourceBadge, Skeleton } from '../../components/ui';
import { crowdLevelLabels, useDestinationForecast } from './api';
import { crowdTone, forecastNote } from './forecast-format';

const dayFmt = new Intl.DateTimeFormat('en-IN', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});

/** Seven-day crowd outlook for one destination, always showing where the numbers came from. */
export function ForecastPanel({ slug }: { slug: string }) {
  const { data, isPending, isError } = useDestinationForecast(slug, 7);
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-sans text-sm font-semibold text-charcoal-900">Crowd outlook</h2>
        <ForecastSourceBadge source={data?.source ?? 'UNAVAILABLE'} />
      </div>
      {isPending ? (
        <Skeleton className="mt-3 h-24" />
      ) : isError || !data ? (
        <p className="mt-3 text-sm text-charcoal-600">The crowd outlook could not be loaded.</p>
      ) : (
        <>
          <p className="mt-3 text-xs text-charcoal-600">{forecastNote(data)}</p>
          {data.points.length > 0 && (
            <ul className="mt-3 space-y-1.5 text-sm">
              {data.points.map((p) => (
                <li key={p.date} className="flex items-center justify-between gap-2">
                  <span className="text-charcoal-700">{dayFmt.format(new Date(p.date))}</span>
                  <Badge tone={crowdTone[p.crowdLevel]}>{crowdLevelLabels[p.crowdLevel]}</Badge>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
