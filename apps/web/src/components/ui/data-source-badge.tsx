import { CircleSlash, FlaskConical, Sparkles } from 'lucide-react';
import type { ForecastSource } from '@smart-tourism/contracts';
import { Badge } from './badge';

const config = {
  DEMO: { label: 'Demo forecast', tone: 'warning', Icon: FlaskConical },
  MODEL: { label: 'Model forecast', tone: 'forest', Icon: Sparkles },
  UNAVAILABLE: { label: 'Forecast unavailable', tone: 'neutral', Icon: CircleSlash },
} as const;

/** Mandatory label on every forecast so demo values are never mistaken for model output. */
export function ForecastSourceBadge({ source }: { source: ForecastSource }) {
  const { label, tone, Icon } = config[source];
  return (
    <Badge tone={tone} className="uppercase tracking-wide">
      <Icon className="size-3.5" aria-hidden />
      {label}
    </Badge>
  );
}

/** Label for any illustrative, non-real data (charts, sample tables). */
export function DemoDataBadge({ label = 'Demo data' }: { label?: string }) {
  return (
    <Badge
      tone="warning"
      className="uppercase tracking-wide"
      title="Illustrative values, not real measurements"
    >
      <FlaskConical className="size-3.5" aria-hidden />
      {label}
    </Badge>
  );
}
