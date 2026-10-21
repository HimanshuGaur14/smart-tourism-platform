import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/cn';

export function Container({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('container-page', className)} {...props} />;
}

interface SectionProps extends HTMLAttributes<HTMLElement> {
  eyebrow?: string;
  title?: string;
  description?: ReactNode;
  actions?: ReactNode;
}

/** A page section with an optional editorial heading block. */
export function Section({
  eyebrow,
  title,
  description,
  actions,
  className,
  children,
  ...props
}: SectionProps) {
  return (
    <section className={cn('py-14 sm:py-20', className)} {...props}>
      <Container>
        {(title || eyebrow) && (
          <div className="mb-8 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              {eyebrow && <p className="eyebrow">{eyebrow}</p>}
              {title && <h2 className="mt-2 text-3xl sm:text-4xl">{title}</h2>}
              {description && <div className="mt-3 text-charcoal-600">{description}</div>}
            </div>
            {actions && <div className="shrink-0">{actions}</div>}
          </div>
        )}
        {children}
      </Container>
    </section>
  );
}

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <header className="border-b border-charcoal-100 bg-ivory-100">
      <Container className="flex flex-col gap-4 py-10 sm:flex-row sm:items-end sm:justify-between sm:py-14">
        <div className="max-w-3xl">
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h1 className="mt-2 text-4xl sm:text-5xl">{title}</h1>
          {description && <div className="mt-3 text-lg text-charcoal-600">{description}</div>}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </Container>
    </header>
  );
}
