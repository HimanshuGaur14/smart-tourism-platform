import { zodResolver } from '@hookform/resolvers/zod';
import {
  loginSchema,
  registerSchema,
  type LoginInput,
  type RegisterInput,
} from '@smart-tourism/contracts';
import { AlertCircle } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import { Button, Card, CardBody, Container, Field, Input } from '../components/ui';
import { roleHome, useLogin, useRegister, useSession } from '../features/auth/session';
import { useDocumentTitle } from '../hooks/use-document-title';
import { applyServerErrors } from '../lib/form-errors';

/** Only allow same-site relative redirects after login. */
function safeNext(next: string | null): string | null {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : null;
}

function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  useDocumentTitle(title);
  return (
    <Container className="flex justify-center py-12 sm:py-20">
      <div className="w-full max-w-md">
        <h1 className="text-center text-3xl sm:text-4xl">{title}</h1>
        <p className="mt-2 text-center text-charcoal-600">{subtitle}</p>
        <Card className="mt-8">
          <CardBody className="p-6 sm:p-8">{children}</CardBody>
        </Card>
        <p className="mt-6 text-center text-sm text-charcoal-600">{footer}</p>
      </div>
    </Container>
  );
}

function FormAlert({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="mb-5 flex gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
      {message}
    </div>
  );
}

export function LoginPage() {
  const session = useSession();
  const login = useLogin();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });
  const { errors } = form.formState;

  if (session.user && !login.isPending && !login.isSuccess) {
    return <Navigate to={safeNext(params.get('next')) ?? roleHome[session.user.role]} replace />;
  }

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      const data = await login.mutateAsync(values);
      navigate(safeNext(params.get('next')) ?? roleHome[data.user!.role], { replace: true });
    } catch (error) {
      setFormError(applyServerErrors(error, form.setError, ['email', 'password']));
    }
  });

  return (
    <AuthShell
      title="Sign in"
      subtitle="Save destinations, track enquiries and manage listings."
      footer={
        <>
          New here?{' '}
          <Link to="/register" className="font-medium text-forest-700 underline">
            Create an account
          </Link>
        </>
      }
    >
      <FormAlert message={formError} />
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <Field label="Email" error={errors.email?.message}>
          <Input type="email" autoComplete="email" {...form.register('email')} />
        </Field>
        <Field label="Password" error={errors.password?.message}>
          <Input type="password" autoComplete="current-password" {...form.register('password')} />
        </Field>
        <Button type="submit" className="w-full" loading={login.isPending}>
          Sign in
        </Button>
      </form>
    </AuthShell>
  );
}

export function RegisterPage() {
  const session = useSession();
  const registerUser = useRegister();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '', role: 'TOURIST' },
  });
  const { errors } = form.formState;

  if (session.user && !registerUser.isPending && !registerUser.isSuccess) {
    return <Navigate to={roleHome[session.user.role]} replace />;
  }

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      const data = await registerUser.mutateAsync(values);
      navigate(roleHome[data.user!.role], { replace: true });
    } catch (error) {
      setFormError(applyServerErrors(error, form.setError, ['name', 'email', 'password', 'role']));
    }
  });

  return (
    <AuthShell
      title="Create an account"
      subtitle="Discovery works without an account. Sign up to enquire, plan and list."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-forest-700 underline">
            Sign in
          </Link>
        </>
      }
    >
      <FormAlert message={formError} />
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <fieldset>
          <legend className="text-sm font-medium text-charcoal-800">I want to</legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(
              [
                ['TOURIST', 'Plan trips', 'Traveller account'],
                ['VENDOR', 'List my services', 'Host, guide or artisan'],
              ] as const
            ).map(([value, label, hint]) => (
              <label
                key={value}
                className="flex cursor-pointer flex-col rounded-md border border-charcoal-200 p-3 text-sm has-[:checked]:border-forest-500 has-[:checked]:bg-forest-50"
              >
                <span className="flex items-center gap-2 font-medium">
                  <input
                    type="radio"
                    value={value}
                    className="accent-forest-700"
                    {...form.register('role')}
                  />
                  {label}
                </span>
                <span className="mt-1 text-xs text-charcoal-500">{hint}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <Field label="Name" error={errors.name?.message}>
          <Input autoComplete="name" {...form.register('name')} />
        </Field>
        <Field label="Email" error={errors.email?.message}>
          <Input type="email" autoComplete="email" {...form.register('email')} />
        </Field>
        <Field
          label="Password"
          error={errors.password?.message}
          hint="At least 10 characters. A short phrase works well."
        >
          <Input type="password" autoComplete="new-password" {...form.register('password')} />
        </Field>
        <Button type="submit" className="w-full" loading={registerUser.isPending}>
          Create account
        </Button>
      </form>
    </AuthShell>
  );
}
