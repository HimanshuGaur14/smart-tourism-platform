import type { CrowdLevel, DestinationForecast } from '@smart-tourism/contracts';
import type { BadgeTone } from '../../components/ui';

export const crowdTone: Record<CrowdLevel, BadgeTone> = {
  LOW: 'forest',
  MODERATE: 'info',
  HIGH: 'warning',
  VERY_HIGH: 'danger',
};

export const unavailableText: Record<string, string> = {
  not_configured: 'No forecasting service is connected.',
  timeout: 'The forecasting service did not respond in time.',
  service_error: 'The forecasting service returned an error.',
  invalid_response: 'The forecasting service sent data we could not use.',
  missing_from_response: 'The forecasting service has no forecast for this destination.',
};

export function forecastNote(
  f: Pick<DestinationForecast, 'source' | 'unavailableReason' | 'modelVersion'>,
) {
  if (f.source === 'DEMO')
    return 'Illustrative demo values generated from seasonal patterns. These are not real predictions.';
  if (f.source === 'UNAVAILABLE')
    return `Forecast unavailable. ${unavailableText[f.unavailableReason ?? ''] ?? ''}`.trim();
  return `Model output${f.modelVersion ? ` (${f.modelVersion})` : ''}. Treat as an estimate.`;
}
