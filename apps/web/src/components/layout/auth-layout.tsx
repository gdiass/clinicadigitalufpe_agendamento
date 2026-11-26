import { Outlet } from 'react-router-dom';
import { DevProfileSelector } from '../dev/dev-profile-selector';

export function AuthLayout() {
  const insideShell =
    typeof document !== 'undefined' && Boolean(document.getElementById('main'));

  if (insideShell) {
    return <Outlet />;
  }

  return (
    <div className="min-h-screen flex bg-canvas text-body font-sans antialiased">
      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0">
        <DevProfileSelector />
        {/* Page Content */}
        <main id="main-container" className="flex-1 container mx-auto max-w-6xl px-4 sm:px-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
