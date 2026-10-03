/** Corner tag on a listing tile for a fish that hasn't arrived yet. */
export default function PreorderBadge({ label }: { label: string }) {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 11,
        left: 12,
        zIndex: 2,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '5px 9px',
        borderRadius: 6,
        background: 'oklch(0.22 0.012 32 / 0.72)',
        backdropFilter: 'blur(6px)',
        border: '1px solid oklch(0.72 0.13 82 / 0.5)',
        fontFamily: "'Geist Mono', monospace",
        fontSize: 9,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: 'oklch(0.88 0.11 84)',
        pointerEvents: 'none',
      }}
    >
      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.2" />
      </svg>
      {label}
    </div>
  );
}
