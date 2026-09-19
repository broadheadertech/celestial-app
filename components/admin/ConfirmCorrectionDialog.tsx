'use client';

import React, { useState } from 'react';
import { Lock, X } from 'lucide-react';
import { errorMessage } from '@/lib/errorMessage';

export type CorrectionResult = { ok: true } | { ok: false; error: string };

/**
 * Modal for sensitive corrections (void a sale, correct a sale, correct/void a delivery): shows the
 * extra fields passed as children, then asks for a reason and the staff member's own password.
 * `onConfirm` returns the mutation's { ok, error } result; wrong passwords are shown inline.
 */
export default function ConfirmCorrectionDialog({
  title,
  description,
  confirmLabel,
  danger = false,
  disabled = false,
  wide = false,
  onClose,
  onConfirm,
  children,
}: {
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  danger?: boolean;
  disabled?: boolean;
  wide?: boolean;
  onClose: () => void;
  onConfirm: (reason: string, password: string) => Promise<CorrectionResult | { ok: boolean; error?: string }>;
  children?: React.ReactNode;
}) {
  const [reason, setReason] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canSubmit = !disabled && !busy && reason.trim().length >= 3 && password.length > 0;

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      const result = await onConfirm(reason.trim(), password);
      if (!result.ok) {
        setError(result.error ?? 'Could not complete this correction.');
        setPassword('');
        setBusy(false);
      }
    } catch (e) {
      setError(errorMessage(e, 'Could not complete this correction.'));
      setBusy(false);
    }
  };

  const inputCls = 'w-full px-3 py-2.5 rounded-lg border text-sm focus:outline-none focus:border-[var(--red)]';
  const inputStyle: React.CSSProperties = { background: 'var(--bg-2)', borderColor: 'var(--line)', color: 'var(--ink)' };

  return (
    <div className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !busy && onClose()} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative w-full ${wide ? 'sm:max-w-2xl' : 'sm:max-w-md'} max-h-[92vh] overflow-y-auto border-t sm:border rounded-t-3xl sm:rounded-2xl p-4 sm:p-6 safe-area-bottom`}
        style={{ background: 'var(--surface)', borderColor: 'var(--line)', color: 'var(--ink)' }}
      >
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-base sm:text-lg font-bold">{title}</h2>
          <button onClick={onClose} disabled={busy} className="p-1.5 rounded-md hover:opacity-80" style={{ color: 'var(--ink-3)' }} aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="text-sm mb-4" style={{ color: 'var(--ink-3)' }}>{description}</div>

        {children && <div className="mb-4">{children}</div>}

        <div className="space-y-3 p-3 rounded-xl border" style={{ background: 'var(--bg-2)', borderColor: 'var(--line-soft)' }}>
          <label className="block">
            <span className="block text-[11px] font-medium mb-1.5" style={{ color: 'var(--ink-3)' }}>Reason *</span>
            <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} placeholder="e.g. Wrong quantity keyed in" className={inputCls} style={inputStyle} />
          </label>
          <label className="block">
            <span className="flex items-center gap-1.5 text-[11px] font-medium mb-1.5" style={{ color: 'var(--ink-3)' }}>
              <Lock className="w-3 h-3" /> Your password *
            </span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              className={inputCls}
              style={inputStyle}
            />
          </label>
          <p className="text-[11px]" style={{ color: 'var(--ink-4)' }}>Saved in the audit log with your name and the reason.</p>
        </div>

        {error && (
          <p role="alert" className="text-sm mt-3" style={{ color: 'var(--red-hi)' }}>
            {error}
          </p>
        )}

        <div className="flex gap-2 pt-4 mt-4 border-t" style={{ borderColor: 'var(--line)' }}>
          <button onClick={onClose} disabled={busy} className="flex-1 px-4 py-2.5 rounded-lg border text-sm font-semibold" style={{ borderColor: 'var(--line)', color: 'var(--ink-2)' }}>
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!canSubmit}
            className="flex-1 px-4 py-2.5 rounded-lg border text-sm font-bold disabled:opacity-40"
            style={danger ? { background: 'var(--red)', borderColor: 'var(--red-deep)', color: 'oklch(0.99 0 0)' } : { background: 'var(--ink)', borderColor: 'var(--ink)', color: 'var(--bg)' }}
          >
            {busy ? 'Saving…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
