'use client';

/**
 * GSAP helpers for the Home editorial sections (Balance, Promise).
 * - ScrollTrigger is registered once, on the client only.
 * - Everything starts visible in CSS; hidden start states come from gsap.from(), so if GSAP never runs the
 *   content is still there.
 * - useSectionMotion() runs inside a gsap.context scoped to the section and reverts it on unmount (route change).
 * - prefers-reduced-motion: reduce → no animations at all.
 */

import { useEffect, type RefObject } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

let registered = false;
function ensureRegistered() {
  if (registered || typeof window === 'undefined') return;
  gsap.registerPlugin(ScrollTrigger);
  registered = true;
}

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Headline lines (each `.dk-mask > span`) rise out of their masks. */
export function revealHeading(scope: Element, selector = '.dk-mask > span') {
  const lines = scope.querySelectorAll(selector);
  if (!lines.length) return;
  gsap.from(lines, {
    yPercent: 115, duration: 1.2, ease: 'expo.out', stagger: 0.09,
    scrollTrigger: { trigger: lines[0].closest('h2') ?? lines[0], start: 'top 86%' },
  });
}

/** Paragraphs fade up. */
export function revealParagraphs(scope: Element, selector = '.dk-reveal-p') {
  scope.querySelectorAll(selector).forEach((el) => {
    gsap.from(el, { y: 26, opacity: 0, duration: 1.1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%' } });
  });
}

/** Runs `setup` in a gsap.context bound to `ref` (unless reduced motion) and reverts it on unmount. */
export function useSectionMotion(ref: RefObject<HTMLElement | null>, setup: (root: HTMLElement) => void | (() => void)) {
  useEffect(() => {
    const root = ref.current;
    if (!root || prefersReducedMotion()) return;
    ensureRegistered();
    let cleanup: void | (() => void);
    const ctx = gsap.context(() => {
      cleanup = setup(root);
    }, root);
    return () => {
      cleanup?.();
      ctx.revert();
    };
    // setup is defined inline by callers and only needs to run once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref]);
}

export { gsap };
