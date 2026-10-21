import { useEffect } from 'react';
import { BRAND_NAME } from '../components/brand/logo';

/** Sets a descriptive tab title so screen-reader and tab users know where they are. */
export function useDocumentTitle(title: string | undefined) {
  useEffect(() => {
    document.title = title
      ? `${title} · ${BRAND_NAME}`
      : `${BRAND_NAME} · Discover India, crowd-aware`;
  }, [title]);
}
