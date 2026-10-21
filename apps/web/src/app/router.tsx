import type { ReactNode } from 'react';
import { createBrowserRouter, type RouteObject } from 'react-router';
import { RequireAuth } from '../features/auth/require-auth';
import { RootLayout } from '../layouts/root-layout';
import { HomePage } from '../routes/home-page';
import { NotFoundPage } from '../routes/not-found-page';
import { RouteError } from '../routes/route-error';

type Role = 'TOURIST' | 'VENDOR' | 'ADMIN';

/** Code-split route whose component is optionally wrapped in a role check. */
function page<M>(
  load: () => Promise<M>,
  pick: (m: M) => () => ReactNode,
  roles?: Role[] | 'any',
): RouteObject['lazy'] {
  return () =>
    load().then((m) => {
      const Page = pick(m);
      return {
        Component: roles
          ? () => (
              <RequireAuth roles={roles === 'any' ? undefined : roles}>
                <Page />
              </RequireAuth>
            )
          : Page,
      };
    });
}

const auth = () => import('../routes/auth-pages');
const market = () => import('../routes/marketplace-pages');
const vendor = () => import('../routes/vendor-pages');
const planner = () => import('../routes/planner-pages');
const admin = () => import('../routes/admin-pages');
const VENDOR_ROLES: Role[] = ['VENDOR', 'ADMIN'];
const ADMIN_ROLES: Role[] = ['ADMIN'];

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <HomePage /> },
      {
        path: 'explore',
        lazy: page(
          () => import('../routes/explore-page'),
          (m) => m.ExplorePage,
        ),
      },
      {
        path: 'destinations/:slug',
        lazy: page(
          () => import('../routes/destination-detail-page'),
          (m) => m.DestinationDetailPage,
        ),
      },
      { path: 'planner', lazy: page(planner, (m) => m.PlannerPage, 'any') },
      { path: 'planner/new', lazy: page(planner, (m) => m.PlannerEditorPage, 'any') },
      { path: 'planner/:id', lazy: page(planner, (m) => m.PlannerEditorPage, 'any') },
      { path: 'marketplace', lazy: page(market, (m) => m.MarketplacePage) },
      { path: 'marketplace/:slug', lazy: page(market, (m) => m.ListingDetailPage) },
      {
        path: 'intelligence',
        lazy: page(
          () => import('../routes/intelligence-page'),
          (m) => m.IntelligencePage,
        ),
      },
      { path: 'login', lazy: page(auth, (m) => m.LoginPage) },
      { path: 'register', lazy: page(auth, (m) => m.RegisterPage) },
      {
        path: 'account',
        lazy: page(
          () => import('../routes/account-page'),
          (m) => m.AccountPage,
          'any',
        ),
      },
      { path: 'vendor', lazy: page(vendor, (m) => m.VendorDashboardPage, VENDOR_ROLES) },
      {
        path: 'vendor/listings/new',
        lazy: page(vendor, (m) => m.VendorListingEditorPage, VENDOR_ROLES),
      },
      {
        path: 'vendor/listings/:id/edit',
        lazy: page(vendor, (m) => m.VendorListingEditorPage, VENDOR_ROLES),
      },
      { path: 'admin', lazy: page(admin, (m) => m.AdminOverviewPage, ADMIN_ROLES) },
      {
        path: 'admin/destinations',
        lazy: page(admin, (m) => m.AdminDestinationsPage, ADMIN_ROLES),
      },
      {
        path: 'admin/destinations/new',
        lazy: page(admin, (m) => m.AdminDestinationEditorPage, ADMIN_ROLES),
      },
      {
        path: 'admin/destinations/:id',
        lazy: page(admin, (m) => m.AdminDestinationEditorPage, ADMIN_ROLES),
      },
      { path: 'admin/categories', lazy: page(admin, (m) => m.AdminCategoriesPage, ADMIN_ROLES) },
      {
        path: 'styleguide',
        lazy: page(
          () => import('../routes/styleguide-page'),
          (m) => m.StyleguidePage,
        ),
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];

export function createAppRouter() {
  return createBrowserRouter(routes);
}
