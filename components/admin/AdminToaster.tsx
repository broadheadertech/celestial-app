'use client';

import { useEffect, useState } from 'react';
import { Check, Info, X, XCircle } from 'lucide-react';

/**
 * Admin toasts. `adminToast(message)` can be called from anywhere (including outside React),
 * which is what replaced the browser `alert()` popups across the admin screens.
 * The toaster itself is mounted once in AdminLayoutWrapper.
 */

export type ToastKind = 'error' | 'success' | 'info';
type Toast = { id: number; message: string; kind: ToastKind };

const listeners = new Set<(t: Toast) => void>();
let nextId = 1;

export function adminToast(message: string, kind: ToastKind = 'error') {
  const text = String(message ?? '').trim();
  if (!text) return;
  const toast = { id: nextId++, message: text.slice(0, 400), kind };
  // Nothing mounted (e.g. the toaster is not mounted) — fall back so the message isn't lost.
  if (listeners.size === 0) {
    console.warn('[admin]', text);
    return;
  }
  listeners.forEach((l) => l(toast));
}

const STYLE: Record<ToastKind, { background: string; icon: typeof Check }> = {
  success: { background: 'var(--jade)', icon: Check },
  error: { background: 'var(--red)', icon: XCircle },
  info: { background: 'var(--ink)', icon: Info },
};

export default function AdminToaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const onToast = (t: Toast) => {
      setToasts((list) => [...list.slice(-2), t]);
      setTimeout(() => setToasts((list) => list.filter((x) => x.id !== t.id)), t.kind === 'error' ? 7000 : 4000);
    };
    listeners.add(onToast);
    return () => {
      listeners.delete(onToast);
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed left-3 right-3 sm:left-auto sm:right-6 top-4 sm:top-6 z-[10050] flex flex-col gap-2 sm:max-w-sm pointer-events-none">
      {toasts.map((t) => {
        const { background, icon: Icon } = STYLE[t.kind];
        return (
          <div
            key={t.id}
            role={t.kind === 'error' ? 'alert' : 'status'}
            className="pointer-events-auto flex items-start gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium"
            style={{ background, color: 'oklch(0.99 0 0)' }}
          >
            <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span className="flex-1 break-words whitespace-pre-line">{t.message}</span>
            <button onClick={() => setToasts((list) => list.filter((x) => x.id !== t.id))} aria-label="Dismiss" className="p-0.5 opacity-80 hover:opacity-100">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
