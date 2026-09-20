import { ReactNode } from 'react';

/**
 * Legacy customer app screens (kept until /client is retired).
 * These screens were written for the dark theme and hard-code white text, so the
 * .theme-compat layer in app/globals.css remaps those colours when the light theme is on.
 */
export default function ClientLayout({ children }: { children: ReactNode }) {
  return <div className="theme-compat">{children}</div>;
}
