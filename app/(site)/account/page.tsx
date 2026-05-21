'use client';

import Link from 'next/link';
import { useState, useMemo } from 'react';
import { ArrowRight, Calendar, Package, Heart, LogOut, User as UserIcon, Trash2 } from 'lucide-react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useAuthStore } from '@/store/auth';
import { useRouter } from 'next/navigation';

const fmt = (n: number) =>
  `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

type Tab = 'overview' | 'orders' | 'reservations' | 'wishlist' | 'profile';

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
      (reservations as any[]).find(
        (r) => r.status === 'confirmed' || r.status === 'pending' || r.status === 'ready_for_pickup',
      ) || null
    );
  }, [reservations]);

  const totalSpent = useMemo(() => {
    const oSum = (orders ?? []).reduce(
      (s: number, o: any) => s + (o.amountPaid ?? o.totalAmount ?? 0),
      0,
    );
    const rSum = ((reservations as any[]) ?? []).reduce(
      (s: number, r: any) => s + (r.amountPaid ?? 0),
      0,
    );
    return oSum + rSum;
  }, [orders, reservations]);

  if (!user) {
    return (
      <main className="py-20" style={{ padding: '80px 0' }}>
        <div className="site-container text-center max-w-[480px] mx-auto">
          <UserIcon size={32} className="mx-auto mb-4" style={{ color: 'var(--ink-4)' }} />
          <h1
            className="display mb-3"
            style={{ fontSize: 28, fontVariationSettings: '"opsz" 32, "wght" 700' }}
          >
            Sign in to view your case
          </h1>
          <p style={{ color: 'var(--ink-3)', fontSize: 14, marginBottom: 24 }}>
            Your orders, reservations, and wishlist live here. We&apos;ll keep them safe between
            visits.
          </p>
          <Link href="/auth/login" className="b b-primary b-lg">
            Sign in <ArrowRight size={14} />
          </Link>
        </div>
      </main>
    );
  }

  const fullName = `${user.firstName} ${user.lastName}`.trim();
  const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || 'DC';

  return (
    <main>
      {/* Hero */}
      <section className="pt-15 pb-10" style={{ padding: '60px 0 40px' }}>
        <div className="site-container">
          <div className="flex items-center gap-5 flex-wrap">
            <span
              className="inline-flex items-center justify-center rounded-full font-bold text-[20px]"
              style={{
                width: 80,
                height: 80,
                background: 'var(--red-wash)',
                color: 'var(--red-hi)',
                border: '1px solid var(--red)',
              }}
            >
              {initials}
            </span>
            <div>
              <div className="placard mb-1">Welcome back</div>
              <h1
                className="display-xl"
                style={{ fontSize: 'clamp(32px, 5vw, 56px)' }}
              >
                {fullName || 'Collector'}
              </h1>
              <div className="placard mt-1.5" style={{ color: 'var(--ink-3)' }}>
                {user.email}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <section
        className="sticky top-[76px] z-30"
        style={{
          background: 'color-mix(in oklch, var(--bg) 92%, transparent)',
          backdropFilter: 'blur(20px)',
          borderTop: '1px solid var(--line-soft)',
          borderBottom: '1px solid var(--line-soft)',
        }}
      >
        <div className="site-container flex gap-1 overflow-x-auto scrollbar-hide" style={{ padding: '12px 32px' }}>
          {([
            { id: 'overview' as Tab, label: 'Overview' },
            { id: 'orders' as Tab, label: `Orders · ${orders?.length || 0}` },
            { id: 'reservations' as Tab, label: `Reservations · ${(reservations as any[])?.length || 0}` },
            { id: 'wishlist' as Tab, label: `Wishlist · ${wishlist?.length || 0}` },
            { id: 'profile' as Tab, label: 'Profile' },
          ]).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="px-4 py-2 rounded text-[13px] font-semibold whitespace-nowrap"
              style={{
                background: tab === t.id ? 'var(--surface)' : 'transparent',
                color: tab === t.id ? 'var(--ink)' : 'var(--ink-3)',
                border: '1px solid ' + (tab === t.id ? 'var(--line)' : 'transparent'),
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </section>

      <section className="py-10" style={{ padding: '40px 0 80px' }}>
        <div className="site-container">
          {tab === 'overview' && (
            <div className="flex flex-col gap-7">
              {/* Stats */}
              <div
                className="grid gap-3"
                style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}
              >
                <StatCard label="Orders placed" value={String(orders?.length || 0)} />
                <StatCard label="Reservations" value={String((reservations as any[])?.length || 0)} />
                <StatCard label="Lifetime spend" value={fmt(totalSpent)} />
              </div>

              {/* Active reservation hero */}
              {liveReservation && (
                <div
                  className="rounded p-7"
                  style={{
                    background: 'linear-gradient(135deg, var(--oxblood), oklch(0 0 0) 80%)',
                    border: '1px solid var(--line)',
                    color: 'oklch(0.99 0 0)',
                  }}
                >
                  <div className="placard mb-3" style={{ color: 'oklch(0.99 0 0 / 0.55)' }}>
                    Active reservation
                  </div>
                  <h3
                    className="display mb-3"
                    style={{ fontSize: 28, fontVariationSettings: '"opsz" 32, "wght" 700' }}
                  >
                    {liveReservation.reservationCode || 'Specimen on hold'}
                  </h3>
                  <p
                    className="text-[14px] mb-5"
                    style={{ color: 'oklch(0.99 0 0 / 0.78)', lineHeight: 1.5 }}
                  >
                    {liveReservation.items?.length || liveReservation.totalQuantity || 1} live
                    item{(liveReservation.items?.length || liveReservation.totalQuantity) === 1 ? '' : 's'}.
                    Status: <strong>{liveReservation.status}</strong>.
                  </p>
                  <div className="flex gap-3 flex-wrap">
                    {liveReservation.totalAmount && (
                      <div className="flex items-center gap-2">
                        <span className="placard" style={{ color: 'oklch(0.99 0 0 / 0.55)' }}>
                          Total
                        </span>
                        <span className="font-mono-tabular font-bold">
                          {fmt(liveReservation.totalAmount)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Recent orders */}
              <div>
                <div className="placard mb-3">Recent orders</div>
                {!orders?.length ? (
                  <p className="py-10 text-center text-[14px]" style={{ color: 'var(--ink-4)' }}>
                    No orders yet.
                  </p>
                ) : (
                  <div className="flex flex-col">
                    {orders.slice(0, 5).map((o, i) => (
                      <div
                        key={o._id}
                        className="grid items-center gap-3 py-3.5 px-1"
                        style={{
                          gridTemplateColumns: 'auto 1fr auto',
                          borderBottom:
                            i === Math.min(orders.length, 5) - 1 ? 'none' : '1px solid var(--line-soft)',
                        }}
                      >
                        <span
                          className="font-mono-tabular text-[11px]"
                          style={{ color: 'var(--ink-4)' }}
                        >
                          {new Date(o.createdAt).toLocaleDateString('en-PH', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                        <div>
                          <div className="text-[13px] font-semibold">
                            ORD-{String(o._id).slice(-6).toUpperCase()}
                          </div>
                          <div className="placard mt-0.5">
                            {o.items.length} item{o.items.length === 1 ? '' : 's'} · {o.status}
                          </div>
                        </div>
                        <span className="font-mono-tabular font-bold text-[14px]">
                          {fmt(o.totalAmount)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'orders' && (
            <div className="flex flex-col gap-2">
              {!orders?.length ? (
                <p className="py-10 text-center text-[14px]" style={{ color: 'var(--ink-4)' }}>
                  No orders yet.
                </p>
              ) : (
                orders.map((o) => (
                  <div
                    key={o._id}
                    className="grid items-center gap-4 py-4 px-5 rounded"
                    style={{
                      gridTemplateColumns: 'auto 1fr auto auto',
                      background: 'var(--surface)',
                      border: '1px solid var(--line-soft)',
                    }}
                  >
                    <Package size={18} style={{ color: 'var(--ink-3)' }} />
                    <div>
                      <div className="text-[14px] font-semibold">
                        ORD-{String(o._id).slice(-6).toUpperCase()}
                      </div>
                      <div className="placard mt-1">
                        {new Date(o.createdAt).toLocaleDateString('en-PH', {
                          dateStyle: 'medium',
                        })}{' '}
                        · {o.items.length} item{o.items.length === 1 ? '' : 's'} · {o.status}
                      </div>
                    </div>
                    <span className="font-mono-tabular font-bold text-[14px]">
                      {fmt(o.totalAmount)}
                    </span>
                    <span
                      className="placard px-2 py-1 rounded"
                      style={{
                        background: 'var(--bg-2)',
                        color: 'var(--ink-3)',
                      }}
                    >
                      {o.paymentStatus || 'unpaid'}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'reservations' && (
            <div className="flex flex-col gap-2">
              {!(reservations as any[])?.length ? (
                <p className="py-10 text-center text-[14px]" style={{ color: 'var(--ink-4)' }}>
                  No reservations yet.
                </p>
              ) : (
                (reservations as any[]).map((r) => (
                  <div
                    key={r._id}
                    className="grid items-center gap-4 py-4 px-5 rounded"
                    style={{
                      gridTemplateColumns: 'auto 1fr auto auto',
                      background: 'var(--surface)',
                      border: '1px solid var(--line-soft)',
                    }}
                  >
                    <Calendar size={18} style={{ color: 'var(--red-hi)' }} />
                    <div>
                      <div className="text-[14px] font-semibold">
                        {r.reservationCode || `RES-${String(r._id).slice(-6).toUpperCase()}`}
                      </div>
                      <div className="placard mt-1">
                        {new Date(r.reservationDate || r.createdAt).toLocaleDateString('en-PH', {
                          dateStyle: 'medium',
                        })}{' '}
                        · {r.items?.length || r.totalQuantity || 1} live · {r.status}
                      </div>
                    </div>
                    <span className="font-mono-tabular font-bold text-[14px]">
                      {fmt(r.totalAmount || 0)}
                    </span>
                    <span
                      className="placard px-2 py-1 rounded"
                      style={{
                        background:
                          r.status === 'pending' ? 'var(--gold-wash)' : 'var(--bg-2)',
                        color:
                          r.status === 'pending' ? 'var(--gold-deep)' : 'var(--ink-3)',
                      }}
                    >
                      {r.paymentStatus || 'deposit'}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'wishlist' && (
            <>
              {!wishlist?.length ? (
                <div className="text-center py-20" style={{ color: 'var(--ink-3)' }}>
                  <Heart size={28} className="mx-auto mb-4" style={{ color: 'var(--ink-4)' }} />
                  <p className="text-[14px] mb-4">Nothing on hold for later yet.</p>
                  <Link href="/catalog" className="b">
                    Browse the gallery <ArrowRight size={12} />
                  </Link>
                </div>
              ) : (
                <div
                  className="grid gap-4"
                  style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}
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
                      <div
                        key={item._id}
                        className="rounded overflow-hidden flex flex-col"
                        style={{
                          background: 'var(--surface)',
                          border: '1px solid var(--line-soft)',
                        }}
                      >
                        <Link
                          href={`/specimen/${p._id}`}
                          className="block"
                          style={{ color: 'var(--ink)' }}
                        >
                          <div
                            className="aspect-[4/3]"
                            style={{
                              background:
                                'radial-gradient(ellipse at 50% 40%, var(--oxblood), oklch(0 0 0))',
                              position: 'relative',
                              overflow: 'hidden',
                            }}
                          >
                            {p.image ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={p.image}
                                alt={p.name}
                                className="absolute inset-0 w-full h-full object-cover"
                              />
                            ) : null}
                          </div>
                        </Link>
                        <div className="p-4 flex flex-col gap-2 flex-1">
                          <div className="placard">{p.categoryName || 'Specimen'}</div>
                          <Link
                            href={`/specimen/${p._id}`}
                            className="display text-[15px] line-clamp-2"
                            style={{
                              color: 'var(--ink)',
                              fontVariationSettings: '"opsz" 22, "wght" 600',
                            }}
                          >
                            {p.name}
                          </Link>
                          <div className="flex items-center justify-between mt-auto pt-2">
                            <span className="font-mono-tabular text-[14px] font-bold">
                              {fmt(p.price)}
                            </span>
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
                              className="p-1.5 rounded"
                              style={{ color: 'var(--ink-4)' }}
                            >
                              <Trash2 size={13} />
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
            <div className="max-w-[480px] flex flex-col gap-5">
              <div>
                <div className="placard mb-1.5">Name</div>
                <div className="input" style={{ background: 'var(--bg-2)' }}>
                  {fullName || '—'}
                </div>
              </div>
              <div>
                <div className="placard mb-1.5">Email</div>
                <div className="input" style={{ background: 'var(--bg-2)' }}>
                  {user.email}
                </div>
              </div>
              <div>
                <div className="placard mb-1.5">Phone</div>
                <div className="input" style={{ background: 'var(--bg-2)' }}>
                  {user.phone || '—'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  logout();
                  router.push('/');
                }}
                className="b mt-4 self-start"
              >
                <LogOut size={14} />
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
    <div
      className="p-5 rounded"
      style={{ background: 'var(--surface)', border: '1px solid var(--line-soft)' }}
    >
      <div className="placard">{label}</div>
      <div
        className="display font-mono-tabular mt-2"
        style={{ fontSize: 28, fontVariationSettings: '"opsz" 36, "wght" 700' }}
      >
        {value}
      </div>
    </div>
  );
}
