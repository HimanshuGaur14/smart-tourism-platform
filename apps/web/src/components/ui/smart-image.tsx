import { ImageOff } from 'lucide-react';
import { useState, type ImgHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';
import type { ImageRef } from '../../lib/images';

interface SmartImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt'> {
  image: ImageRef | null | undefined;
  /** Show the credit line beneath the image (required for most licensed photos). */
  showCredit?: boolean;
  /** Text shown on the placeholder when there is no usable image (e.g. the place name). */
  fallbackLabel?: string;
}

/** Image with a graceful fallback and optional attribution, so the UI never shows a broken link. */
export function SmartImage({
  image,
  showCredit = false,
  fallbackLabel,
  className,
  ...props
}: SmartImageProps) {
  const [failed, setFailed] = useState(false);

  if (!image || failed) {
    return (
      <div
        role="img"
        aria-label={
          image?.alt ?? (fallbackLabel ? `${fallbackLabel} (no photo yet)` : 'Image unavailable')
        }
        className={cn(
          'flex items-center justify-center bg-[repeating-linear-gradient(135deg,var(--color-ivory-200)_0_12px,var(--color-ivory-100)_12px_24px)] text-charcoal-400',
          className,
        )}
      >
        {fallbackLabel ? (
          <span aria-hidden className="px-6 text-center font-display text-2xl text-forest-800/70">
            {fallbackLabel}
          </span>
        ) : (
          <ImageOff className="size-6" aria-hidden />
        )}
      </div>
    );
  }

  return (
    <figure className="contents">
      <img
        src={image.src}
        alt={image.alt}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
        className={cn('object-cover', className)}
        {...props}
      />
      {showCredit && image.credit && (
        <figcaption className="mt-1 text-xs text-charcoal-500">
          {image.sourceUrl ? (
            <a href={image.sourceUrl} target="_blank" rel="noreferrer" className="underline">
              {image.credit}
            </a>
          ) : (
            image.credit
          )}
          {image.license && <> · {image.license}</>}
        </figcaption>
      )}
    </figure>
  );
}
