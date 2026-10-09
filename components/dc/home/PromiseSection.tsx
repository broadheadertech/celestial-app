'use client';

/**
 * "The Cave · Our promise" (Home) — editorial reveal + accordion.
 * Four rows; exactly one is open (Provenance on load). Opening a row sweeps a red panel across it.
 * Hover opens on devices with a real pointer; click, tap and keyboard focus open everywhere.
 */

import { useRef, useState } from 'react';
import { gsap, revealHeading, revealParagraphs, useSectionMotion } from './motion';

const ITEMS = [
  { t: 'Provenance', b: 'Every fish carries a microchip, a CITES certificate, and our hand-written lineage card.' },
  { t: 'Quarantine', b: '21 days of observation in isolated systems before any specimen joins the gallery.' },
  { t: 'Husbandry', b: 'Tank parameters monitored daily. Diet planned per specimen. We sweat the small things.' },
  { t: 'Continuity', b: 'We answer the phone five years after the sale. Your fish has a long life to live.' },
];

export default function PromiseSection() {
  const root = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(0);

  useSectionMotion(root, (el) => {
    revealHeading(el);
    revealParagraphs(el);
    gsap.from(el.querySelectorAll('.dk-pr-row'), {
      y: 50, opacity: 0, duration: 1, ease: 'power3.out', stagger: 0.09,
      scrollTrigger: { trigger: el.querySelector('.dk-pr-list'), start: 'top 80%' },
    });
  });

  return (
    <section ref={root} className="dk-pr" id="story" aria-labelledby="prov-title">
      <div className="dk-wrap">
        <div className="dk-pr-top">
          <div>
            <p className="dk-eyebrow-line">The Cave · Our promise</p>
            <h2 className="dk-reveal-h" id="prov-title">
              <span className="dk-mask"><span>Provenance,</span></span>
              <span className="dk-mask"><span>then patience.</span></span>
            </h2>
          </div>
          <p className="dk-pr-intro dk-reveal-p">
            Every arowana that crosses our threshold is identified, isolated, and observed for twenty-one days before it joins the gallery.
            We do not sell a fish until we would keep it ourselves.
          </p>
        </div>

        <div className="dk-pr-list">
          {ITEMS.map((it, i) => (
            <button
              key={it.t}
              type="button"
              className="dk-pr-row"
              aria-expanded={open === i}
              onClick={() => setOpen(i)}
              onFocus={() => setOpen(i)}
              onPointerEnter={(e) => {
                if (e.pointerType === 'mouse') setOpen(i);
              }}
            >
              <span className="dk-pr-sweep" aria-hidden="true" />
              <span className="dk-pr-title">{it.t}</span>
              <span className="dk-pr-desc">{it.b}</span>
              <span className="dk-pr-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="20" height="20" focusable="false">
                  <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
