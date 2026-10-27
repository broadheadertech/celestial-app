'use client';

/**
 * The Cave — the shop itself: where it is, when it is open, how to book a viewing, and how we
 * work. One page for "who are you and where are you", because that is one question.
 *
 * It used to be a second product listing (the non-arowana fish), which read as a third shop
 * alongside /catalog and /shop. Those fish now live in /shop behind the "Live fish" filter;
 * /catalog stays as the arowana showcase. /visit and /about both redirect here.
 *
 * Every fact comes from Admin → Business Details via useBusiness() — nothing is hardcoded, and
 * a detail that isn't filled in hides its line rather than showing a placeholder.
 */

import Link from 'next/link';
import { hoursSummary, useBusiness } from '@/components/dc/business';
import ViewingBooking from '@/components/dc/ViewingBooking';
import { BrandMark } from '@/components/dc/kit/Brand';
import Placeholder from '@/components/dc/kit/Placeholder';
import NotchHero from '@/components/dc/kit/NotchHero';
import { ChipIcon, ClockIcon, PhoneIcon } from '@/components/dc/kit/icons';

/** How we work — process we can stand behind, not biography. */
const DISCIPLINES = [
  {
    title: 'Source',
    body: 'Direct relationships with breeders rather than brokers. We see the parent fish before we bid on a fry.',
    icon: <ChipIcon size={14} />,
  },
  {
    title: 'Quarantine',
    body: '21 days observed in isolation, water tested daily. Nothing joins the gallery tanks uncleared.',
    icon: <ClockIcon size={16} />,
  },
  {
    title: 'Husbandry',
    body: 'A diet plan per specimen and tank parameters logged twice a day, so a fish leaves here settled.',
    icon: <ChipIcon size={14} />,
  },
  {
    title: 'Continuity',
    body: 'We answer the phone years after the sale. Your fish has a long life to live, and we are still your second opinion.',
    icon: <PhoneIcon size={16} />,
  },
];

export default function CavePage() {
  const biz = useBusiness();
  const [hoursDays, hoursTime] = hoursSummary(biz.hours);

  // Only the facts that are actually on file get a column.
  const heroFacts = [
    ['Address', biz.address, biz.city],
    ['Hours', hoursDays, hoursTime],
    ['Phone', biz.phone, biz.landline],
  ].filter(([, value]) => value) as [string, string, string][];

  return (
    <div className="dk dk-cave dk-visit">
      {/* HERO */}
      <NotchHero
        tone="white"
        behind="var(--dk-n-100)"
        className="dk-visit-hero"
        notchWide
        notchHeight={110}
        notchLabel="Address and hours"
        notch={
          <div className="dk-stats">
            {heroFacts.map(([heading, primary, secondary]) => (
              <div key={heading}>
                <p className="dk-meta-label">{heading}</p>
                <p className="dk-meta-val">
                  {primary}
                  {heading === 'Hours' ? (
                    <>
                      <br />
                      <a href="#hours">See hours</a>
                    </>
                  ) : (
                    secondary && (
                      <>
                        <br />
                        {secondary}
                      </>
                    )
                  )}
                </p>
              </div>
            ))}
          </div>
        }
        aside={
          <figure className="dk-specimen dk-dark">
            <BrandMark onDark />
            <Placeholder src="/img/arowana-red.png" alt="Super Red arowana" contain />
            <figcaption className="dk-specimen-cap">
              The gallery{biz.city && <> &middot; {biz.city}</>}
            </figcaption>
          </figure>
        }
      >
        <p className="dk-eyebrow">The cave · By appointment</p>
        <h1>Where the fish live.</h1>
        <p className="dk-lede">
          {biz.storeName}
          {biz.city ? ` is in ${biz.city}` : ''}. We see one visitor at a time, so the tanks are
          yours &mdash; we&rsquo;ll pour tea and you can take as long as you need with the fish.
          There&rsquo;s never any pressure to buy.
        </p>
      </NotchHero>

      {/* BOOKING + MAP + HOURS + WHAT A VISIT LOOKS LIKE */}
      <ViewingBooking />

      {/* HOW WE WORK */}
      <section className="dk-section alt" aria-labelledby="cave-disciplines">
        <div className="dk-wrap">
          <div className="dk-sec-head">
            <div>
              <p className="dk-eyebrow">Four disciplines</p>
              <h2 id="cave-disciplines" className="dk-h2">How we work.</h2>
            </div>
          </div>
          <div className="dk-grid-4">
            {DISCIPLINES.map((d) => (
              <div key={d.title} className="dk-panel">
                <span className="dk-promise-icon">{d.icon}</span>
                <h3 className="dk-h4" style={{ marginTop: 12 }}>
                  {d.title}
                </h3>
                <p className="dk-small dk-muted" style={{ marginTop: 12 }}>
                  {d.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHAT TO SEE */}
      <section className="dk-section" aria-labelledby="cave-browse">
        <div className="dk-wrap narrow" style={{ textAlign: 'center' }}>
          <h2 id="cave-browse" className="dk-h2">See what is in the water.</h2>
          <p className="dk-lede dk-muted" style={{ maxWidth: 520, margin: '16px auto 0' }}>
            The arowana are in the Catalog. Everything else we keep &mdash; the rest of the fish,
            tanks, filtration, food and lighting &mdash; is in the Shop.
          </p>
          <div className="dk-actions" style={{ justifyContent: 'center', marginTop: 28 }}>
            <Link href="/catalog" className="dk-btn dk-btn-red">
              The Catalog
            </Link>
            <Link href="/shop" className="dk-btn dk-btn-outline-dark">
              Shop everything
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
