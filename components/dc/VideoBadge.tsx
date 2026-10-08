/**
 * Small black "▶ Video" pill for product tiles that have showcase videos (top-right of the photo; PreorderBadge takes top-left).
 * Parent must be position: relative. Colours are the Dragon's Cave tokens (works inside or outside `.dk`).
 */
export default function VideoBadge({ count = 1 }: { count?: number }) {
  return (
    <span
      aria-label={count > 1 ? `${count} videos` : 'Has video'}
      style={{
        position: 'absolute',
        right: 12,
        top: 12,
        zIndex: 2,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        height: 24,
        padding: '0 10px 0 8px',
        borderRadius: 999,
        background: 'var(--dk-black)',
        color: 'var(--dk-white)',
        fontFamily: 'var(--dk-f-body)',
        fontSize: 12,
        fontWeight: 700,
        lineHeight: 1,
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
      }}
    >
      <svg width="9" height="9" viewBox="0 0 24 24" aria-hidden="true" style={{ color: 'var(--dk-red-bright)' }}>
        <path d="M8 5v14l11-7z" fill="currentColor" />
      </svg>
      {count > 1 ? `${count} videos` : 'Video'}
    </span>
  );
}
