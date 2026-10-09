'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Calendar, MapPin, Clock, Copy } from 'lucide-react';
import { Suspense, useCallback, useState } from 'react';
import MemberSidebar from '@/components/dc/kit/MemberSidebar';
import NotchHero from '@/components/dc/kit/NotchHero';
import { CheckIcon, MenuIcon } from '@/components/dc/kit/icons';

function ReservationSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reservationCode = searchParams?.get('code') || 'RES-UNKNOWN';
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(reservationCode);
      // Could add a toast notification here
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const facts = [
    { icon: Clock, title: 'Valid for 48 hours', text: 'Items reserved until pickup' },
    { icon: MapPin, title: 'Store Pickup', text: '123 Aquarium St, Manila City' },
    { icon: Calendar, title: 'Store Hours', text: 'Mon-Sat: 9:00 AM - 7:00 PM' },
  ];

  return (
    <div className="dk dk-member">
      <div className="dk-app">
        <MemberSidebar id="sidebar" active="reservations" open={sidebarOpen} onClose={closeSidebar} />

        <section className="dk-app-main">
          <div className="dk-app-top">
            <div className="dk-app-top-l">
              <button
                type="button"
                className="dk-view-btn dk-app-menu"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open menu"
                aria-controls="sidebar"
                aria-expanded={sidebarOpen}
              >
                <MenuIcon />
              </button>
              <h1>Reservation Confirmed!</h1>
            </div>
          </div>

          {/* Hero: success + reservation details, with the code in the notch */}
          <div style={{ marginTop: 4 }}>
            <NotchHero flush
              tone="dark"
              behind="var(--dk-n-100)"
              notchHeight={150}
              notchLabel="Reservation Code"
              notch={
                <>
                  <p className="dk-meta-label">Reservation Code</p>
                  <div className="dk-row" style={{ gap: 12 }}>
                    <span
                      className="dk-h3"
                      style={{ fontSize: 26, color: 'var(--dk-red)', overflowWrap: 'anywhere' }}
                    >
                      {reservationCode}
                    </span>
                    <button
                      type="button"
                      className="dk-view-btn"
                      onClick={copyToClipboard}
                      aria-label="Copy reservation code"
                    >
                      <Copy size={16} aria-hidden="true" />
                    </button>
                  </div>
                </>
              }
            >
              <span
                className="dk-empty-icon"
                style={{ width: 56, height: 56, marginBottom: 18 }}
                aria-hidden="true"
              >
                <CheckIcon size={22} />
              </span>
              <p className="dk-lede" style={{ marginTop: 0, fontSize: 20 }}>
                Your items have been successfully reserved
              </p>
              <ul className="dk-stack" style={{ marginTop: 28 }}>
                {facts.map(({ icon: Icon, title, text }) => (
                  <li key={title} className="dk-row" style={{ alignItems: 'flex-start', gap: 14 }}>
                    <Icon size={20} style={{ color: 'var(--dk-red-bright)', flex: 'none', marginTop: 2 }} aria-hidden="true" />
                    <div>
                      <p style={{ fontWeight: 700 }}>{title}</p>
                      <p className="dk-small" style={{ color: 'var(--dk-n-400)' }}>{text}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </NotchHero>
          </div>

          <div className="dk-app-section dk-grid-2" style={{ alignItems: 'start' }}>
            {/* Important Notes */}
            <div className="dk-panel">
              <h3 className="dk-panel-title">Important Reminders</h3>
              <ul className="dk-small" style={{ marginTop: 14, paddingLeft: 20, listStyle: 'disc', display: 'grid', gap: 8, color: 'var(--dk-n-600)' }}>
                <li>Please bring a valid ID and your reservation code</li>
                <li>Items will be held for 48 hours from reservation time</li>
                <li>Payment can be made upon pickup (Cash or GCash)</li>
                <li>Contact us at +63 123 456 7890 for any concerns</li>
              </ul>
            </div>

            {/* Actions */}
            <div className="dk-panel">
              <div className="dk-stack">
                <button
                  type="button"
                  className="dk-btn dk-btn-red block"
                  onClick={() => router.push('/client/reservations')}
                >
                  View My Reservations
                </button>
                <button
                  type="button"
                  className="dk-btn dk-btn-outline-dark block"
                  onClick={() => router.push('/client/search')}
                >
                  Continue Shopping
                </button>
                <button
                  type="button"
                  className="dk-btn dk-btn-text"
                  style={{ justifySelf: 'center' }}
                  onClick={() => router.push('/client/dashboard')}
                >
                  Back to Home
                </button>
              </div>

              {/* Contact Info */}
              <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--dk-line)', textAlign: 'center' }}>
                <p className="dk-small dk-muted">Need help?</p>
                <p className="dk-small" style={{ marginTop: 4 }}>
                  Call us at <span style={{ color: 'var(--dk-red)', fontWeight: 700 }}>+63 123 456 7890</span>
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function ReservationSuccessPage() {
  return (
    <Suspense fallback={
      <div className="dk dk-member">
        <div className="dk-member-empty" role="status" style={{ margin: 24 }}>
          <p>Loading reservation details...</p>
        </div>
      </div>
    }>
      <ReservationSuccessContent />
    </Suspense>
  );
}
