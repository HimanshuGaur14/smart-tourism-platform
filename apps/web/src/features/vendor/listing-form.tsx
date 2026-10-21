import { zodResolver } from '@hookform/resolvers/zod';
import {
  listingInputSchema,
  listingTypeSchema,
  type ListingInput,
  type OwnedListing,
} from '@smart-tourism/contracts';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Field, Input, Select, Textarea } from '../../components/ui';
import { applyServerErrors } from '../../lib/form-errors';
import { useStates } from '../destinations/api';
import { listingTypeLabels, useSaveListing } from '../marketplace/api';

const fields = [
  'type',
  'title',
  'summary',
  'description',
  'state',
  'district',
  'priceInfo',
  'imageUrl',
  'destinationSlug',
];

export function ListingForm({
  listing,
  onSaved,
}: {
  listing?: OwnedListing;
  onSaved: (l: OwnedListing) => void;
}) {
  const save = useSaveListing();
  const states = useStates();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<ListingInput>({
    resolver: zodResolver(listingInputSchema),
    defaultValues: {
      type: listing?.type ?? 'HOMESTAY',
      title: listing?.title ?? '',
      summary: listing?.summary ?? '',
      description: listing?.description ?? '',
      state: listing?.state ?? '',
      district: listing?.district ?? '',
      priceInfo: listing?.priceInfo ?? '',
      imageUrl: listing?.imageUrl ?? '',
      destinationSlug: listing?.destination?.slug ?? '',
    },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      const res = await save.mutateAsync({
        id: listing?.id,
        input: { ...values, priceInfo: values.priceInfo || null },
      });
      onSaved(res.data);
    } catch (error) {
      setFormError(applyServerErrors(error, form.setError, fields));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {formError && (
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          {formError}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Type" required error={errors.type?.message}>
          <Select {...form.register('type')}>
            {listingTypeSchema.options.map((t) => (
              <option key={t} value={t}>
                {listingTypeLabels[t]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Title" required error={errors.title?.message}>
          <Input {...form.register('title')} />
        </Field>
      </div>
      <Field
        label="Summary"
        required
        error={errors.summary?.message}
        hint="One line shown on listing cards."
      >
        <Input {...form.register('summary')} />
      </Field>
      <Field label="Description" required error={errors.description?.message}>
        <Textarea rows={6} {...form.register('description')} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="State or union territory" required error={errors.state?.message}>
          <Input list="state-options" {...form.register('state')} />
        </Field>
        <Field label="District" required error={errors.district?.message}>
          <Input {...form.register('district')} />
        </Field>
        <Field
          label="Nearby destination (optional)"
          error={errors.destinationSlug?.message}
          hint="Destination slug, e.g. netarhat"
        >
          <Input {...form.register('destinationSlug')} />
        </Field>
        <Field
          label="Price information (optional)"
          error={errors.priceInfo?.message}
          hint="Text only, e.g. “₹1,500 per night”"
        >
          <Input {...form.register('priceInfo')} />
        </Field>
      </div>
      <Field
        label="Image URL (optional)"
        error={errors.imageUrl?.message}
        hint="An https:// link to a photo you own or are allowed to use."
      >
        <Input type="url" {...form.register('imageUrl')} />
      </Field>
      <datalist id="state-options">
        {states.data?.map((s) => (
          <option key={s.state} value={s.state} />
        ))}
      </datalist>
      <p className="text-xs text-charcoal-500">
        New listings and content edits are reviewed by an admin before they are public.
      </p>
      <Button type="submit" loading={save.isPending}>
        {listing ? 'Save changes' : 'Submit for review'}
      </Button>
    </form>
  );
}
