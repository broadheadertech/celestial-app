'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PresentationPage() {
  const router = useRouter();

  useEffect(() => {
    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    document.title = "Dragon's Cave — Presentation";
    return () => {
      document.body.style.overflow = prevBody;
      document.documentElement.style.overflow = prevHtml;
    };
  }, []);

  const handleExit = () => {
    if (window.history.length > 1) router.back();
    else router.push('/');
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100dvh',
        background: '#0a0606',
        zIndex: 9999,
      }}
    >
      <button
        onClick={handleExit}
        aria-label="Exit presentation"
        style={{
          position: 'absolute',
          top: 18,
          left: 18,
          zIndex: 10001,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 10,
          padding: '9px 16px',
          background: 'rgba(10,6,6,0.78)',
          border: '1px solid rgba(201,168,106,0.3)',
          color: '#c9a86a',
          fontFamily: 'Cinzel, serif',
          fontSize: 10,
          letterSpacing: '0.35em',
          fontWeight: 700,
          borderRadius: 999,
          cursor: 'pointer',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          transition: 'all 0.25s ease',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = '#b91021';
          (e.currentTarget as HTMLButtonElement).style.borderColor = '#b91021';
          (e.currentTarget as HTMLButtonElement).style.color = '#fff9f1';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(10,6,6,0.78)';
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(201,168,106,0.3)';
          (e.currentTarget as HTMLButtonElement).style.color = '#c9a86a';
        }}
      >
        <span aria-hidden="true">←</span>
        <span>EXIT</span>
      </button>

      <iframe
        src="/deck/"
        title="Dragon's Cave — Presentation"
        allow="fullscreen"
        style={{
          width: '100%',
          height: '100%',
          border: 0,
          display: 'block',
        }}
      />
    </div>
  );
}
