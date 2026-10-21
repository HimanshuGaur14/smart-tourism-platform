import { Link } from 'react-router';
import { primaryNav } from '../app/navigation';
import { Logo } from '../components/brand/logo';
import { Container } from '../components/ui';
import { ApiStatus } from '../features/system/api-status';

export function SiteFooter() {
  return (
    <footer className="mt-auto bg-forest-900 text-forest-100">
      <Container className="grid gap-10 py-14 md:grid-cols-[1.5fr_1fr_1fr]">
        <div className="max-w-sm">
          <Logo inverted />
          <p className="mt-4 text-sm leading-relaxed text-forest-200">
            Discover destinations across India, support local hosts and artisans, and plan visits
            for quieter times.
          </p>
          <p className="mt-4 text-xs text-forest-300">
            A Smart India Hackathon prototype (PS 25032). Crowd figures shown in this prototype are
            illustrative unless marked as model forecasts.
          </p>
        </div>
        <nav aria-label="Footer">
          <h2 className="font-sans text-sm font-semibold text-ivory-50">Explore</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {primaryNav.map((item) => (
              <li key={item.to}>
                <Link to={item.to} className="text-forest-200 hover:text-ivory-50">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div>
          <h2 className="font-sans text-sm font-semibold text-ivory-50">Account</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link to="/login" className="text-forest-200 hover:text-ivory-50">
                Sign in
              </Link>
            </li>
            <li>
              <Link to="/register" className="text-forest-200 hover:text-ivory-50">
                Create account
              </Link>
            </li>
            <li>
              <Link to="/styleguide" className="text-forest-200 hover:text-ivory-50">
                Design system
              </Link>
            </li>
          </ul>
        </div>
      </Container>
      <div className="border-t border-forest-800">
        <Container className="flex flex-col gap-2 py-5 text-xs text-forest-300 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Yatra Atlas prototype</p>
          <ApiStatus className="text-forest-200" />
        </Container>
      </div>
    </footer>
  );
}
