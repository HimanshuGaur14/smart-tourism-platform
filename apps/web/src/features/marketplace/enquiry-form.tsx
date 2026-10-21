import { zodResolver } from '@hookform/resolvers/zod';
import { enquiryInputSchema, type EnquiryInput } from '@smart-tourism/contracts';
import { CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';
import { Button, Field, Input, Textarea } from '../../components/ui';
import { applyServerErrors } from '../../lib/form-errors';
import { useSession } from '../auth/session';
import { useSubmitEnquiry } from './api';

const fields = ['name', 'email', 'phone', 'message', 'travelDate', 'groupSize'];

export function EnquiryForm({ listingId, isSample }: { listingId: string; isSample: boolean }) {
  const { user } = useSession();
  const submit = useSubmitEnquiry();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<EnquiryInput>({
    resolver: zodResolver(enquiryInputSchema),
    values: {
      listingId,
      name: user?.name ?? '',
      email: user?.email ?? '',
      phone: '',
      message: '',
      travelDate: '',
      groupSize: undefined,
    },
    resetOptions: { keepDirtyValues: true },
  });
  const { errors } = form.formState;

  if (submit.isSuccess) {
    return (
      <div
        role="status"
        className="rounded-card border border-forest-200 bg-forest-50 p-5 text-forest-900"
      >
        <p className="flex items-center gap-2 font-medium">
          <CheckCircle2 className="size-5" aria-hidden /> Enquiry sent
        </p>
        <p className="mt-2 text-sm">
          {isSample
            ? 'This is a sample listing, so nobody will reply. Your enquiry was saved so you can see how the workflow works.'
            : 'The host will reply to the email you gave.'}{' '}
          {user && (
            <Link to="/account" className="underline">
              See your enquiries
            </Link>
          )}
        </p>
      </div>
    );
  }

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      await submit.mutateAsync(values);
    } catch (error) {
      setFormError(applyServerErrors(error, form.setError, fields));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4" aria-label="Send an enquiry">
      {formError && (
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          {formError}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your name" required error={errors.name?.message}>
          <Input autoComplete="name" {...form.register('name')} />
        </Field>
        <Field label="Email" required error={errors.email?.message}>
          <Input type="email" autoComplete="email" {...form.register('email')} />
        </Field>
        <Field label="Phone (optional)" error={errors.phone?.message}>
          <Input type="tel" autoComplete="tel" {...form.register('phone')} />
        </Field>
        <Field label="Travel date (optional)" error={errors.travelDate?.message}>
          <Input type="date" {...form.register('travelDate')} />
        </Field>
        <Field label="Group size (optional)" error={errors.groupSize?.message}>
          <Input
            type="number"
            min={1}
            max={50}
            inputMode="numeric"
            {...form.register('groupSize', {
              setValueAs: (v) => (v === '' || v == null ? undefined : Number(v)),
            })}
          />
        </Field>
      </div>
      <Field label="Message" required error={errors.message?.message}>
        <Textarea rows={4} {...form.register('message')} />
      </Field>
      <p className="text-xs text-charcoal-500">
        Your details are shared only with this host. No payment is taken; bookings are arranged
        directly with them.
      </p>
      <Button type="submit" variant="accent" loading={submit.isPending}>
        Send enquiry
      </Button>
    </form>
  );
}
