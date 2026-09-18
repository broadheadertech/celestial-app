'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Doc, Id } from '@/convex/_generated/dataModel';
import { ArrowDown, ArrowLeft, ArrowUp, Edit3, HelpCircle, Info, Plus, RefreshCw, Trash2, X, XCircle } from 'lucide-react';
import BottomNavbar from '@/components/common/BottomNavbar';
import SafeAreaProvider from '@/components/provider/SafeAreaProvider';
import ConfirmationModal from '@/components/ui/ConfirmationModal';

type Faq = Doc<'faqs'>;

// Keep in sync with QUESTION_MAX / ANSWER_MAX in convex/services/faqs.ts.
const QUESTION_MAX = 200;
const ANSWER_MAX = 2000;

const inputCls =
  'w-full px-3 py-2.5 rounded-lg border text-sm focus:outline-none focus:border-[var(--red)] placeholder:text-[var(--ink-4)] transition-colors';
const inputStyle: React.CSSProperties = {
  background: 'var(--bg-2)',
  borderColor: 'var(--line)',
  color: 'var(--ink)',
};

function FaqsContent() {
  const router = useRouter();
  const faqs = useQuery(api.services.faqs.listAll);
  const moveFaq = useMutation(api.services.faqs.move);
  const removeFaq = useMutation(api.services.faqs.remove);

  const [formTarget, setFormTarget] = useState<Faq | 'new' | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Faq | null>(null);
  const [busyId, setBusyId] = useState<Id<'faqs'> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isLoading = faqs === undefined;
  const publishedCount = faqs?.filter((f) => f.isPublished).length ?? 0;

  const run = async (id: Id<'faqs'>, action: () => Promise<unknown>, failure: string) => {
    setBusyId(id);
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : failure);
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
      <span className="hidden sm:inline">Add question</span>
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
                {faqs && faqs.length > 0 && ` · ${publishedCount} of ${faqs.length} published`}
              </p>
              <h1 className="display text-lg sm:text-2xl truncate">FAQs</h1>
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
            Published questions appear on the website&apos;s Contact page in the order shown here. Use the arrows to
            reorder. Drafts stay hidden. If nothing is published, the FAQ section is hidden.
          </p>
        </div>

        {isLoading ? (
          <div className="text-center py-16 text-sm" style={{ color: 'var(--ink-4)' }}>
            <RefreshCw className="w-6 h-6 mx-auto mb-3 animate-spin" />
            Loading FAQs…
          </div>
        ) : faqs.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-[14px] border" style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}>
            <HelpCircle className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--ink-4)' }} />
            <h3 className="text-base sm:text-lg font-bold mb-1" style={{ color: 'var(--ink)' }}>
              No questions yet
            </h3>
            <p className="text-sm max-w-md mx-auto mb-4" style={{ color: 'var(--ink-3)' }}>
              Answer the questions customers ask most — shipping, deposits, quarantine, payment. Published questions
              appear on the Contact page.
            </p>
            <div className="inline-flex">{addButton}</div>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {faqs.map((f, i) => {
              const busy = busyId === f._id;
              const excerpt = f.answer.length > 240 ? `${f.answer.slice(0, 240).trimEnd()}…` : f.answer;
              return (
                <div
                  key={f._id}
                  className={`rounded-[14px] border p-3 sm:p-4 transition-opacity ${busy ? 'opacity-60' : ''}`}
                  style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}
                >
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-mono-tabular text-[11px] font-bold" style={{ color: 'var(--ink-4)' }}>
                      {i + 1}.
                    </span>
                    <h3 className="text-sm sm:text-base font-bold min-w-0 break-words" style={{ color: 'var(--ink)' }}>
                      {f.question}
                    </h3>
                    <span
                      className="font-mono-tabular text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold"
                      style={f.isPublished ? { background: 'var(--jade-wash)', color: 'var(--jade)' } : { background: 'var(--surface-hi)', color: 'var(--ink-3)' }}
                    >
                      {f.isPublished ? 'Published' : 'Draft'}
                    </span>
                  </div>
                  <p className="text-[13px] leading-relaxed mt-2 break-words whitespace-pre-line" style={{ color: 'var(--ink-2)' }}>
                    {excerpt}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5 mt-3">
                    <IconButton label="Move up" onClick={() => run(f._id, () => moveFaq({ id: f._id, direction: 'up' }), 'Failed to reorder')} disabled={busy || i === 0}>
                      <ArrowUp className="w-3.5 h-3.5" />
                    </IconButton>
                    <IconButton label="Move down" onClick={() => run(f._id, () => moveFaq({ id: f._id, direction: 'down' }), 'Failed to reorder')} disabled={busy || i === faqs.length - 1}>
                      <ArrowDown className="w-3.5 h-3.5" />
                    </IconButton>
                    <span className="flex-1" />
                    <button
                      onClick={() => setFormTarget(f)}
                      disabled={busy}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-bold border disabled:opacity-50"
                      style={{ background: 'transparent', borderColor: 'var(--line)', color: 'var(--ink-2)' }}
                    >
                      <Edit3 className="w-3 h-3" />
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteTarget(f)}
                      disabled={busy}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-bold border disabled:opacity-50"
                      style={{ background: 'var(--red-wash)', borderColor: 'var(--red)', color: 'var(--red-hi)' }}
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {formTarget && <FaqFormModal faq={formTarget === 'new' ? null : formTarget} onClose={() => setFormTarget(null)} />}

      <ConfirmationModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) void run(deleteTarget._id, () => removeFaq({ id: deleteTarget._id }), 'Failed to delete question');
        }}
        title="Delete question?"
        message={deleteTarget ? `“${deleteTarget.question}” will be permanently removed${deleteTarget.isPublished ? ' from the website' : ''}. This can't be undone.` : ''}
        type="error"
        confirmText="Delete"
        showCancel
      />

      <ConfirmationModal isOpen={!!error} onClose={() => setError(null)} title="Something went wrong" message={error ?? ''} type="error" />

      <BottomNavbar />
    </div>
  );
}

function FaqFormModal({ faq, onClose }: { faq: Faq | null; onClose: () => void }) {
  const createFaq = useMutation(api.services.faqs.create);
  const updateFaq = useMutation(api.services.faqs.update);

  const [question, setQuestion] = useState(faq?.question ?? '');
  const [answer, setAnswer] = useState(faq?.answer ?? '');
  const [isPublished, setIsPublished] = useState(faq?.isPublished ?? true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = question.trim().length > 0 && answer.trim().length > 0 && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    const payload = { question: question.trim(), answer: answer.trim(), isPublished };
    try {
      if (faq) await updateFaq({ id: faq._id, ...payload });
      else await createFaq(payload);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save question');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={faq ? 'Edit question' : 'Add question'}
        className="relative w-full sm:max-w-lg max-h-[90vh] overflow-y-auto border-t sm:border rounded-t-3xl sm:rounded-2xl p-4 sm:p-6 safe-area-bottom"
        style={{ background: 'var(--surface)', borderColor: 'var(--line)', boxShadow: 'var(--shadow-pop)', color: 'var(--ink)' }}
      >
        <div className="flex justify-center pt-1 pb-3 sm:hidden">
          <div className="w-12 h-1.5 rounded-full" style={{ background: 'var(--surface-hi)' }} />
        </div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base sm:text-lg font-bold">{faq ? 'Edit question' : 'Add question'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-md hover:opacity-80" style={{ color: 'var(--ink-3)' }} aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3.5">
          <Field label="Question *">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value.slice(0, QUESTION_MAX))}
              maxLength={QUESTION_MAX}
              placeholder="e.g. Do you deliver outside Metro Manila?"
              className={inputCls}
              style={inputStyle}
            />
          </Field>

          <div>
            <Field label="Answer *">
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value.slice(0, ANSWER_MAX))}
                maxLength={ANSWER_MAX}
                rows={7}
                placeholder="Keep it short and specific. Leave a blank line between paragraphs."
                className={`${inputCls} resize-y`}
                style={inputStyle}
              />
            </Field>
            <p className="text-[11px] mt-1 text-right font-mono-tabular" style={{ color: answer.length > ANSWER_MAX * 0.9 ? 'var(--red-hi)' : 'var(--ink-4)' }}>
              {answer.length} / {ANSWER_MAX}
            </p>
          </div>

          <div className="flex items-start justify-between gap-3 p-3 rounded-lg border" style={{ background: 'var(--bg-2)', borderColor: 'var(--line-soft)' }}>
            <div className="min-w-0">
              <p className="text-sm font-semibold">Published</p>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--ink-3)' }}>
                {isPublished ? 'Shown on the Contact page' : 'Saved as a draft — hidden from the website'}
              </p>
            </div>
            <Switch checked={isPublished} onChange={setIsPublished} label="Published" />
          </div>

          {error && (
            <div role="alert" className="flex items-start gap-2 p-3 rounded-lg border text-sm" style={{ background: 'var(--red-wash)', borderColor: 'var(--red)', color: 'var(--ink)' }}>
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
            {submitting ? 'Saving…' : faq ? 'Save changes' : 'Add question'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ───── small shared bits ─────

function IconButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
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

export default function FaqsPage() {
  return (
    <SafeAreaProvider applySafeArea={false}>
      <FaqsContent />
    </SafeAreaProvider>
  );
}
