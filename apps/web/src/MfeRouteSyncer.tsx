import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export function MfeRouteSyncer() {
  const navigate = useNavigate();
  const location = useLocation();

  // Listen for changes coming from the Shell (Shell -> MFE)
  useEffect(() => {
    const handleShellNavigation = (event: Event) => {
      const customEvent = event as CustomEvent<{ pathname: string; search: string }>;
      const targetPath = customEvent.detail.pathname + customEvent.detail.search;
      
      if (window.location.pathname !== location.pathname) {
        navigate(targetPath);
      }
    };

    window.addEventListener('shell-navigated', handleShellNavigation);
    return () => window.removeEventListener('shell-navigated', handleShellNavigation);
  }, [navigate, location.pathname]);

  // Notify the Shell about internal changes (MFE -> Shell)
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('mfe-navigated', {
        detail: { pathname: location.pathname, search: location.search },
      })
    );
  }, [location.pathname, location.search]);

  return null;
}
