import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Scrolls to the top on every route change, so navigating between pages never
// carries over the previous page's scroll position. Public pages scroll the
// window itself, but the Farmer/Admin/Super-Admin dashboard layouts scroll an
// inner <main overflow-y-auto> element instead — reset both.
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
    document.querySelector('main')?.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
