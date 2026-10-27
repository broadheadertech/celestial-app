'use client';

/**
 * Certified Ka-Dragon — the gallery of keepers who took a fish home.
 *
 * Built on the existing `testimonials` table, which already carries exactly the right fields:
 * who they are, where they are, what they bought and what they said. Staff curate it in
 * Admin → Testimonials; only published rows appear here.
 *
 * These are real customers' names and faces, so nothing is auto-published from sales data —
 * a row only exists because someone added it deliberately.
 */

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useQuery } from '@/components/dc/useQuery';
import { api } from '@/convex/_generated/api';
import NotchHero from '@/components/dc/kit/NotchHero';
import EmptyState from '@/components/dc/kit/EmptyState';
import Placeholder from '@/components/dc/kit/Placeholder';
import Chips from '@/components/dc/kit/Chips';

const initialsOf = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('') || '龍';

/** Everything before the first "·" in clientLocation, e.g. "Collector · Makati" → "Collector". */
const roleOf = (location?: string) => (location || '').split('·')[0]?.trim() || '';

export default function KaDragonPage() {
  const testimonials = useQuery(api.services.testimonials.listPublished, {});
  const [role, setRole] = useState('all');

  const roles = useMemo(() => {
    const found = new Set<string>();
    for (const t of testimonials ?? []) {
      const r = roleOf(t.clientLocation);
      if (r) found.add(r);
    }
    return ['all', ...Array.from(found).sort()];
  }, [testimonials]);

  const items = useMemo(
    () => (testimonials ?? []).filter((t) => role === 'all' || roleOf(t.clientLocation) === role),
    [testimonials, role],
  );

  const loading = testimonials === undefined;
  const withPhotos = (testimonials ?? []).filter((t) => t.photoUrl).length;

  return (
    <div className="dk">
      {/* HERO */}
      <NotchHero
        tone="light"
        notchHeight={110}
        notchLabel="Join them"
        notch={
          <div className="dk-row wrap" style={{ gap: 20 }}>
            <div className="dk-stat">
              <b>{loading ? '—' : (testimonials ?? []).length}</b>
              <span>certified keepers</span>
            </div>
            <Link href="/catalog" className="dk-btn dk-btn-red">
              Find your dragon
            </Link>
          </div>
        }
      >
        <p className="dk-eyebrow">Certified Ka-Dragon</p>
        <h1 className="dk-display">
          Dragons in
          <br />
          good hands.
        </h1>
        <p className="dk-lede">
          Every fish that leaves here goes to someone who keeps it properly. These are the keepers
          &mdash; what they took home, and what they made of it.
        </p>
      </NotchHero>

      {/* FILTER */}
      {roles.length > 2 && (
        <section className="dk-toolbar">
          <div className="dk-wrap">
            <div className="dk-tb-row dk-tb-row-2">
              <Chips
                label="Filter by keeper"
                visibleLabel="Keeper"
                options={roles}
                value={role}
                onChange={setRole}
                renderLabel={(r) => (r === 'all' ? 'All' : r)}
              />
              <p className="dk-tb-count" aria-live="polite">
                Showing {items.length} of {(testimonials ?? []).length}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* GALLERY */}
      <section className="dk-testimonials" aria-labelledby="kd-title">
        <div className="dk-wrap">
          <h2 className="dk-h2" id="kd-title" style={{ marginBottom: 32 }}>
            {loading ? 'Loading the keepers…' : `${withPhotos} of them sent us a photo.`}
          </h2>

          {!loading && items.length === 0 ? (
            <div className="dk-panel" style={{ maxWidth: 560, margin: '0 auto' }}>
              <EmptyState
                title={
                  (testimonials ?? []).length === 0
                    ? 'The first Ka-Dragon is still to come'
                    : 'No keepers match that filter'
                }
                actions={
                  <Link href="/catalog" className="dk-btn dk-btn-red">
                    Browse the gallery
                  </Link>
                }
              >
                {(testimonials ?? []).length === 0
                  ? 'As keepers send us photos of their fish settled in, they will appear here.'
                  : 'Clear the filter to see everyone.'}
              </EmptyState>
            </div>
          ) : (
            <div className="dk-tm-grid">
              {items.map((t) => (
                <figure key={t._id} className="dk-tm">
                  {t.photoUrl && <Placeholder src={t.photoUrl} alt={`${t.clientName} with their fish`} />}
                  <div className="dk-tm-body">
                    {t.rating
                      ? (() => {
                          const stars = Math.max(1, Math.min(5, Math.round(t.rating!)));
                          return (
                            <div className="dk-tm-stars" role="img" aria-label={`${stars} out of 5 stars`}>
                              {'★'.repeat(stars)}
                              <span>{'★'.repeat(5 - stars)}</span>
                            </div>
                          );
                        })()
                      : null}
                    <blockquote>{t.quote}</blockquote>
                    <figcaption>
                      {!t.photoUrl && <span className="dk-avatar">{initialsOf(t.clientName)}</span>}
                      <div>
                        <b>{t.clientName}</b>
                        {(t.clientLocation || t.productName) && (
                          <small>{[t.clientLocation, t.productName].filter(Boolean).join(' · ')}</small>
                        )}
                      </div>
                    </figcaption>
                  </div>
                </figure>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="dk-section alt" aria-labelledby="kd-cta">
        <div className="dk-wrap narrow" style={{ textAlign: 'center' }}>
          <h2 id="kd-cta" className="dk-h2">Become a Ka-Dragon.</h2>
          <p className="dk-lede dk-muted" style={{ maxWidth: 520, margin: '16px auto 0' }}>
            Already keeping one of ours? Send us a photo and we&rsquo;ll add you to the wall.
          </p>
          <div className="dk-actions" style={{ justifyContent: 'center', marginTop: 28 }}>
            <Link href="/contact" className="dk-btn dk-btn-red">
              Send us your photo
            </Link>
            <Link href="/cave" className="dk-btn dk-btn-outline-dark">
              Visit the cave
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
