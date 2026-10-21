import { Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router';
import { primaryNav } from '../app/navigation';
import { Logo } from '../components/brand/logo';
import { Button, ButtonLink, Container } from '../components/ui';
import { roleHome, useLogout, useSession } from '../features/auth/session';
import { cn } from '../lib/cn';

const desktopLink = ({ isActive }: { isActive: boolean }) =>
  cn(
    'rounded-md px-3 py-2 text-sm font-medium transition-colors',
    isActive ? 'text-forest-700' : 'text-charcoal-600 hover:text-charcoal-900',
  );

const roleLabel = { TOURIST: 'My account', VENDOR: 'Vendor dashboard', ADMIN: 'Admin' } as const;

/** Sign-in links for visitors; account link and sign-out for signed-in users. */
function AccountActions({ mobile = false }: { mobile?: boolean }) {
  const { user } = useSession();
  const logout = useLogout();
  const navigate = useNavigate();
  const variant = mobile ? 'secondary' : 'ghost';
  if (!user) {
    return (
      <>
        <ButtonLink to="/login" variant={variant} size={mobile ? undefined : 'sm'}>
          Sign in
        </ButtonLink>
        <ButtonLink to="/register" variant="primary" size={mobile ? undefined : 'sm'}>
          Create account
        </ButtonLink>
      </>
    );
  }
  return (
    <>
      <ButtonLink to={roleHome[user.role]} variant={variant} size={mobile ? undefined : 'sm'}>
        {roleLabel[user.role]}
      </ButtonLink>
      <Button
        variant="secondary"
        size={mobile ? undefined : 'sm'}
        disabled={logout.isPending}
        onClick={() => logout.mutate(undefined, { onSettled: () => void navigate('/') })}
      >
        Sign out
      </Button>
    </>
  );
}

export function SiteHeader() {
  const { pathname } = useLocation();
  // The menu remembers which page it was opened on, so navigating closes it.
  const [openOnPath, setOpenOnPath] = useState<string | null>(null);
  const open = openOnPath === pathname;
  const setOpen = (value: boolean) => setOpenOnPath(value ? pathname : null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenOnPath(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b border-charcoal-100 bg-ivory-50/95 backdrop-blur-sm">
      <Container className="flex h-16 items-center justify-between gap-6">
        <Logo />

        <nav aria-label="Primary" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {primaryNav.map((item) => (
              <li key={item.to}>
                <NavLink to={item.to} className={desktopLink}>
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <AccountActions />
        </div>

        <button
          type="button"
          className="-mr-2 rounded-md p-2 text-charcoal-700 hover:bg-ivory-200 lg:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen(!open)}
        >
          {open ? <X className="size-6" aria-hidden /> : <Menu className="size-6" aria-hidden />}
        </button>
      </Container>

      <div
        id="mobile-nav"
        hidden={!open}
        className="border-t border-charcoal-100 bg-ivory-50 lg:hidden"
      >
        <Container className="py-4">
          <nav aria-label="Mobile">
            <ul className="space-y-1">
              {primaryNav.map(({ to, label, icon: Icon }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 rounded-md px-3 py-3 text-base font-medium',
                        isActive
                          ? 'bg-forest-50 text-forest-800'
                          : 'text-charcoal-700 hover:bg-ivory-200',
                      )
                    }
                  >
                    <Icon className="size-5" aria-hidden />
                    {label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <div className="mt-4 grid grid-cols-2 gap-2 border-t border-charcoal-100 pt-4">
            <AccountActions mobile />
          </div>
        </Container>
      </div>
    </header>
  );
}
