/**
 * Corner tag on a listing tile for a fish that hasn't arrived yet: a small red pill at the top-left
 * of the photo (VideoBadge sits top-right, so a tile can carry both without overlap).
 * Parent must be position: relative.
 */
export default function PreorderBadge({ label }: { label: string }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: 12,
        top: 12,
        zIndex: 2,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        height: 24,
        padding: '0 10px 0 8px',
        borderRadius: 999,
        background: 'var(--dk-red)',
        color: 'var(--dk-white)',
        fontFamily: 'var(--dk-f-body)',
        fontSize: 12,
        fontWeight: 700,
        lineHeight: 1,
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
      }}
    >
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.2" />
      </svg>
      {label}
    </div>
  );
}
