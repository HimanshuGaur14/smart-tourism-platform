import { useDocumentTitle } from '../hooks/use-document-title';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardTitle,
  Container,
  DemoDataBadge,
  Dialog,
  EmptyState,
  ErrorState,
  Field,
  ForecastSourceBadge,
  Input,
  LoadingState,
  PageHeader,
  Select,
  Skeleton,
  SmartImage,
  Textarea,
} from '../components/ui';

function Swatches({ name, shades }: { name: string; shades: string[] }) {
  return (
    <div>
      <p className="text-sm font-medium capitalize">{name}</p>
      <div className="mt-2 flex overflow-hidden rounded-md border border-charcoal-100">
        {shades.map((shade) => (
          <div
            key={shade}
            className="h-10 flex-1"
            style={{ background: `var(--color-${name}-${shade})` }}
            title={`${name}-${shade}`}
          />
        ))}
      </div>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-charcoal-100 py-10">
      <h2 className="text-2xl">{title}</h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

/** Living reference for the design system components. */
export function StyleguidePage() {
  useDocumentTitle('Design system');
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <PageHeader
        eyebrow="Design system"
        title="Components and tokens"
        description="Reusable building blocks for every page in the product."
      />
      <Container className="pb-16">
        <Block title="Colour">
          <div className="grid gap-4 sm:grid-cols-2">
            <Swatches
              name="forest"
              shades={['50', '100', '200', '300', '400', '500', '600', '700', '800', '900']}
            />
            <Swatches
              name="terracotta"
              shades={['50', '100', '200', '300', '400', '500', '600', '700']}
            />
            <Swatches name="ivory" shades={['50', '100', '200', '300']} />
            <Swatches
              name="charcoal"
              shades={['50', '100', '200', '300', '400', '500', '600', '700', '800', '900']}
            />
          </div>
        </Block>

        <Block title="Typography">
          <p className="eyebrow">Eyebrow label</p>
          <h1 className="mt-2 text-5xl">Display heading</h1>
          <h2 className="mt-4 text-3xl">Section heading</h2>
          <h3 className="mt-4 text-xl">Card heading</h3>
          <p className="mt-4 max-w-prose text-charcoal-700">
            Body copy is set in Inter for readability. Headings use Fraunces for an editorial feel.
          </p>
        </Block>

        <Block title="Buttons">
          <div className="flex flex-wrap items-center gap-3">
            <Button>Primary</Button>
            <Button variant="accent">Accent</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
            <Button leadingIcon={<Plus className="size-4" aria-hidden />}>With icon</Button>
            <Button loading>Saving</Button>
            <Button disabled>Disabled</Button>
            <Button size="sm">Small</Button>
            <Button size="lg">Large</Button>
          </div>
        </Block>

        <Block title="Badges and data labels">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>Neutral</Badge>
            <Badge tone="forest">Forest</Badge>
            <Badge tone="terracotta">Terracotta</Badge>
            <Badge tone="info">Info</Badge>
            <Badge tone="danger">Danger</Badge>
            <DemoDataBadge />
            <ForecastSourceBadge source="DEMO" />
            <ForecastSourceBadge source="MODEL" />
            <ForecastSourceBadge source="UNAVAILABLE" />
          </div>
        </Block>

        <Block title="Form controls">
          <form
            className="grid max-w-2xl gap-4 sm:grid-cols-2"
            onSubmit={(e) => e.preventDefault()}
          >
            <Field label="Full name" required hint="As it should appear on enquiries.">
              <Input autoComplete="name" />
            </Field>
            <Field label="Email" required error="Enter a valid email address.">
              <Input type="email" defaultValue="not-an-email" />
            </Field>
            <Field label="Listing type">
              <Select defaultValue="">
                <option value="">Choose a type</option>
                <option>Homestay</option>
                <option>Local guide</option>
              </Select>
            </Field>
            <Field label="Disabled">
              <Input disabled value="Read only" readOnly />
            </Field>
            <Field label="Message" className="sm:col-span-2">
              <Textarea placeholder="Tell the host about your plans" />
            </Field>
          </form>
        </Block>

        <Block title="Cards and images">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <SmartImage
                image={{ src: '/illustrations/hills-at-dawn.svg', alt: 'Hills illustration' }}
                className="aspect-[4/3] w-full"
              />
              <CardBody>
                <CardTitle>Image card</CardTitle>
                <p className="mt-1 text-sm text-charcoal-600">Loaded from the image registry.</p>
              </CardBody>
            </Card>
            <Card>
              <SmartImage
                image={{ src: '/does-not-exist.jpg', alt: 'Missing photo' }}
                className="aspect-[4/3] w-full"
              />
              <CardBody>
                <CardTitle>Fallback</CardTitle>
                <p className="mt-1 text-sm text-charcoal-600">
                  A failed image shows a placeholder, never a broken icon.
                </p>
              </CardBody>
            </Card>
            <Card>
              <Skeleton className="aspect-[4/3] w-full rounded-none" />
              <CardBody className="space-y-2">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-full" />
              </CardBody>
            </Card>
          </div>
        </Block>

        <Block title="States">
          <div className="grid gap-4 md:grid-cols-3">
            <LoadingState />
            <EmptyState title="No destinations match" description="Try removing a filter." />
            <ErrorState description="We could not load this data." onRetry={() => undefined} />
          </div>
        </Block>

        <Block title="Dialog">
          <Button variant="secondary" onClick={() => setDialogOpen(true)}>
            Open dialog
          </Button>
          <Dialog
            open={dialogOpen}
            onClose={() => setDialogOpen(false)}
            title="Remove this stop?"
            description="It will be removed from your itinerary."
            footer={
              <>
                <Button variant="secondary" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button variant="danger" onClick={() => setDialogOpen(false)}>
                  Remove
                </Button>
              </>
            }
          />
        </Block>
      </Container>
    </>
  );
}
