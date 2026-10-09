'use client';

import Link from 'next/link';
import { useState, useMemo } from 'react';
import { LogOut, Trash2 } from 'lucide-react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useAuthStore } from '@/store/auth';
import { useRouter } from 'next/navigation';
import NotchHero from '@/components/dc/kit/NotchHero';
import EmptyState from '@/components/dc/kit/EmptyState';
import Placeholder from '@/components/dc/kit/Placeholder';
import { CalendarIcon, HeartIcon, OrdersIcon, SignInIcon } from '@/components/dc/kit/icons';

const fmt = (n: number) =>
  `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

type Tab = 'overview' | 'orders' | 'reservations' | 'wishlist' | 'profile';

/** Kit status pill tone for an order / reservation status. */
function statusTone(status?: string) {
  switch (status) {
    case 'delivered':
    case 'completed':
      return 'black';
    case 'ready_for_pickup':
      return 'red';
    case 'pending':
      return 'pale';
    default:
      return '';
  }
}

/** Kit status pill tone for a payment status. */
function payTone(status?: string) {
  if (status === 'paid') return 'black';
  if (status === 'partial') return 'pale';
  return '';
}

const num = { fontVariantNumeric: 'tabular-nums', fontWeight: 700 } as const;

export default function AccountPage() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const [tab, setTab] = useState<Tab>('overview');

  const orders = useQuery(
    api.services.orders.getUserOrders,
    user ? { userId: user._id as Id<'users'> } : 'skip',
  );
  const reservations = useQuery(
    api.services.reservations.getReservations,
    user ? { userId: user._id as Id<'users'> } : 'skip',
  );
  const wishlist = useQuery(
    api.services.wishlist.getWishlist,
    user ? { userId: user._id as Id<'users'> } : 'skip',
  );
  const removeFromWishlist = useMutation(api.services.wishlist.removeFromWishlist);

  const liveReservation = useMemo(() => {
    if (!reservations) return null;
    return (
      reservations.find(
        (r) => r.status === 'confirmed' || r.status === 'pending' || r.status === 'ready_for_pickup',
      ) || null
    );
  }, [reservations]);

  const totalSpent = useMemo(() => {
    const oSum = (orders ?? []).reduce(
      (s: number, o) => s + (o.amountPaid ?? o.totalAmount ?? 0),
      0,
    );
    const rSum = (reservations ?? []).reduce(
      (s: number, r) => s + (r.amountPaid ?? 0),
      0,
    );
    return oSum + rSum;
  }, [orders, reservations]);

  if (!user) {
    return (
      <main className="dk">
        <section className="dk-section">
          <div className="dk-wrap" style={{ maxWidth: 'calc(560px + var(--dk-gutter) * 2)' }}>
            <div className="dk-panel">
              <EmptyState
                as="h1"
                icon={<SignInIcon size={24} />}
                title="Sign in to view your case"
                actions={
                  <Link href="/auth/login" className="dk-btn dk-btn-red">
                    Sign in
                  </Link>
                }
              >
                Your orders, reservations, and wishlist live here. We&apos;ll keep them safe between
                visits.
              </EmptyState>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const fullName = `${user.firstName} ${user.lastName}`.trim();
  const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || 'DC';

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'orders', label: `Orders · ${orders === undefined ? '…' : orders.length}` },
    { id: 'reservations', label: `Reservations · ${reservations === undefined ? '…' : reservations.length}` },
    { id: 'wishlist', label: `Wishlist · ${wishlist === undefined ? '…' : wishlist.length}` },
    { id: 'profile', label: 'Profile' },
  ];

  return (
    <main className="dk">
      {/* Hero — lifetime spend in the notch */}
      <NotchHero
        tone="dark"
        notchHeight={104}
        notchLabel="Lifetime spend"
        notch={
          <div className="dk-stat">
            <b style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(totalSpent)}</b>
            <span>Lifetime spend</span>
          </div>
        }
      >
        <div className="dk-row wrap" style={{ gap: 20, alignItems: 'center' }}>
          <span className="dk-avatar" aria-hidden="true" style={{ width: 80, height: 80, fontSize: 22 }}>
            {initials}
          </span>
          <div style={{ minWidth: 0 }}>
            <p className="dk-eyebrow">Welcome back</p>
            <h1 className="dk-h1" style={{ marginTop: 6, overflowWrap: 'anywhere' }}>
              {fullName || 'Collector'}
            </h1>
            <p className="dk-small" style={{ marginTop: 6, color: 'var(--dk-n-400)', overflowWrap: 'anywhere' }}>
              {user.email}
            </p>
          </div>
        </div>
      </NotchHero>

      {/* Tabs */}
      <section
        className="sticky top-[72px] min-[861px]:top-[88px] z-30"
        style={{
          marginTop: 32,
          background: 'rgba(255,255,255,.94)',
          backdropFilter: 'blur(20px)',
          borderTop: '1px solid var(--dk-line)',
          borderBottom: '1px solid var(--dk-line)',
        }}
      >
        <div className="dk-wrap" style={{ paddingTop: 12, paddingBottom: 12 }}>
          <div className="dk-tabs" role="tablist" aria-label="Account sections">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                id={`acct-tab-${t.id}`}
                aria-selected={tab === t.id}
                aria-controls="acct-panel"
                onClick={() => setTab(t.id)}
                className="dk-chip"
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="dk-section" style={{ paddingTop: 40 }}>
        <div className="dk-wrap" id="acct-panel" role="tabpanel" aria-labelledby={`acct-tab-${tab}`}>
          {tab === 'overview' && (
            <div className="dk-stack lg">
              {/* Stats */}
              <div className="dk-grid-3">
                <StatCard label="Orders placed" value={String(orders?.length || 0)} />
                <StatCard label="Reservations" value={String(reservations?.length || 0)} />
                <StatCard label="Lifetime spend" value={fmt(totalSpent)} />
              </div>

              {/* Active reservation */}
              {liveReservation && (
                <div className="dk-panel dark">
                  <p className="dk-eyebrow" style={{ color: 'var(--dk-red-bright)' }}>Active reservation</p>
                  <h3 className="dk-h3" style={{ marginTop: 8 }}>
                    {liveReservation.reservationCode || 'Specimen on hold'}
                  </h3>
                  <p style={{ marginTop: 10, fontSize: 15, color: 'var(--dk-n-300)' }}>
                    {liveReservation.items?.length || liveReservation.totalQuantity || 1} live
                    item{(liveReservation.items?.length || liveReservation.totalQuantity) === 1 ? '' : 's'}.
                    Status: <strong style={{ color: 'var(--dk-white)' }}>{liveReservation.status}</strong>.
                  </p>
                  {liveReservation.totalAmount && (
                    <div className="dk-row" style={{ marginTop: 18 }}>
                      <span className="dk-small" style={{ color: 'var(--dk-n-400)' }}>Total</span>
                      <span style={num}>{fmt(liveReservation.totalAmount)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Recent orders */}
              <div className="dk-panel">
                <div className="dk-panel-head" style={{ marginBottom: 8 }}>
                  <h2 className="dk-panel-title">Recent orders</h2>
                </div>
                {orders === undefined ? (
                  <p className="dk-small dk-muted" role="status" style={{ padding: '32px 0', textAlign: 'center' }}>Loading orders…</p>
                ) : !orders.length ? (
                  <EmptyState icon={<OrdersIcon />} title="No orders yet." />
                ) : (
                  <ul className="dk-list">
                    {orders.slice(0, 5).map((o) => (
                      <li
                        key={o._id}
                        className="dk-list-row"
                        style={{ display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr) auto', gap: 16 }}
                      >
                        <span className="dk-small dk-muted" style={{ fontVariantNumeric: 'tabular-nums' }}>
                          {new Date(o.createdAt).toLocaleDateString('en-PH', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontSize: 15, fontWeight: 700 }}>
                            ORD-{String(o._id).slice(-6).toUpperCase()}
                          </p>
                          <div className="dk-row wrap" style={{ gap: 8, marginTop: 4 }}>
                            <span className="dk-small dk-muted">
                              {o.items.length} item{o.items.length === 1 ? '' : 's'}
                            </span>
                            <span className={`dk-status ${statusTone(o.status)}`}>{o.status}</span>
                          </div>
                        </div>
                        <span style={num}>{fmt(o.totalAmount)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {tab === 'orders' && (
            <>
              {orders === undefined ? (
                <p className="dk-small dk-muted" role="status" style={{ padding: '40px 0', textAlign: 'center' }}>Loading orders…</p>
              ) : !orders.length ? (
                <div className="dk-panel">
                  <EmptyState icon={<OrdersIcon />} title="No orders yet." />
                </div>
              ) : (
                <ul className="dk-panel dk-list" style={{ paddingTop: 4, paddingBottom: 4 }}>
                  {orders.map((o) => (
                    <li
                      key={o._id}
                      className="dk-list-row"
                      style={{ display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr) auto', gap: 16 }}
                    >
                      <span style={{ color: 'var(--dk-n-500)' }}><OrdersIcon /></span>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: 15, fontWeight: 700 }}>
                          ORD-{String(o._id).slice(-6).toUpperCase()}
                        </p>
                        <div className="dk-row wrap" style={{ gap: 8, marginTop: 4 }}>
                          <span className="dk-small dk-muted">
                            {new Date(o.createdAt).toLocaleDateString('en-PH', {
                              dateStyle: 'medium',
                            })}{' '}
                            · {o.items.length} item{o.items.length === 1 ? '' : 's'}
                          </span>
                          <span className={`dk-status ${statusTone(o.status)}`}>{o.status}</span>
                        </div>
                      </div>
                      <div style={{ display: 'grid', justifyItems: 'end', gap: 6 }}>
                        <span style={num}>{fmt(o.totalAmount)}</span>
                        <span className={`dk-status ${payTone(o.paymentStatus)}`}>
                          {o.paymentStatus || 'unpaid'}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}

          {tab === 'reservations' && (
            <>
              {reservations === undefined ? (
                <p className="dk-small dk-muted" role="status" style={{ padding: '40px 0', textAlign: 'center' }}>Loading reservations…</p>
              ) : !reservations.length ? (
                <div className="dk-panel">
                  <EmptyState icon={<CalendarIcon />} title="No reservations yet." />
                </div>
              ) : (
                <ul className="dk-panel dk-list" style={{ paddingTop: 4, paddingBottom: 4 }}>
                  {reservations.map((r) => (
                    <li
                      key={r._id}
                      className="dk-list-row"
                      style={{ display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr) auto', gap: 16 }}
                    >
                      <span style={{ color: 'var(--dk-red)' }}><CalendarIcon /></span>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: 15, fontWeight: 700 }}>
                          {r.reservationCode || `RES-${String(r._id).slice(-6).toUpperCase()}`}
                        </p>
                        <div className="dk-row wrap" style={{ gap: 8, marginTop: 4 }}>
                          <span className="dk-small dk-muted">
                            {new Date(r.reservationDate || r.createdAt).toLocaleDateString('en-PH', {
                              dateStyle: 'medium',
                            })}{' '}
                            · {r.items?.length || r.totalQuantity || 1} live
                          </span>
                          <span className={`dk-status ${statusTone(r.status)}`}>{r.status}</span>
                        </div>
                      </div>
                      <div style={{ display: 'grid', justifyItems: 'end', gap: 6 }}>
                        <span style={num}>{fmt(r.totalAmount || 0)}</span>
                        <span className={`dk-status ${r.status === 'pending' ? 'pale' : payTone(r.paymentStatus)}`}>
                          {r.paymentStatus || 'deposit'}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}

          {tab === 'wishlist' && (
            <>
              {wishlist === undefined ? (
                <p className="dk-small dk-muted" role="status" style={{ padding: '40px 0', textAlign: 'center' }}>Loading wishlist…</p>
              ) : !wishlist.length ? (
                <div className="dk-panel">
                  <EmptyState
                    icon={<HeartIcon size={24} />}
                    title="Nothing on hold for later yet."
                    actions={
                      <Link href="/catalog" className="dk-btn dk-btn-red">
                        Browse the gallery
                      </Link>
                    }
                  />
                </div>
              ) : (
                <div
                  style={{ display: 'grid', gap: 24, gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}
                >
                  {wishlist.map((item) => {
                    if (!item.product) return null;
                    const p = item.product as {
                      _id: string;
                      name: string;
                      price: number;
                      image?: string;
                      sku?: string | number;
                      categoryName?: string;
                      stock?: number;
                    };
                    return (
                      <div key={item._id} className="dk-panel flush lift" style={{ display: 'flex', flexDirection: 'column' }}>
                        <Link href={`/specimen-detail?id=${p._id}`} style={{ display: 'block' }}>
                          <Placeholder
                            src={p.image}
                            alt={p.name}
                            style={{ aspectRatio: '4/3', borderRadius: 0, borderWidth: p.image ? 0 : '0 0 1px' }}
                          />
                        </Link>
                        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                          <p className="dk-small dk-muted">{p.categoryName || 'Specimen'}</p>
                          <Link
                            href={`/specimen-detail?id=${p._id}`}
                            className="dk-h4"
                            style={{ fontSize: 17, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                          >
                            {p.name}
                          </Link>
                          <div className="dk-row between" style={{ marginTop: 'auto', paddingTop: 8 }}>
                            <span style={num}>{fmt(p.price)}</span>
                            <button
                              type="button"
                              onClick={async () => {
                                if (!user) return;
                                await removeFromWishlist({
                                  userId: user._id as Id<'users'>,
                                  productId: p._id as Id<'products'>,
                                });
                              }}
                              aria-label="Remove"
                              className="dk-btn dk-btn-outline-dark xs"
                              style={{ width: 32, padding: 0 }}
                            >
                              <Trash2 size={14} aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {tab === 'profile' && (
            <div className="dk-panel" style={{ maxWidth: 520 }}>
              <div className="dk-stack">
                <ProfileField label="Name" value={fullName || '—'} />
                <ProfileField label="Email" value={user.email} />
                <ProfileField label="Phone" value={user.phone || '—'} />
              </div>
              <button
                type="button"
                onClick={() => {
                  logout();
                  router.push('/');
                }}
                className="dk-btn dk-btn-outline-dark"
                style={{ marginTop: 28 }}
              >
                <LogOut size={16} aria-hidden="true" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="dk-panel">
      <p className="dk-small dk-muted">{label}</p>
      <p className="dk-h3" style={{ marginTop: 8, fontFamily: 'var(--dk-f-display)', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </p>
    </div>
  );
}

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <div className="dk-field">
      <span className="dk-label">{label}</span>
      <div className="dk-input" style={{ display: 'flex', alignItems: 'center', background: 'var(--dk-n-100)', overflowWrap: 'anywhere' }}>
        {value}
      </div>
    </div>
  );
}
