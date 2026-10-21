import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { ApiClientError } from './api-client';

/**
 * Copies server-side validation errors onto form fields. Returns a message for the
 * form-level alert when the error is not tied to a field.
 */
export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: string[],
): string | null {
  if (error instanceof ApiClientError) {
    let unmatched = false;
    for (const detail of error.details ?? []) {
      if (fields.includes(detail.path))
        setError(detail.path as Path<T>, { message: detail.message });
      else unmatched = true;
    }
    if (error.details?.length && !unmatched) return null;
    return error.message;
  }
  return 'Something went wrong. Please try again.';
}
