'use client';

/**
 * "陰陽 · Balance" (Home) — bento cards with 3D tilt.
 * Copy column + a Fire card and a Gold card, joined by a yin-yang badge that turns with the scroll.
 * Tilt + fish parallax only on devices with a fine pointer that can hover, and never under reduced motion.
 */

import { useRef } from 'react';
import { gsap, revealHeading, revealParagraphs, useSectionMotion } from './motion';

const MAX_TILT = 12; // deg
const FISH_X = 30; // px
const FISH_Y = 20; // px

export default function BalanceSection() {
  const root = useRef<HTMLElement>(null);

  useSectionMotion(root, (el) => {
    revealHeading(el);
    revealParagraphs(el);

    const cards = Array.from(el.querySelectorAll<HTMLElement>('.dk-bal-card'));
    gsap.from(cards, {
      y: 90, opacity: 0, duration: 1.2, ease: 'power3.out', stagger: 0.12,
      scrollTrigger: { trigger: el.querySelector('.dk-bal-cards'), start: 'top 72%' },
    });

    const badge = el.querySelector('.dk-bal-badge');
    if (badge) {
      gsap.to(badge, { rotation: 360, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } });
    }

    // 3D tilt: hover-capable devices only.
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const offs = cards.map((card) => {
      const fish = card.querySelector('.dk-bal-fish');
      const move = (e: PointerEvent) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5; // -0.5 … 0.5
        const py = (e.clientY - r.top) / r.height - 0.5;
        gsap.to(card, { rotationY: px * 2 * MAX_TILT, rotationX: -py * 2 * MAX_TILT, duration: 0.7, ease: 'power3.out', overwrite: 'auto' });
        if (fish) gsap.to(fish, { x: px * 2 * FISH_X, y: py * 2 * FISH_Y, duration: 0.7, ease: 'power3.out', overwrite: 'auto' });
      };
      const leave = () => {
        gsap.to(card, { rotationY: 0, rotationX: 0, duration: 1, ease: 'elastic.out(1,.6)', overwrite: 'auto' });
        if (fish) gsap.to(fish, { x: 0, y: 0, duration: 1, ease: 'elastic.out(1,.6)', overwrite: 'auto' });
      };
      card.addEventListener('pointermove', move);
      card.addEventListener('pointerleave', leave);
      return () => {
        card.removeEventListener('pointermove', move);
        card.removeEventListener('pointerleave', leave);
      };
    });
    return () => offs.forEach((off) => off());
  });

  return (
    <section ref={root} className="dk-bal" aria-labelledby="balance-title">
      <div className="dk-wrap dk-bal-grid">
        <div className="dk-bal-copy">
          <p className="dk-eyebrow-line">陰陽 · Balance</p>
          <h2 className="dk-reveal-h" id="balance-title">
            <span className="dk-mask"><span>Fire and gold,</span></span>
            <span className="dk-mask"><span>held in balance.</span></span>
          </h2>
          <p className="dk-bal-text dk-reveal-p">
            In feng shui the arowana carries luck through water — the red for fortune and vigour, the gold for wealth and standing. We pair
            the fish to the keeper, not the other way around.
          </p>
        </div>

        <div className="dk-bal-cards">
          <figure className="dk-bal-card fire">
            <span className="dk-bal-mark" aria-hidden="true">陽</span>
            {/* eslint-disable-next-line @next/next/no-img-element -- static transparent cut-out, sized by CSS */}
            <span className="dk-bal-fish"><img src="/img/arowana-red.png" alt="Red arowana" loading="lazy" decoding="async" draggable={false} /></span>
            <figcaption className="dk-bal-label">陽 · Fire</figcaption>
          </figure>
          <figure className="dk-bal-card gold">
            <span className="dk-bal-mark" aria-hidden="true">陰</span>
            {/* eslint-disable-next-line @next/next/no-img-element -- static transparent cut-out, sized by CSS */}
            <span className="dk-bal-fish"><img src="/img/aquarium/arowana-gold.webp" alt="Gold arowana" loading="lazy" decoding="async" draggable={false} /></span>
            <figcaption className="dk-bal-label">陰 · Gold</figcaption>
          </figure>
          <svg className="dk-bal-badge" viewBox="-50 -50 100 100" aria-hidden="true" focusable="false">
            <circle r="49" fill="#fff" stroke="#000" strokeWidth="2" />
            <path d="M0,-49 A49,49 0 0,1 0,49 A24.5,24.5 0 0,1 0,0 A24.5,24.5 0 0,0 0,-49 Z" fill="#000" />
            <circle cy="-24.5" r="7" fill="#000" />
            <circle cy="24.5" r="7" fill="#e10600" />
          </svg>
        </div>
      </div>
    </section>
  );
}
