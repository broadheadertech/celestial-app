'use client';

import { usePathname } from 'next/navigation';
import GlobalReservationOverlay from './ReservationOverlay';

export default function ClientReservationOverlay() {
  const pathname = usePathname();
  
  // Only show overlay on client routes
  if (!pathname.startsWith('/client')) {
    return null;
  }
  
  return <GlobalReservationOverlay />;
}