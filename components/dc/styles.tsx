/**
 * Verbatim CSS from the imported Claude Design files' <helmet> blocks
 * (site-header / site-footer / dragons-cave-home / dragons-cave-cave).
 * Injected once by the (site) layout; scoped under `.dc-scope`.
 */
export const DC_CSS = `
.dc-scope a { color: inherit; text-decoration: none; }
.dc-scope a:hover { color: oklch(0.52 0.216 27); }

.dc-navlink:hover { color: oklch(0.19 0.012 32) !important; }
.dc-enquire:hover { background: oklch(0.44 0.20 28) !important; }

.dc-btn-primary:hover { background: oklch(0.44 0.20 28) !important; }
.dc-btn-ghost:hover { border-color: oklch(0.19 0.012 32) !important; color: oklch(0.19 0.012 32) !important; }

.dc-species { transition: transform .35s cubic-bezier(.2,.8,.2,1); }
.dc-species:hover { transform: translateY(-6px); }
.dc-species-img { transition: transform .5s cubic-bezier(.2,.8,.2,1); }
.dc-species:hover .dc-species-img { transform: translate(-50%,-50%) scale(1.06) rotate(-1deg) !important; }

.dc-chip { font-family:'Geist Mono', monospace; font-size:11px; letter-spacing:0.12em; text-transform:uppercase; padding:9px 15px; border-radius:999px; border:1px solid oklch(0.82 0.02 50); background:oklch(0.985 0.006 80); color:oklch(0.42 0.012 34); cursor:pointer; transition:.18s; white-space:nowrap; }
.dc-chip:hover { border-color:oklch(0.52 0.216 27); color:oklch(0.52 0.216 27); }
.dc-chip[aria-pressed="true"] { background:oklch(0.50 0.216 27); border-color:oklch(0.50 0.216 27); color:oklch(0.98 0.012 82); }

.dc-card-media { display:block; overflow:hidden; border-radius:8px; }
.dc-card-media .dc-sil, .dc-card-media img { transition:transform .5s cubic-bezier(.2,.8,.2,1); }
.dc-card:hover .dc-card-media .dc-sil, .dc-card:hover .dc-card-media img { transform:translate(-50%,-50%) scale(1.05) !important; }
.dc-reserve:hover { color:oklch(0.44 0.20 28) !important; }
.dc-enq:hover { color:oklch(0.44 0.20 28) !important; }

.dc-thumb { cursor:pointer; transition:.2s; }
.dc-thumb:hover { border-color:oklch(0.52 0.216 27) !important; }
.dc-more-img { transition:transform .5s cubic-bezier(.2,.8,.2,1); }
.dc-more:hover .dc-more-img { transform:translate(-50%,-50%) scale(1.05) !important; }

.dc-input { width:100%; box-sizing:border-box; font-family:'Geist', system-ui, sans-serif; font-size:14px; color:oklch(0.20 0.012 32); background:oklch(0.994 0.004 80); border:1px solid oklch(0.82 0.02 50); border-radius:8px; padding:12px 14px; transition:.15s; }
.dc-input:focus { outline:none; border-color:oklch(0.52 0.216 27); box-shadow:0 0 0 3px oklch(0.52 0.216 27 / 0.12); }
.dc-input::placeholder { color:oklch(0.62 0.02 40); }
.dc-lbl { display:block; font-family:'Geist Mono', monospace; font-size:9.5px; letter-spacing:0.16em; text-transform:uppercase; color:oklch(0.50 0.02 40); margin-bottom:7px; }

.dc-foot-link:hover { color: oklch(0.52 0.216 27) !important; }
.dc-fab:hover { transform: scale(1.06); box-shadow: 0 18px 40px -12px oklch(0.52 0.216 27 / 0.75) !important; }

@keyframes dcFabPulse { 0%,100% { box-shadow: 0 12px 30px -10px oklch(0.52 0.216 27 / 0.6), 0 0 0 0 oklch(0.52 0.216 27 / 0.4);} 50% { box-shadow: 0 12px 30px -10px oklch(0.52 0.216 27 / 0.6), 0 0 0 14px oklch(0.52 0.216 27 / 0);} }
@keyframes dcSwim { 0%,100%{ transform:translateY(0) rotate(0deg);} 50%{ transform:translateY(-14px) rotate(-1.2deg);} }
@keyframes dcDrift { 0%,100%{ transform:translateY(0);} 50%{ transform:translateY(-9px);} }
@keyframes dcSheen { 0%{ opacity:0.25;} 50%{ opacity:0.6;} 100%{ opacity:0.25;} }
`;

export const WA_ENQUIRE =
  'https://wa.me/639172345678?text=Hi%20Dragon%27s%20Cave%20%E2%80%94%20I%27d%20like%20to%20enquire%20about%20your%20arowana.';

export function WaIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v7A2.5 2.5 0 0 1 17.5 15H9l-4 3.5V15H6.5A2.5 2.5 0 0 1 4 12.5v-7Z" fill="oklch(0.98 0.012 82)" />
      <circle cx="9" cy="9" r="1.2" fill="oklch(0.52 0.216 27)" />
      <circle cx="12.5" cy="9" r="1.2" fill="oklch(0.52 0.216 27)" />
      <circle cx="16" cy="9" r="1.2" fill="oklch(0.52 0.216 27)" />
    </svg>
  );
}
