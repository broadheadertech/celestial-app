/**
 * Verbatim CSS from the imported Claude Design files' <helmet> blocks
 * (site-header / site-footer / dragons-cave-home / dragons-cave-cave).
 * Injected once by the (site) layout; scoped under `.dc-scope`.
 */
export const DC_CSS = `
.dc-scope a { color: inherit; text-decoration: none; }
/* Visible keyboard focus everywhere on the storefront (mouse clicks don't trigger it). */
.dc-scope a:focus-visible, .dc-scope button:focus-visible, .dc-scope select:focus-visible, .dc-scope summary:focus-visible, .dc-scope [tabindex]:focus-visible { outline: 2px solid oklch(0.52 0.216 27); outline-offset: 3px; border-radius: 6px; }
.dc-scope .dc-input:focus-visible { outline: none; }
.dc-scope a:hover { color: oklch(0.52 0.216 27); }

.dc-navlink:hover { color: oklch(0.19 0.012 32) !important; }
.dc-enquire:hover { background: oklch(0.44 0.20 28) !important; }
.dc-menu-item:hover { background: oklch(0.52 0.216 27 / 0.08) !important; }

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
.dc-share-item:hover, .dc-share-item:focus-visible { background: oklch(0.95 0.012 74) !important; }
.dc-search:focus { border-color: oklch(0.52 0.216 27) !important; box-shadow: 0 0 0 3px oklch(0.52 0.216 27 / 0.12); }
.dc-more-img { transition:transform .5s cubic-bezier(.2,.8,.2,1); }
.dc-more:hover .dc-more-img { transform:translate(-50%,-50%) scale(1.05) !important; }

.dc-input { width:100%; box-sizing:border-box; font-family:'Geist', system-ui, sans-serif; font-size:14px; color:oklch(0.20 0.012 32); background:oklch(0.994 0.004 80); border:1px solid oklch(0.82 0.02 50); border-radius:8px; padding:12px 14px; transition:.15s; }
.dc-input:focus { outline:none; border-color:oklch(0.52 0.216 27); box-shadow:0 0 0 3px oklch(0.52 0.216 27 / 0.12); }
.dc-input::placeholder { color:oklch(0.62 0.02 40); }
.dc-lbl { display:block; font-family:'Geist Mono', monospace; font-size:9.5px; letter-spacing:0.16em; text-transform:uppercase; color:oklch(0.50 0.02 40); margin-bottom:7px; }

.dc-foot-link:hover { color: oklch(0.52 0.216 27) !important; }
.dc-fab:hover { transform: scale(1.06); box-shadow: 0 18px 40px -12px oklch(0.52 0.216 27 / 0.75) !important; }

.dc-menu-btn { display: none; }
.dc-mobile-nav a { display: block; padding: 14px 4px; border-bottom: 1px solid oklch(0.88 0.012 68); font-size: 16px; font-weight: 500; }
.dc-mobile-signout { display: flex; align-items: center; gap: 8px; width: 100%; padding: 14px 4px; border: none; background: transparent; font: inherit; font-size: 16px; font-weight: 500; color: oklch(0.48 0.20 28); cursor: pointer; text-align: left; }

/* ── Responsive: inline grid templates are overridden by these utility classes ── */
@media (max-width: 960px) {
  .dc-split { grid-template-columns: 1fr !important; gap: 40px !important; }
  .dc-cols-4 { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
  .dc-cols-3 { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
  .dc-nav, .dc-hide-md { display: none !important; }
  .dc-menu-btn { display: inline-flex !important; }
  .dc-push { margin-left: auto !important; }
  .dc-sticky-md { position: static !important; }
  .dc-minh-auto { min-height: 0 !important; }
}
@media (max-width: 600px) {
  .dc-cols-4, .dc-cols-3, .dc-cols-2 { grid-template-columns: minmax(0, 1fr) !important; }
  .dc-hide-sm { display: none !important; }
  .dc-header-row { gap: 10px !important; padding: 10px 16px !important; }
  .dc-enquire-label { display: none; }
  .dc-fab { right: 16px !important; bottom: 16px !important; width: 52px !important; height: 52px !important; }
}

@keyframes dcFabPulse { 0%,100% { box-shadow: 0 12px 30px -10px oklch(0.52 0.216 27 / 0.6), 0 0 0 0 oklch(0.52 0.216 27 / 0.4);} 50% { box-shadow: 0 12px 30px -10px oklch(0.52 0.216 27 / 0.6), 0 0 0 14px oklch(0.52 0.216 27 / 0);} }
@keyframes dcSwim { 0%,100%{ transform:translateY(0) rotate(0deg);} 50%{ transform:translateY(-14px) rotate(-1.2deg);} }
@keyframes dcDrift { 0%,100%{ transform:translateY(0);} 50%{ transform:translateY(-9px);} }
@keyframes dcSheen { 0%{ opacity:0.25;} 50%{ opacity:0.6;} 100%{ opacity:0.25;} }
`;

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
