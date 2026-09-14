/** Small "▶ Video" pill for product tiles that have showcase videos. Parent must be position: relative. */
export default function VideoBadge({ count = 1 }: { count?: number }) {
  return (
    <span
      aria-label={count > 1 ? `${count} videos` : 'Has video'}
      style={{
        position: 'absolute',
        left: 10,
        bottom: 10,
        zIndex: 2,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '4px 9px 4px 7px',
        borderRadius: 999,
        background: 'oklch(0.52 0.216 27 / 0.94)',
        color: 'oklch(0.98 0.012 82)',
        fontFamily: "'Geist Mono', monospace",
        fontSize: 9.5,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        boxShadow: '0 6px 16px -6px oklch(0 0 0 / 0.5)',
        pointerEvents: 'none',
      }}
    >
      <svg width="9" height="9" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8 5v14l11-7z" fill="currentColor" />
      </svg>
      {count > 1 ? `${count} videos` : 'Video'}
    </span>
  );
}
