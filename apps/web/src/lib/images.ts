/**
 * Central registry for image references. Every photo used in the UI must be
 * registered here with its source and licence so attribution is never lost.
 *
 * Destination photos are stored with each destination record (Phase 2) using the
 * same `ImageRef` shape. Only add photos whose licence and URL have been verified.
 */
export interface ImageRef {
  src: string;
  alt: string;
  /** Required for third-party images, e.g. "Photo: Jane Doe / Wikimedia Commons". */
  credit?: string;
  license?: string;
  sourceUrl?: string;
}

/** Original illustrations bundled with the app (no attribution needed). */
export const illustrations = {
  hillsAtDawn: {
    src: '/illustrations/hills-at-dawn.svg',
    alt: 'Illustration of layered green hills and a river at sunrise',
  },
} satisfies Record<string, ImageRef>;
