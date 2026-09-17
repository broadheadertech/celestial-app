'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Doc, Id } from '@/convex/_generated/dataModel';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Camera,
  Edit3,
  Info,
  MapPin,
  MessageSquareQuote,
  Package,
  Plus,
  RefreshCw,
  ShieldCheck,
  Star,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import BottomNavbar from '@/components/common/BottomNavbar';
import SafeAreaProvider from '@/components/provider/SafeAreaProvider';
import ConfirmationModal from '@/components/ui/ConfirmationModal';
import { uploadOptimizedImage } from '@/lib/optimizeImage';

type Testimonial = Doc<'testimonials'>;

const QUOTE_MAX = 1000;

const inputCls =
  'w-full px-3 py-2.5 rounded-lg border text-sm focus:outline-none focus:border-[var(--red)] placeholder:text-[var(--ink-4)] transition-colors';
const inputStyle: React.CSSProperties = {
  background: 'var(--bg-2)',
  borderColor: 'var(--line)',
  color: 'var(--ink)',
};

function TestimonialsContent() {
  const router = useRouter();
  const testimonials = useQuery(api.services.testimonials.listAll);
  const moveTestimonial = useMutation(api.services.testimonials.move);
  const removeTestimonial = useMutation(api.services.testimonials.remove);

  const [formTarget, setFormTarget] = useState<Testimonial | 'new' | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Testimonial | null>(null);
  const [busyId, setBusyId] = useState<Id<'testimonials'> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isLoading = testimonials === undefined;
  const publishedCount = testimonials?.filter((t) => t.isPublished).length ?? 0;

  const handleMove = async (id: Id<'testimonials'>, direction: 'up' | 'down') => {
    setBusyId(id);
    try {
      await moveTestimonial({ id, direction });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to reorder testimonial');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (t: Testimonial) => {
    setBusyId(t._id);
    try {
      await removeTestimonial({ id: t._id });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete testimonial');
    } finally {
      setBusyId(null);
    }
  };

  const addButton = (
    <button
      onClick={() => setFormTarget('new')}
      className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold border transition-all active:scale-95 flex-shrink-0"
      style={{ background: 'var(--red)', borderColor: 'var(--red-deep)', color: 'oklch(0.99 0 0)' }}
    >
      <Plus className="w-4 h-4" />
      <span className="hidden sm:inline">Add testimonial</span>
      <span className="sm:hidden">Add</span>
    </button>
  );

  return (
    <div className="min-h-screen pb-24 sm:pb-6" style={{ background: 'var(--bg)', color: 'var(--ink)' }}>
      {/* Header */}
      <div
        className="sticky top-0 z-50 backdrop-blur-sm border-b safe-area-top"
        style={{ background: 'color-mix(in oklch, var(--bg) 88%, transparent)', borderColor: 'var(--line)' }}
      >
        <div className="px-3 sm:px-6 py-3 sm:py-4 max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-lg border hover:opacity-90 flex-shrink-0"
              style={{ background: 'var(--surface-2)', borderColor: 'var(--line)' }}
              aria-label="Go back"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: 'var(--ink)' }} />
            </button>
            <div className="min-w-0 flex-1">
              <p className="label-eyebrow truncate">
                Settings · storefront
                {testimonials && testimonials.length > 0 && ` · ${publishedCount} of ${testimonials.length} published`}
              </p>
              <h1 className="display text-lg sm:text-2xl truncate">Testimonials</h1>
            </div>
          </div>
          {addButton}
        </div>
      </div>

      <div className="px-3 sm:px-6 py-4 sm:py-6 max-w-5xl mx-auto space-y-4">
        <div
          className="flex items-start gap-2.5 p-3 rounded-[12px] border text-xs sm:text-sm leading-relaxed"
          style={{ background: 'var(--surface)', borderColor: 'var(--line)', color: 'var(--ink-3)' }}
        >
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--indigo)' }} />
          <p>
            Published testimonials appear on the website home page in the order shown here. Use the arrows to
            reorder. Only use a client&apos;s photo with their consent.
          </p>
        </div>

        {isLoading ? (
          <div className="text-center py-16 text-sm" style={{ color: 'var(--ink-4)' }}>
            <RefreshCw className="w-6 h-6 mx-auto mb-3 animate-spin" />
            Loading testimonials…
          </div>
        ) : testimonials.length === 0 ? (
          <div
            className="text-center py-12 px-4 rounded-[14px] border"
            style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}
          >
            <MessageSquareQuote className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--ink-4)' }} />
            <h3 className="text-base sm:text-lg font-bold mb-1" style={{ color: 'var(--ink)' }}>
              No testimonials yet
            </h3>
            <p className="text-sm max-w-md mx-auto mb-4" style={{ color: 'var(--ink-3)' }}>
              Add kind words from happy clients. Published testimonials appear on the website home page; drafts stay
              hidden until you publish them.
            </p>
            <div className="inline-flex">{addButton}</div>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {testimonials.map((t, i) => (
              <TestimonialCard
                key={t._id}
                testimonial={t}
                isFirst={i === 0}
                isLast={i === testimonials.length - 1}
                busy={busyId === t._id}
                onMove={(dir) => handleMove(t._id, dir)}
                onEdit={() => setFormTarget(t)}
                onDelete={() => setDeleteTarget(t)}
              />
            ))}
          </div>
        )}
      </div>

      {formTarget && (
        <TestimonialFormModal
          testimonial={formTarget === 'new' ? null : formTarget}
          onClose={() => setFormTarget(null)}
        />
      )}

      <ConfirmationModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) void handleDelete(deleteTarget);
        }}
        title="Delete testimonial?"
        message={
          deleteTarget
            ? `The testimonial from ${deleteTarget.clientName} will be permanently removed${
                deleteTarget.isPublished ? ' from the website' : ''
              }. This can't be undone.`
            : ''
        }
        type="error"
        confirmText="Delete"
        showCancel
      />

      <ConfirmationModal
        isOpen={!!error}
        onClose={() => setError(null)}
        title="Something went wrong"
        message={error ?? ''}
        type="error"
      />

      <BottomNavbar />
    </div>
  );
}

function TestimonialCard({
  testimonial: t,
  isFirst,
  isLast,
  busy,
  onMove,
  onEdit,
  onDelete,
}: {
  testimonial: Testimonial;
  isFirst: boolean;
  isLast: boolean;
  busy: boolean;
  onMove: (direction: 'up' | 'down') => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const excerpt = t.quote.length > 220 ? `${t.quote.slice(0, 220).trimEnd()}…` : t.quote;
  return (
    <div
      className={`rounded-[14px] border p-3 sm:p-4 transition-opacity ${busy ? 'opacity-60' : ''}`}
      style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}
    >
      <div className="flex items-start gap-3">
        <Avatar name={t.clientName} photoUrl={t.photoUrl} size={48} />

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="text-sm sm:text-base font-bold truncate" style={{ color: 'var(--ink)' }}>
              {t.clientName}
            </h3>
            <span
              className="font-mono-tabular text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold"
              style={
                t.isPublished
                  ? { background: 'var(--jade-wash)', color: 'var(--jade)' }
                  : { background: 'var(--surface-hi)', color: 'var(--ink-3)' }
              }
            >
              {t.isPublished ? 'Published' : 'Draft'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[11px]" style={{ color: 'var(--ink-3)' }}>
            {t.clientLocation && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {t.clientLocation}
              </span>
            )}
            {t.productName && (
              <span className="inline-flex items-center gap-1">
                <Package className="w-3 h-3" />
                {t.productName}
              </span>
            )}
            {t.rating !== undefined && <Stars value={t.rating} />}
          </div>

          <p className="text-[13px] leading-relaxed mt-2 break-words" style={{ color: 'var(--ink-2)' }}>
            &ldquo;{excerpt}&rdquo;
          </p>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-1.5 mt-3">
            <IconButton label="Move up" onClick={() => onMove('up')} disabled={busy || isFirst}>
              <ArrowUp className="w-3.5 h-3.5" />
            </IconButton>
            <IconButton label="Move down" onClick={() => onMove('down')} disabled={busy || isLast}>
              <ArrowDown className="w-3.5 h-3.5" />
            </IconButton>
            <span className="flex-1" />
            <button
              onClick={onEdit}
              disabled={busy}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-bold border disabled:opacity-50"
              style={{ background: 'transparent', borderColor: 'var(--line)', color: 'var(--ink-2)' }}
            >
              <Edit3 className="w-3 h-3" />
              Edit
            </button>
            <button
              onClick={onDelete}
              disabled={busy}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-bold border disabled:opacity-50"
              style={{ background: 'var(--red-wash)', borderColor: 'var(--red)', color: 'var(--red-hi)' }}
            >
              <Trash2 className="w-3 h-3" />
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TestimonialFormModal({ testimonial, onClose }: { testimonial: Testimonial | null; onClose: () => void }) {
  const createTestimonial = useMutation(api.services.testimonials.create);
  const updateTestimonial = useMutation(api.services.testimonials.update);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const getFileUrl = useMutation(api.files.getFileUrl);

  const [clientName, setClientName] = useState(testimonial?.clientName ?? '');
  const [clientLocation, setClientLocation] = useState(testimonial?.clientLocation ?? '');
  const [quote, setQuote] = useState(testimonial?.quote ?? '');
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(testimonial?.photoUrl);
  const [productName, setProductName] = useState(testimonial?.productName ?? '');
  const [rating, setRating] = useState<number | undefined>(testimonial?.rating);
  const [isPublished, setIsPublished] = useState(testimonial?.isPublished ?? true);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = clientName.trim().length > 0 && quote.trim().length > 0 && quote.length <= QUOTE_MAX && !uploading && !submitting;

  const pickPhoto = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) {
        setError('Please choose an image file');
        return;
      }
      setUploading(true);
      setError(null);
      try {
        const storageId = await uploadOptimizedImage(await generateUploadUrl(), file);
        const url = await getFileUrl({ storageId });
        if (!url) throw new Error('Failed to get image URL');
        setPhotoUrl(url);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Photo upload failed. Please try again.');
      } finally {
        setUploading(false);
      }
    };
    input.click();
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    const payload = {
      clientName: clientName.trim(),
      clientLocation: clientLocation.trim() || undefined,
      quote: quote.trim(),
      photoUrl: photoUrl || undefined,
      productName: productName.trim() || undefined,
      rating,
      isPublished,
    };
    try {
      if (testimonial) {
        await updateTestimonial({ id: testimonial._id, ...payload });
      } else {
        await createTestimonial(payload);
      }
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save testimonial');
    } finally {
      setSubmitting(false);
    }
  };

  const nearLimit = quote.length > QUOTE_MAX * 0.9;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={testimonial ? 'Edit testimonial' : 'Add testimonial'}
        className="relative w-full sm:max-w-lg max-h-[90vh] overflow-y-auto border-t sm:border rounded-t-3xl sm:rounded-2xl p-4 sm:p-6 safe-area-bottom"
        style={{ background: 'var(--surface)', borderColor: 'var(--line)', boxShadow: 'var(--shadow-pop)', color: 'var(--ink)' }}
      >
        <div className="flex justify-center pt-1 pb-3 sm:hidden">
          <div className="w-12 h-1.5 rounded-full" style={{ background: 'var(--surface-hi)' }} />
        </div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base sm:text-lg font-bold">{testimonial ? 'Edit testimonial' : 'Add testimonial'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-md hover:opacity-80" style={{ color: 'var(--ink-3)' }} aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3.5">
          {/* Photo */}
          <div>
            <div className="flex items-center gap-3">
              <Avatar name={clientName} photoUrl={photoUrl} size={64} />
              <div className="flex flex-col items-start gap-1.5">
                <button
                  type="button"
                  onClick={pickPhoto}
                  disabled={uploading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold active:scale-95 transition-all disabled:opacity-50"
                  style={{ background: 'var(--surface-2)', borderColor: 'var(--line)', color: 'var(--ink-2)' }}
                >
                  {uploading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                  {uploading ? 'Uploading…' : photoUrl ? 'Change photo' : 'Upload photo'}
                </button>
                {photoUrl && !uploading && (
                  <button
                    type="button"
                    onClick={() => setPhotoUrl(undefined)}
                    className="text-[11px] font-medium hover:opacity-80"
                    style={{ color: 'var(--red-hi)' }}
                  >
                    Remove photo
                  </button>
                )}
              </div>
            </div>
            <p className="flex items-start gap-1.5 text-[11px] mt-2 leading-relaxed" style={{ color: 'var(--ink-4)' }}>
              <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0 mt-px" />
              Optional. Make sure the client has agreed to their photo being shown on the website.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Client name *">
              <input
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                maxLength={80}
                placeholder="Maria S."
                className={inputCls}
                style={inputStyle}
              />
            </Field>
            <Field label="Location">
              <input
                value={clientLocation}
                onChange={(e) => setClientLocation(e.target.value)}
                maxLength={80}
                placeholder="Makati City"
                className={inputCls}
                style={inputStyle}
              />
            </Field>
          </div>

          <div>
            <Field label="Testimonial *">
              <textarea
                value={quote}
                onChange={(e) => setQuote(e.target.value.slice(0, QUOTE_MAX))}
                maxLength={QUOTE_MAX}
                rows={5}
                placeholder="What did the client say about their experience?"
                className={`${inputCls} resize-y`}
                style={inputStyle}
              />
            </Field>
            <p
              className="text-[11px] mt-1 text-right font-mono-tabular"
              style={{ color: nearLimit ? 'var(--red-hi)' : 'var(--ink-4)' }}
            >
              {quote.length} / {QUOTE_MAX}
            </p>
          </div>

          <Field label="Product purchased">
            <input
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              maxLength={120}
              placeholder="e.g. Super Red Arowana"
              className={inputCls}
              style={inputStyle}
            />
          </Field>

          <div>
            <span className="block text-[11px] font-medium mb-1.5" style={{ color: 'var(--ink-3)' }}>
              Rating (optional)
            </span>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => {
                const filled = rating !== undefined && n <= rating;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(rating === n ? undefined : n)}
                    className="p-1 rounded-md hover:opacity-80 active:scale-95 transition-all"
                    aria-label={`${n} star${n === 1 ? '' : 's'}`}
                    aria-pressed={rating === n}
                  >
                    <Star
                      className="w-6 h-6"
                      style={{ color: filled ? 'var(--gold)' : 'var(--ink-5)', fill: filled ? 'var(--gold)' : 'transparent' }}
                    />
                  </button>
                );
              })}
              {rating !== undefined ? (
                <button
                  type="button"
                  onClick={() => setRating(undefined)}
                  className="ml-2 text-[11px] font-medium hover:opacity-80"
                  style={{ color: 'var(--ink-3)' }}
                >
                  Clear
                </button>
              ) : (
                <span className="ml-2 text-[11px]" style={{ color: 'var(--ink-4)' }}>
                  No rating
                </span>
              )}
            </div>
          </div>

          <div
            className="flex items-start justify-between gap-3 p-3 rounded-lg border"
            style={{ background: 'var(--bg-2)', borderColor: 'var(--line-soft)' }}
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold">Published</p>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--ink-3)' }}>
                {isPublished ? 'Shown on the website home page' : 'Saved as a draft — hidden from the website'}
              </p>
            </div>
            <Switch checked={isPublished} onChange={setIsPublished} label="Published" />
          </div>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 p-3 rounded-lg border text-sm"
              style={{ background: 'var(--red-wash)', borderColor: 'var(--red)', color: 'var(--ink)' }}
            >
              <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--red-hi)' }} />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-4 mt-4 border-t" style={{ borderColor: 'var(--line)' }}>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg border text-sm font-semibold hover:opacity-80"
            style={{ background: 'transparent', borderColor: 'var(--line)', color: 'var(--ink-2)' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex-1 px-4 py-2.5 rounded-lg border text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: 'var(--red)', borderColor: 'var(--red-deep)', color: 'oklch(0.99 0 0)' }}
          >
            {submitting ? 'Saving…' : testimonial ? 'Save changes' : 'Add testimonial'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ───── small shared bits ─────

function Avatar({ name, photoUrl, size }: { name: string; photoUrl?: string; size: number }) {
  const initials = name.trim()
    ? name
        .trim()
        .split(/\s+/)
        .map((w) => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '';
  return (
    <div
      className="rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0 border font-bold"
      style={{
        width: size,
        height: size,
        background: 'var(--red-wash)',
        borderColor: 'var(--line)',
        color: 'var(--red-hi)',
        fontSize: size / 3.2,
      }}
    >
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt={name || 'Client photo'} className="w-full h-full object-cover" />
      ) : (
        initials || <MessageSquareQuote className="w-1/2 h-1/2" />
      )}
    </div>
  );
}

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className="w-3 h-3"
          style={{ color: n <= value ? 'var(--gold)' : 'var(--ink-5)', fill: n <= value ? 'var(--gold)' : 'transparent' }}
        />
      ))}
    </span>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className="p-1.5 rounded-md border transition-all active:scale-95 disabled:opacity-35 disabled:cursor-not-allowed"
      style={{ background: 'var(--surface-2)', borderColor: 'var(--line)', color: 'var(--ink-2)' }}
    >
      {children}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-medium mb-1.5" style={{ color: 'var(--ink-3)' }}>
        {label}
      </span>
      {children}
    </label>
  );
}

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="relative w-10 h-6 rounded-full transition-colors flex-shrink-0"
      style={{ background: checked ? 'var(--red)' : 'var(--surface-hi)' }}
    >
      <span
        className={`absolute top-0.5 ${checked ? 'left-[18px]' : 'left-0.5'} w-5 h-5 rounded-full transition-all`}
        style={{ background: 'oklch(0.99 0 0)', boxShadow: '0 1px 2px oklch(0 0 0 / 0.3)' }}
      />
    </button>
  );
}

export default function TestimonialsPage() {
  return (
    <SafeAreaProvider applySafeArea={false}>
      <TestimonialsContent />
    </SafeAreaProvider>
  );
}
