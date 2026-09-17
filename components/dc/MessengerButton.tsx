'use client';

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';

export function MessengerIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M12 2C6.36 2 2 6.13 2 11.7c0 2.91 1.19 5.44 3.14 7.17.16.14.26.35.27.57l.05 1.78c.02.57.6.94 1.12.71l1.98-.87c.17-.08.36-.09.53-.04.91.25 1.87.38 2.91.38 5.64 0 10-4.13 10-9.7S17.64 2 12 2Zm6 7.46-2.94 4.66a1.5 1.5 0 0 1-2.17.4l-2.34-1.75a.6.6 0 0 0-.72 0l-3.16 2.4c-.42.32-.97-.18-.69-.63l2.94-4.66a1.5 1.5 0 0 1 2.17-.4l2.34 1.75a.6.6 0 0 0 .72 0l3.16-2.4c.42-.32.97.18.69.63Z"
      />
    </svg>
  );
}

/**
 * Opens a Messenger chat with the store's Facebook page. Messenger links can't prefill a
 * message, so when `message` is given it is copied first and a short note says to paste it.
 */
export default function MessengerButton({
  href,
  message,
  className,
  style,
  children,
}: {
  href: string;
  message?: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 6000);
    return () => clearTimeout(timer);
  }, [copied]);

  const copyMessage = () => {
    if (!message || !navigator.clipboard) return;
    navigator.clipboard.writeText(message).then(() => setCopied(true), () => {});
  };

  return (
    <>
      <a href={href} target="_blank" rel="noopener" onClick={copyMessage} className={className} style={style}>
        {children}
      </a>
      {copied && (
        <div
          role="status"
          style={{
            position: 'fixed',
            left: '50%',
            bottom: 96,
            transform: 'translateX(-50%)',
            zIndex: 90,
            maxWidth: 'calc(100vw - 32px)',
            background: 'oklch(0.22 0.012 32)',
            color: 'oklch(0.98 0.012 82)',
            fontSize: 13.5,
            lineHeight: 1.4,
            padding: '12px 18px',
            borderRadius: 12,
            boxShadow: '0 16px 40px -16px oklch(0 0 0 / 0.5)',
            textAlign: 'center',
          }}
        >
          Message copied — paste it in the Messenger chat.
        </div>
      )}
    </>
  );
}
