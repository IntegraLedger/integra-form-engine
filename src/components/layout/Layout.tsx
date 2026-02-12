import { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { Header } from './Header';
import { Footer } from './Footer';

function PageLoader() {
  return <div className="flex-1" />;
}

export function Layout() {
  const isHome = useLocation().pathname === '/';

  return (
    <div className="flex min-h-screen flex-col page-gradient-bg">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <Header />
      <main id="main-content" className="flex-1">
        <ErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </main>
      {!isHome && <Footer />}
    </div>
  );
}
