'use client';

import { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { errorMessage } from '@/lib/errorMessage';
import { useAuthStore } from '@/store/auth';

/**
 * Delete a product only when it has no transactions; otherwise offer to deactivate (phase out),
 * which keeps its sales/stock history for reports and the audit trail (admin.getProductDeleteCheck).
 */
export default function DeleteProductDialog({ productId, name, onClose, onDone }: { productId: Id<'products'>; name: string; onClose: () => void; onDone: (message: string, deleted: boolean) => void }) {
  const check = useQuery(api.services.admin.getProductDeleteCheck, { productId });
  const deleteProduct = useMutation(api.services.admin.deleteProduct);
  const setActive = useMutation(api.services.admin.toggleProductStatus);
  const [busy, setBusy] = useState(false);
  // Permanent deletion is super-admin only; admins phase products out instead.
  const isSuperAdmin = useAuthStore((s) => s.user?.role) === 'super_admin';
  const [error, setError] = useState<string | null>(null);

  const run = async (action: () => Promise<unknown>, message: string, deleted: boolean) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      onDone(message, deleted);
    } catch (e) {
      setError(errorMessage(e, 'Something went wrong. Please try again.'));
      setBusy(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]" onClick={() => !busy && onClose()} />
      <div className="fixed inset-0 flex items-center justify-center z-[9999] p-4 pointer-events-none">
        <div className="bg-secondary border border-white/10 rounded-2xl shadow-2xl p-6 w-full max-w-sm pointer-events-auto">
          {check === undefined ? (
            <p className="text-sm text-white/70">Checking {name}…</p>
          ) : check === null ? (
            <p className="text-sm text-white/70">This product no longer exists.</p>
          ) : check.canDelete && isSuperAdmin ? (
            <>
              <h3 className="text-lg font-bold text-white mb-2">Delete product?</h3>
              <p className="text-sm text-white/70 mb-1"><strong>{name}</strong> has no sales, reservations or stock changes, so it can be deleted permanently.</p>
              <p className="text-xs text-white/50 mb-5">This can&apos;t be undone.</p>
            </>
          ) : (
            <>
              <h3 className="text-lg font-bold text-white mb-2">{check.isActive ? 'Phase out instead?' : 'Already phased out'}</h3>
              <p className="text-sm text-white/70 mb-1">
                <strong>{name}</strong>{' '}
                {check.canDelete
                  ? 'can only be deleted permanently by a super admin.'
                  : `can't be deleted because it has ${check.reasons.join(', ')}.`}
              </p>
              <p className="text-xs text-white/50 mb-5">
                {check.isActive
                  ? 'Deactivating hides it from the shop, POS and restock list but keeps its history for reports and the audit trail. You can reactivate it any time.'
                  : 'It is already inactive. Its history stays in reports and the audit trail.'}
              </p>
            </>
          )}
          {error && <p role="alert" className="text-sm text-error mb-4">{error}</p>}
          <div className="flex gap-3">
            <button onClick={onClose} disabled={busy} className="flex-1 px-4 py-3 bg-secondary border border-white/10 text-white rounded-xl font-medium hover:bg-white/10 active:scale-95 transition-all disabled:opacity-50">
              {check && !check.canDelete && !check.isActive ? 'Close' : 'Cancel'}
            </button>
            {check?.canDelete && isSuperAdmin && (
              <button onClick={() => run(() => deleteProduct({ id: productId }), `Deleted "${name}".`, true)} disabled={busy} className="flex-1 px-4 py-3 bg-error text-white rounded-xl font-medium hover:bg-error/90 active:scale-95 transition-all disabled:opacity-50">
                {busy ? 'Deleting…' : 'Delete'}
              </button>
            )}
            {check && (!check.canDelete || !isSuperAdmin) && check.isActive && (
              <button onClick={() => run(() => setActive({ productId, isActive: false }), `"${name}" deactivated (phased out).`, false)} disabled={busy} className="flex-1 px-4 py-3 bg-warning text-black rounded-xl font-semibold active:scale-95 transition-all disabled:opacity-50">
                {busy ? 'Saving…' : 'Deactivate'}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
