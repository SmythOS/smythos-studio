import ErrorPage from '@src/react/features/error-pages/pages/Error';
import { useEffect } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';

export function CatchAllPage() {
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  const shouldRedirect = isLocalhost && !searchParams.get('attempted_redirect');

  useEffect(() => {
    if (shouldRedirect) {
      // reload the page so the vite middleware can redirect to the new page. if redirected back, then add ?attempted_redirect=true to the url
      // so we do not enter an infinite redirect loop
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.set('attempted_redirect', 'true');
      window.location.href = `${location.pathname}?${newSearchParams.toString()}`;
    }
  }, [shouldRedirect, location.pathname]);

  if (shouldRedirect) {
    // While redirecting, render nothing
    return null;
  }

  // Otherwise, show normal 404
  return <ErrorPage code="404" />;
}
