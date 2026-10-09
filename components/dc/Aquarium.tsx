'use client';
/* eslint-disable @next/next/no-img-element -- decorative sprites; sized in px by the animation loop */

/**
 * "Living aquarium" background for the Home hero card: six arowana steering freely at three depths,
 * plus bubbles rising from the tank floor. Purely decorative (aria-hidden, pointer-events: none) and
 * sits under every piece of hero content (nav, copy, notch). The card's overflow:hidden + radius clip it.
 *
 * Fish assets live in /public/img/aquarium/ — see AQUARIUM_CONFIG.assets. Swap in your own transparent,
 * right-facing side-view PNG/WebP (≈480px wide) with the same names, or point the paths elsewhere.
 */

import { useEffect, useRef, useState } from 'react';

// ─── Tune everything here ─────────────────────────────────────────────────────
export const AQUARIUM_CONFIG = {
  /** Transparent, right-facing arowana sprites. */
  assets: {
    red: '/img/aquarium/arowana-red.webp',
    gold: '/img/aquarium/arowana-gold.webp',
    albino: '/img/aquarium/arowana-albino.webp',
  },
  /** Applied to every sprite on top of its blur — muted colour so the fish recede into the red. */
  spriteFilter: 'saturate(0.7)',
  /** Display width (px) of a scale-1 fish on desktop. */
  baseWidth: 220,
  /** Keep fish this far (px) from the card edges. */
  margin: 40,
  /** Depth layers, back to front. Bubbles render between `far`/`mid` and `near`. */
  fish: [
    // Background ambience, not a feature: every fish is soft, faint and slow so the headline and the
    // featured specimen keep the spotlight. Depth still reads (far = smaller, fainter, blurrier).
    { variant: 'gold', depth: 'far', scale: 0.34, speed: 16, opacity: 0.18, blur: 5 },
    { variant: 'albino', depth: 'far', scale: 0.38, speed: 18, opacity: 0.16, blur: 5 },
    { variant: 'red', depth: 'mid', scale: 0.46, speed: 22, opacity: 0.24, blur: 4 },
    { variant: 'gold', depth: 'mid', scale: 0.5, speed: 24, opacity: 0.22, blur: 4 },
    { variant: 'red', depth: 'near', scale: 0.6, speed: 28, opacity: 0.3, blur: 3 },
    { variant: 'albino', depth: 'near', scale: 0.56, speed: 26, opacity: 0.26, blur: 3 },
  ],
  motion: {
    /** ± fraction of a fish's speed, re-rolled at every new target so fish don't move in sync. */
    speedJitter: 0.12,
    /** Pick a new target after this long even if not arrived (ms). */
    retargetMs: [3000, 7000] as [number, number],
    /** Distance (px) that counts as "arrived". */
    arriveRadius: 36,
    /** Start slowing down inside this distance (px). */
    slowRadius: 140,
    /** How quickly velocity eases toward the desired heading (1/s). Lower = lazier turns. */
    steer: 0.8,
    /** Arowana cruise horizontally: limit how far a new target may sit above/below the fish (fraction of height). */
    maxTargetRise: 0.35,
    /** Vertical sine bob. */
    bobPx: 4,
    bobPeriodMs: [5000, 8000] as [number, number],
    /** Max body tilt toward vertical velocity (deg). */
    maxTiltDeg: 8,
    /** Time for a full left↔right turn (ms) — the sprite eases through scaleX instead of snapping. */
    turnMs: 900,
    /** Clamp frame delta so tab switches don't teleport fish (ms). */
    maxDtMs: 50,
  },
  bubbles: {
    /** Spawn every N ms (random within range) at full density. */
    intervalMs: [450, 900] as [number, number],
    /** Floor columns as fractions of the card width, with ± jitter in px. */
    columns: [0.12, 0.48, 0.86],
    jitterPx: 14,
    sizePx: [4, 12] as [number, number],
    /** Rise distance: from riseMinPx up to riseMaxFrac × card height. */
    riseMinPx: 260,
    riseMaxFrac: 0.8,
    /** Rise speed (px/s) — bigger bubbles rise a little faster. */
    risePxPerSec: [35, 60] as [number, number],
    /** Horizontal wobble amplitude (px). */
    wobblePx: 6,
    maxCount: 16,
  },
  /** Responsive tiers. */
  responsive: {
    desktopMin: 1024,
    tabletMin: 640,
    tablet: { fishScale: 0.8, bubbleDensity: 0.5 },
    mobile: { fishScale: 0.6, bubbleDensity: 1 / 3, fish: [0, 2, 4] },
    /** At or below this width, fish swim only inside the vertical band of this element (the hero photo strip),
     *  so they never drift over the product card, the seal or the headline. */
    bandMaxWidth: 700,
    bandSelector: '.dk-hero-fish',
  },
  /** Fade-in once the sprites have loaded (ms). */
  fadeInMs: 600,
  /** Reduced motion: calm static tank — fish positions as fractions of the swim box. */
  staticLayout: [
    { x: 0.62, y: 0.12, facing: -1 },
    { x: 0.1, y: 0.3, facing: 1 },
    { x: 0.42, y: 0.18, facing: 1 },
    { x: 0.78, y: 0.5, facing: -1 },
    { x: 0.55, y: 0.66, facing: -1 },
    { x: 0.2, y: 0.08, facing: 1 },
  ],
} as const;
// ──────────────────────────────────────────────────────────────────────────────

type Cfg = typeof AQUARIUM_CONFIG;
type Variant = keyof Cfg['assets'];
const DEPTH_Z = { far: 1, mid: 2, near: 4 } as const; // bubbles sit at z 3

type FishState = {
  x: number; y: number; vx: number; vy: number;
  tx: number; ty: number; retargetAt: number;
  maxSpeed: number; facing: number;
  bobPhase: number; bobPeriod: number;
  w: number; h: number; active: boolean;
};

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

function tierOf(width: number) {
  const r = AQUARIUM_CONFIG.responsive;
  if (width >= r.desktopMin) return { fishScale: 1, bubbleDensity: 1, only: null as readonly number[] | null };
  if (width >= r.tabletMin) return { fishScale: r.tablet.fishScale, bubbleDensity: r.tablet.bubbleDensity, only: null };
  return { fishScale: r.mobile.fishScale, bubbleDensity: r.mobile.bubbleDensity, only: r.mobile.fish };
}

export default function Aquarium() {
  const rootRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const fishRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [mounted, setMounted] = useState(false); // sprites get their src only after hydration (lazy)
  const [ready, setReady] = useState(false); // all sprites decoded → fade in + start

  useEffect(() => setMounted(true), []);

  // Wait for every sprite to decode before showing/animating the tank.
  useEffect(() => {
    if (!mounted) return;
    let cancelled = false;
    const urls = Object.values(AQUARIUM_CONFIG.assets);
    Promise.all(
      urls.map((src) => {
        const img = new Image();
        img.src = src;
        return img.decode().catch(() => undefined);
      }),
    ).then(() => !cancelled && setReady(true));
    return () => {
      cancelled = true;
    };
  }, [mounted]);

  useEffect(() => {
    if (!ready) return;
    const root = rootRef.current;
    const bubbleLayer = bubbleRef.current;
    if (!root || !bubbleLayer) return;
    const cfg = AQUARIUM_CONFIG;
    const m = cfg.motion;
    const reduceMq = window.matchMedia('(prefers-reduced-motion: reduce)');

    let W = 0;
    let H = 0;
    let band: { top: number; bottom: number } | null = null;
    let tier = tierOf(window.innerWidth);
    const fish: FishState[] = cfg.fish.map((f) => ({
      x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, retargetAt: 0,
      maxSpeed: f.speed, facing: 1, bobPhase: rand(0, Math.PI * 2), bobPeriod: rand(...m.bobPeriodMs),
      w: 0, h: 0, active: true,
    }));

    const bounds = (s: FishState) => ({
      minX: cfg.margin,
      maxX: Math.max(cfg.margin, W - cfg.margin - s.w),
      minY: band ? band.top : cfg.margin,
      maxY: band ? Math.max(band.top, band.bottom - s.h) : Math.max(cfg.margin, H - cfg.margin - s.h),
    });

    /** The swim band on phones: the bandSelector element's top/bottom, relative to the tank. */
    const measureBand = () => {
      const r = cfg.responsive;
      if (window.innerWidth > r.bandMaxWidth) return null;
      const el = root.parentElement?.querySelector<HTMLElement>(r.bandSelector);
      if (!el) return null;
      const a = el.getBoundingClientRect();
      const b = root.getBoundingClientRect();
      return { top: a.top - b.top, bottom: a.bottom - b.top };
    };

    const pickTarget = (s: FishState, i: number, now: number) => {
      const b = bounds(s);
      // Prefer a target well across the tank so fish cruise rather than dither.
      let tx = rand(b.minX, b.maxX);
      if (Math.abs(tx - s.x) < (b.maxX - b.minX) * 0.3) tx = s.x < (b.minX + b.maxX) / 2 ? rand((b.minX + b.maxX) / 2, b.maxX) : rand(b.minX, (b.minX + b.maxX) / 2);
      const rise = (b.maxY - b.minY) * m.maxTargetRise;
      s.tx = tx;
      s.ty = clamp(s.y + rand(-rise, rise), b.minY, b.maxY);
      s.retargetAt = now + rand(...m.retargetMs);
      const base = cfg.fish[i].speed;
      s.maxSpeed = base * (1 + rand(-m.speedJitter, m.speedJitter));
    };

    /** Sizes from the current tier; keeps fish inside the (possibly resized) box. */
    const measure = () => {
      W = root.clientWidth;
      H = root.clientHeight;
      tier = tierOf(window.innerWidth);
      band = measureBand();
      cfg.fish.forEach((f, i) => {
        const s = fish[i];
        const el = fishRefs.current[i];
        s.active = !tier.only || tier.only.includes(i);
        s.w = cfg.baseWidth * f.scale * tier.fishScale;
        s.h = s.w * (212 / 480); // sprite aspect
        if (el) {
          el.style.display = s.active ? '' : 'none';
          el.style.width = `${s.w}px`;
        }
        const b = bounds(s);
        s.x = clamp(s.x, b.minX, b.maxX);
        s.y = clamp(s.y, b.minY, b.maxY);
        s.tx = clamp(s.tx, b.minX, b.maxX);
        s.ty = clamp(s.ty, b.minY, b.maxY);
      });
    };

    const paint = (i: number, now: number) => {
      const s = fish[i];
      const el = fishRefs.current[i];
      if (!el || !s.active) return;
      const bob = Math.sin((now / s.bobPeriod) * Math.PI * 2 + s.bobPhase) * m.bobPx;
      const speed = Math.hypot(s.vx, s.vy) || 1;
      const tilt = clamp((s.vy / speed) * m.maxTiltDeg * 1.6, -m.maxTiltDeg, m.maxTiltDeg) * Math.sign(s.facing || 1);
      // facing eases through 0 during a turn; keep a sliver of width so the turn reads as a rotation.
      const sx = Math.abs(s.facing) < 0.08 ? 0.08 * Math.sign(s.facing || 1) : s.facing;
      el.style.transform = `translate3d(${s.x.toFixed(1)}px, ${(s.y + bob).toFixed(1)}px, 0) rotate(${tilt.toFixed(2)}deg) scaleX(${sx.toFixed(3)})`;
    };

    // ── Static tank for reduced motion ──
    const layoutStatic = () => {
      measure();
      cfg.fish.forEach((_, i) => {
        const s = fish[i];
        const b = bounds(s);
        const p = cfg.staticLayout[i];
        s.x = b.minX + (b.maxX - b.minX) * p.x;
        s.y = b.minY + (b.maxY - b.minY) * p.y;
        s.vx = p.facing;
        s.vy = 0;
        s.facing = p.facing;
        paint(i, 0);
      });
    };

    // ── Live tank ──
    let raf = 0;
    let last = 0;
    let running = false;
    let onScreen = true;
    let nextBubbleAt = 0;
    let bubbleCount = 0;

    const spawnBubble = () => {
      const b = cfg.bubbles;
      if (bubbleCount >= b.maxCount || W === 0) return;
      const size = rand(...b.sizePx);
      const col = b.columns[Math.floor(Math.random() * b.columns.length)];
      const x = col * W + rand(-b.jitterPx, b.jitterPx) - size / 2;
      const rise = rand(b.riseMinPx, Math.max(b.riseMinPx, H * b.riseMaxFrac));
      const dur = (rise / (rand(...b.risePxPerSec) * (0.85 + (size / b.sizePx[1]) * 0.3))) * 1000;
      const outer = document.createElement('span');
      outer.className = 'dk-aq-bubble';
      outer.style.cssText = `left:${x.toFixed(1)}px;width:${size.toFixed(1)}px;height:${size.toFixed(1)}px;--rise:${(-rise).toFixed(0)}px;--dur:${dur.toFixed(0)}ms`;
      const inner = document.createElement('i');
      inner.style.cssText = `--wob:${(rand(0.5, 1) * b.wobblePx * (Math.random() < 0.5 ? -1 : 1)).toFixed(1)}px;--wdur:${rand(900, 1600).toFixed(0)}ms`;
      outer.appendChild(inner);
      outer.addEventListener('animationend', (e) => {
        if (e.target !== outer) return;
        outer.remove();
        bubbleCount--;
      });
      bubbleLayer.appendChild(outer);
      bubbleCount++;
    };

    const step = (now: number) => {
      raf = requestAnimationFrame(step);
      const dt = Math.min(now - last, m.maxDtMs) / 1000;
      last = now;
      if (dt <= 0) return;

      cfg.fish.forEach((_, i) => {
        const s = fish[i];
        if (!s.active) return;
        const dx = s.tx - s.x;
        const dy = s.ty - s.y;
        const dist = Math.hypot(dx, dy);
        if (dist < m.arriveRadius || now > s.retargetAt) pickTarget(s, i, now);
        // Desired velocity toward the target, easing off near it (never below a gentle cruise).
        const want = s.maxSpeed * clamp(dist / m.slowRadius, 0.45, 1);
        const dvx = (dx / (dist || 1)) * want - s.vx;
        const dvy = (dy / (dist || 1)) * want - s.vy;
        const k = 1 - Math.exp(-m.steer * dt); // frame-rate independent easing
        s.vx += dvx * k;
        s.vy += dvy * k;
        const sp = Math.hypot(s.vx, s.vy);
        if (sp > s.maxSpeed) {
          s.vx = (s.vx / sp) * s.maxSpeed;
          s.vy = (s.vy / sp) * s.maxSpeed;
        }
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        const b = bounds(s);
        s.x = clamp(s.x, b.minX, b.maxX);
        s.y = clamp(s.y, b.minY, b.maxY);
        // Smooth turn: ease facing toward the heading instead of flipping.
        if (Math.abs(s.vx) > 4) {
          const goal = Math.sign(s.vx);
          const stepF = (2 / m.turnMs) * dt * 1000;
          s.facing = goal > s.facing ? Math.min(goal, s.facing + stepF) : Math.max(goal, s.facing - stepF);
        }
        paint(i, now);
      });

      if (now >= nextBubbleAt) {
        spawnBubble();
        const [a, b] = cfg.bubbles.intervalMs;
        nextBubbleAt = now + rand(a, b) / tier.bubbleDensity;
      }
    };

    const shouldRun = () => onScreen && document.visibilityState === 'visible' && !reduceMq.matches;
    const sync = () => {
      const go = shouldRun();
      if (go && !running) {
        running = true;
        last = performance.now();
        nextBubbleAt = last;
        raf = requestAnimationFrame(step);
        root.classList.remove('paused');
      } else if (!go && running) {
        running = false;
        cancelAnimationFrame(raf);
        root.classList.add('paused'); // freezes in-flight bubbles too
      }
    };

    const startLive = () => {
      measure();
      const now = performance.now();
      fish.forEach((s, i) => {
        const b = bounds(s);
        s.x = rand(b.minX, b.maxX);
        s.y = rand(b.minY, b.maxY);
        const dir = Math.random() < 0.5 ? -1 : 1;
        s.vx = dir * cfg.fish[i].speed * 0.7;
        s.vy = 0;
        s.facing = dir;
        pickTarget(s, i, now);
        paint(i, now);
      });
      sync();
    };

    const applyMotionPref = () => {
      if (reduceMq.matches) {
        running = false;
        cancelAnimationFrame(raf);
        bubbleLayer.replaceChildren();
        bubbleCount = 0;
        root.classList.add('static');
        layoutStatic();
      } else {
        root.classList.remove('static');
        startLive();
      }
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        onScreen = entry.isIntersecting;
        sync();
      },
      { threshold: 0 },
    );
    io.observe(root);

    let resizeTimer = 0;
    const ro = new ResizeObserver(() => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        if (reduceMq.matches) layoutStatic();
        else {
          measure();
          fish.forEach((s, i) => paint(i, performance.now()));
        }
      }, 150);
    });
    ro.observe(root);

    document.addEventListener('visibilitychange', sync);
    reduceMq.addEventListener('change', applyMotionPref);
    applyMotionPref();

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      window.clearTimeout(resizeTimer);
      document.removeEventListener('visibilitychange', sync);
      reduceMq.removeEventListener('change', applyMotionPref);
      bubbleLayer.replaceChildren();
    };
  }, [ready]);

  const sprite = (v: Variant) => (mounted ? AQUARIUM_CONFIG.assets[v] : undefined);

  return (
    <div ref={rootRef} className={`dk-aq${ready ? ' ready' : ''}`} aria-hidden="true">
      <div className="dk-aq-haze" />
      {AQUARIUM_CONFIG.fish.map((f, i) => (
        <div
          key={i}
          ref={(el) => {
            fishRefs.current[i] = el;
          }}
          className="dk-aq-fish"
          style={{ zIndex: DEPTH_Z[f.depth], opacity: f.opacity }}
        >
          {sprite(f.variant) && (
            <img src={sprite(f.variant)} alt="" decoding="async" draggable={false} style={{ filter: `${f.blur ? `blur(${f.blur}px) ` : ''}${AQUARIUM_CONFIG.spriteFilter}` }} />
          )}
        </div>
      ))}
      <div ref={bubbleRef} className="dk-aq-bubbles" />
      <div className="dk-aq-scrim" />
    </div>
  );
}
