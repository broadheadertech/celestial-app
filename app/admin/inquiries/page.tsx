'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from 'convex/react';
import {
  ArrowLeft,
  Fish,
  Mail,
  MailQuestion,
  MessageCircle,
  Phone,
  RefreshCw,
  Reply,
  Send,
  StickyNote,
  Upload,
} from 'lucide-react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import type { FunctionReturnType } from 'convex/server';
import BottomNavbar from '@/components/common/BottomNavbar';
import SafeAreaProvider from '@/components/provider/SafeAreaProvider';
import { adminToast } from '@/components/admin/AdminToaster';
import { errorMessage } from '@/lib/errorMessage';

type Inquiry = FunctionReturnType<typeof api.services.inquiries.getInquiries>[number];
type Status = Inquiry['status'];

const peso = (n: number) => `₱${Math.round(n).toLocaleString('en-PH')}`;
const inputCls = 'w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:border-[var(--red)]';
const inputStyle: React.CSSProperties = { background: 'var(--bg-2)', borderColor: 'var(--line)', color: 'var(--ink)' };

const STATUS_LABEL: Record<Status, string> = {
  new: 'New',
  replied: 'Replied',
  negotiating: 'Negotiating',
  won: 'Won',
  lost: 'Lost',
  closed: 'Closed',
};

const TONE: Record<Status, { bg: string; fg: string }> = {
  new: { bg: 'color-mix(in oklch, var(--gold) 18%, transparent)', fg: 'var(--gold)' },
  replied: { bg: 'var(--surface-hi)', fg: 'var(--ink-2)' },
  negotiating: { bg: 'var(--jade-wash)', fg: 'var(--jade)' },
  won: { bg: 'var(--jade-wash)', fg: 'var(--jade)' },
  lost: { bg: 'var(--red-wash)', fg: 'var(--red-hi)' },
  closed: { bg: 'var(--surface-hi)', fg: 'var(--ink-3)' },
};

/**
 * Admin → Inquiries: one inbox for product enquiries and Contact-page messages. Replies are
 * written here and emailed to the customer, so there's a record of what was actually said.
 */
function InquiriesContent() {
  const router = useRouter();
  const [filter, setFilter] = useState<'all' | Status>('all');
  const [source, setSource] = useState<'all' | 'product' | 'contact'>('all');
  const [search, setSearch] = useState('');
  const [replying, setReplying] = useState<Inquiry | null>(null);
  const [noting, setNoting] = useState<Inquiry | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const inquiries = useQuery(api.services.inquiries.getInquiries, {
    status: filter === 'all' ? undefined : filter,
    source: source === 'all' ? undefined : source,
    search: search.trim() || undefined,
    limit: 200,
  });
  const counts = useQuery(api.services.inquiries.getInquiryCounts, {});
  const backfill = useQuery(api.services.inquiries.getBackfillStatus, {});
  const runBackfill = useMutation(api.services.inquiries.backfillContactMessages);
  const setStatus = useMutation(api.services.inquiries.updateInquiryStatus);
  const [migrating, setMigrating] = useState(false);

  const rows = useMemo(() => {
    const list = inquiries ?? [];
    // Unanswered first — they're the ones costing you a sale.
    return [...list].sort((a, b) => {
      const open = (i: Inquiry) => (i.status === 'new' ? 0 : 1);
      return open(a) - open(b) || b.createdAt - a.createdAt;
    });
  }, [inquiries]);

  const move = async (inquiryId: Id<'inquiries'>, status: Status) => {
    setBusyId(inquiryId);
    try {
      await setStatus({ inquiryId, status });
    } catch (e) {
      adminToast(errorMessage(e, 'Could not update that inquiry.'));
    } finally {
      setBusyId(null);
    }
  };

  const migrate = async () => {
    setMigrating(true);
    try {
      const res = await runBackfill({});
      adminToast(
        res.copied > 0
          ? `Moved ${res.copied} old contact message${res.copied === 1 ? '' : 's'} into this inbox.`
          : 'Nothing left to move — they are all here already.',
        'success',
      );
    } catch (e) {
      adminToast(errorMessage(e, 'Could not move the old messages.'));
    } finally {
      setMigrating(false);
    }
  };

  return (
    <div className="min-h-screen pb-24 sm:pb-6" style={{ background: 'var(--bg)', color: 'var(--ink)' }}>
      <div className="sticky top-0 z-50 backdrop-blur-sm border-b safe-area-top" style={{ background: 'color-mix(in oklch, var(--bg) 88%, transparent)', borderColor: 'var(--line)' }}>
        <div className="px-3 sm:px-6 py-3 sm:py-4 max-w-6xl mx-auto flex items-center gap-3">
          <button onClick={() => router.back()} aria-label="Go back" className="p-2 rounded-lg border flex-shrink-0" style={{ background: 'var(--surface-2)', borderColor: 'var(--line)' }}>
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: 'var(--ink)' }} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="label-eyebrow truncate">Questions from customers</p>
            <h1 className="display text-lg sm:text-2xl truncate" style={{ fontVariationSettings: '"opsz" 32, "wght" 700' }}>Inquiries</h1>
          </div>
          {!!counts?.new && (
            <span className="font-mono-tabular text-xs px-2.5 py-1 rounded-full font-bold flex-shrink-0" style={{ background: 'var(--red)', color: 'oklch(0.99 0 0)' }}>
              {counts.new} waiting
            </span>
          )}
        </div>
      </div>

      <div className="px-3 sm:px-6 py-4 sm:py-6 max-w-6xl mx-auto space-y-4">
        {!!backfill?.pending && (
          <div className="flex items-start gap-2.5 p-3 rounded-[12px] border text-xs sm:text-sm leading-relaxed" style={{ background: 'var(--surface)', borderColor: 'var(--line)', color: 'var(--ink-3)' }}>
            <Upload className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--indigo)' }} />
            <p className="flex-1">
              You have <b style={{ color: 'var(--ink)' }}>{backfill.pending}</b> older message{backfill.pending === 1 ? '' : 's'} from the Contact page that
              {backfill.pending === 1 ? " hasn't" : " haven't"} moved into this inbox yet. Nothing is deleted — they&rsquo;re copied across with their status.
            </p>
            <button onClick={migrate} disabled={migrating} className="px-3 py-1.5 rounded-md text-[11px] font-bold border flex-shrink-0 disabled:opacity-50" style={{ borderColor: 'var(--line)', color: 'var(--ink-2)' }}>
              {migrating ? 'Moving…' : 'Move them in'}
            </button>
          </div>
        )}

        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide flex-1 min-w-[220px]">
            {([['all', 'All'], ['new', 'New'], ['replied', 'Replied'], ['negotiating', 'Negotiating'], ['won', 'Won'], ['lost', 'Lost'], ['closed', 'Closed']] as const).map(([key, label]) => {
              const active = filter === key;
              const count = counts?.[key as keyof typeof counts];
              return (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className="admin-tab flex-shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold border whitespace-nowrap"
                  data-active={active}
                  style={active ? { borderColor: 'var(--red)', background: 'var(--red)', color: 'oklch(0.99 0 0)' } : { borderColor: 'var(--line)', background: 'var(--surface)' }}
                >
                  <span>{label}</span>
                  {count !== undefined && (
                    <span className="font-mono-tabular text-[10px] px-1.5 py-0.5 rounded" style={{ background: active ? 'oklch(1 0 0 / 0.18)' : 'var(--surface-hi)', color: active ? 'oklch(0.99 0 0)' : 'var(--ink-3)' }}>{count}</span>
                  )}
                </button>
              );
            })}
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, fish, code…"
            className="px-3 py-2 rounded-lg border text-sm focus:outline-none focus:border-[var(--red)] w-full sm:w-72"
            style={inputStyle}
          />
        </div>

        <div className="flex gap-1.5">
          {([['all', 'Everything'], ['product', 'About a fish'], ['contact', 'Contact page']] as const).map(([key, label]) => {
            const active = source === key;
            const count = key === 'all' ? counts?.all : counts?.[key];
            return (
              <button
                key={key}
                onClick={() => setSource(key)}
                className="admin-tab inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11.5px] font-semibold border"
                data-active={active}
                style={active ? { borderColor: 'var(--ink-4)', background: 'var(--surface-hi)', color: 'var(--ink)' } : { borderColor: 'var(--line)', background: 'transparent', color: 'var(--ink-3)' }}
              >
                {label}
                {count !== undefined && <span className="font-mono-tabular opacity-70">{count}</span>}
              </button>
            );
          })}
        </div>

        {inquiries === undefined ? (
          <div className="text-center py-16 text-sm" style={{ color: 'var(--ink-4)' }}>
            <RefreshCw className="w-6 h-6 mx-auto mb-3 animate-spin" />
            Loading inquiries…
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-16 rounded-[14px] border" style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}>
            <MailQuestion className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--ink-4)' }} />
            <p className="text-sm mb-1" style={{ color: 'var(--ink-2)' }}>Nothing in this view.</p>
            <p className="text-xs" style={{ color: 'var(--ink-3)' }}>
              Questions arrive from the enquiry form on a fish&rsquo;s page and from the Contact page.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {rows.map((inquiry) => (
              <InquiryCard
                key={inquiry._id}
                inquiry={inquiry}
                busy={busyId === inquiry._id}
                onMove={move}
                onReply={() => setReplying(inquiry)}
                onNote={() => setNoting(inquiry)}
              />
            ))}
          </div>
        )}
      </div>

      {replying && <ReplyDialog inquiry={replying} onClose={() => setReplying(null)} />}
      {noting && <NoteDialog inquiry={noting} onClose={() => setNoting(null)} />}
      <BottomNavbar />
    </div>
  );
}

function InquiryCard({
  inquiry,
  busy,
  onMove,
  onReply,
  onNote,
}: {
  inquiry: Inquiry;
  busy: boolean;
  onMove: (id: Id<'inquiries'>, status: Status) => void;
  onReply: () => void;
  onNote: () => void;
}) {
  const tone = TONE[inquiry.status];
  const replies = inquiry.replies ?? [];
  const isProduct = inquiry.source === 'product';

  return (
    <div className="rounded-[14px] border overflow-hidden" style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}>
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="font-mono-tabular text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold" style={{ background: tone.bg, color: tone.fg }}>
                {STATUS_LABEL[inquiry.status]}
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold" style={{ background: 'var(--surface-hi)', color: 'var(--ink-3)' }}>
                {isProduct ? <Fish size={10} /> : <MessageCircle size={10} />}
                {isProduct ? 'Fish' : 'Contact'}
              </span>
              <span className="font-mono-tabular text-[11px]" style={{ color: 'var(--ink-3)' }}>{inquiry.code}</span>
              <span className="placard" style={{ color: 'var(--ink-4)' }}>
                {new Date(inquiry.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <h3 className="display text-base sm:text-lg truncate" style={{ fontVariationSettings: '"opsz" 24, "wght" 700' }}>{inquiry.name}</h3>
            <p className="text-[12.5px] mt-0.5" style={{ color: 'var(--ink-2)' }}>
              {isProduct
                ? <>{inquiry.productName ?? 'A fish'}{inquiry.productPrice !== undefined && <span style={{ color: 'var(--ink-3)' }}> · {peso(inquiry.productPrice)}</span>}{inquiry.productRef && <span style={{ color: 'var(--ink-3)' }}> · {inquiry.productRef}</span>}</>
                : inquiry.subject}
            </p>
          </div>

          <div className="flex gap-1.5 flex-shrink-0 flex-wrap justify-end">
            <button onClick={onReply} disabled={busy} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-bold border disabled:opacity-50" style={{ background: 'var(--jade-wash)', borderColor: 'var(--jade)', color: 'var(--jade)' }}>
              <Reply size={12} />
              Reply
            </button>
            <button onClick={onNote} disabled={busy} aria-label="Add a private note" className="px-2 py-1.5 rounded-md border disabled:opacity-50" style={{ borderColor: 'var(--line)', color: 'var(--ink-3)' }}>
              <StickyNote size={12} />
            </button>
          </div>
        </div>

        <div className="p-3 rounded text-[13px] leading-relaxed mb-3 whitespace-pre-line" style={{ background: 'var(--bg-2)', color: 'var(--ink)' }}>
          {inquiry.message}
        </div>

        <div className="flex flex-wrap gap-3 items-center text-[12px] mb-3" style={{ color: 'var(--ink-3)' }}>
          <a href={`mailto:${inquiry.email}?subject=${encodeURIComponent(`Re: ${inquiry.productName ?? inquiry.subject ?? 'your enquiry'} (${inquiry.code})`)}`} className="inline-flex items-center gap-1.5 hover:opacity-80">
            <Mail size={12} />
            {inquiry.email}
          </a>
          {inquiry.phone && (
            <a href={`tel:${inquiry.phone}`} className="inline-flex items-center gap-1.5 hover:opacity-80">
              <Phone size={12} />
              {inquiry.phone}
            </a>
          )}
          {inquiry.assignedToName && <span>Owner: {inquiry.assignedToName}</span>}
        </div>

        {replies.length > 0 && (
          <div className="space-y-2 mb-3">
            {replies.map((reply, index) => (
              <div key={index} className="p-3 rounded text-[12.5px] leading-relaxed whitespace-pre-line" style={{ background: 'var(--surface-hi)', color: 'var(--ink-2)' }}>
                <div className="placard mb-1" style={{ color: 'var(--ink-4)' }}>
                  {reply.sentByName} · {new Date(reply.sentAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  {reply.emailed ? ' · emailed' : ' · answered elsewhere'}
                </div>
                {reply.body}
              </div>
            ))}
          </div>
        )}

        {inquiry.staffNotes && (
          <div className="p-3 rounded text-[12.5px] leading-relaxed mb-3 whitespace-pre-line" style={{ background: 'var(--bg-2)', color: 'var(--ink-2)' }}>
            <span className="placard mr-2">Private note</span>
            {inquiry.staffNotes}
          </div>
        )}

        {/* Where it got to. A fish enquiry is a sale to win or lose; a general question just closes. */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {(isProduct
            ? (['negotiating', 'won', 'lost'] as const)
            : (['replied', 'closed'] as const)
          ).map((status) => (
            <button
              key={status}
              onClick={() => onMove(inquiry._id, status)}
              disabled={busy || inquiry.status === status}
              className="px-2.5 py-1.5 rounded-md text-[11px] font-semibold border disabled:opacity-35"
              style={{ borderColor: 'var(--line)', color: 'var(--ink-3)' }}
            >
              {inquiry.status === status ? `✓ ${STATUS_LABEL[status]}` : `Mark ${STATUS_LABEL[status].toLowerCase()}`}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ReplyDialog({ inquiry, onClose }: { inquiry: Inquiry; onClose: () => void }) {
  const reply = useMutation(api.services.inquiries.replyToInquiry);
  const [body, setBody] = useState('');
  const [sendEmail, setSendEmail] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (body.trim().length < 2) return;
    setBusy(true);
    setError(null);
    try {
      const res = await reply({ inquiryId: inquiry._id, body, sendEmail });
      adminToast(res.emailed ? `Reply emailed to ${inquiry.email}.` : 'Reply saved on the record.', 'success');
      onClose();
    } catch (e) {
      setError(errorMessage(e, 'Could not send that reply.'));
      setBusy(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]" onClick={() => !busy && onClose()} />
      <div className="fixed inset-0 flex items-center justify-center z-[9999] p-4 pointer-events-none">
        <div role="dialog" aria-modal="true" aria-label={`Reply to ${inquiry.name}`} className="rounded-[14px] border shadow-2xl p-5 w-full max-w-lg pointer-events-auto max-h-[90vh] overflow-y-auto" style={{ background: 'var(--surface)', borderColor: 'var(--line)', color: 'var(--ink)' }}>
          <h3 className="text-base font-bold mb-1">Reply to {inquiry.name}</h3>
          <p className="text-xs mb-3" style={{ color: 'var(--ink-3)' }}>
            {inquiry.productName ?? inquiry.subject ?? 'General enquiry'} · {inquiry.code}
          </p>

          <div className="p-3 rounded text-[12.5px] leading-relaxed mb-3 whitespace-pre-line" style={{ background: 'var(--bg-2)', color: 'var(--ink-2)' }}>
            {inquiry.message}
          </div>

          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={7}
            maxLength={5000}
            autoFocus
            placeholder={inquiry.productName ? `Yes, ${inquiry.productName} is still with us. It's feeding well on…` : 'Thanks for getting in touch…'}
            className={inputCls}
            style={{ ...inputStyle, resize: 'vertical' }}
          />

          <label className="flex items-start gap-2.5 cursor-pointer mt-3">
            <input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} className="mt-0.5" />
            <span>
              <span className="text-[13px] font-medium" style={{ color: 'var(--ink)' }}>Email this to {inquiry.email}</span>
              <span className="block text-[11px] mt-0.5" style={{ color: 'var(--ink-3)' }}>
                Untick if you already answered them on Messenger or by phone — the reply is still kept on the record.
              </span>
            </span>
          </label>

          {error && <p role="alert" className="text-sm mt-3" style={{ color: 'var(--red-hi)' }}>{error}</p>}

          <div className="flex gap-2 mt-5">
            <button onClick={onClose} disabled={busy} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium border disabled:opacity-50" style={{ borderColor: 'var(--line)', color: 'var(--ink-2)' }}>
              Cancel
            </button>
            <button onClick={submit} disabled={busy || body.trim().length < 2} className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-40" style={{ background: 'var(--red)', color: 'oklch(0.99 0 0)' }}>
              <Send size={14} />
              {busy ? 'Sending…' : sendEmail ? 'Send reply' : 'Save reply'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function NoteDialog({ inquiry, onClose }: { inquiry: Inquiry; onClose: () => void }) {
  const update = useMutation(api.services.inquiries.updateInquiryDetails);
  const staff = useQuery(api.services.admin.getStaffUsers, {});
  const [staffNotes, setStaffNotes] = useState(inquiry.staffNotes ?? '');
  const [assignedToId, setAssignedToId] = useState<string>(inquiry.assignedToId ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await update({
        inquiryId: inquiry._id,
        staffNotes,
        ...(assignedToId ? { assignedToId: assignedToId as Id<'users'> } : {}),
      });
      adminToast('Saved.', 'success');
      onClose();
    } catch (e) {
      setError(errorMessage(e, 'Could not save that.'));
      setBusy(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]" onClick={() => !busy && onClose()} />
      <div className="fixed inset-0 flex items-center justify-center z-[9999] p-4 pointer-events-none">
        <div role="dialog" aria-modal="true" aria-label={`Note on ${inquiry.code}`} className="rounded-[14px] border shadow-2xl p-5 w-full max-w-md pointer-events-auto" style={{ background: 'var(--surface)', borderColor: 'var(--line)', color: 'var(--ink)' }}>
          <h3 className="text-base font-bold mb-1">Private note</h3>
          <p className="text-xs mb-4" style={{ color: 'var(--ink-3)' }}>
            {inquiry.code} · {inquiry.name}. Never shown to the customer.
          </p>

          <label className="block text-[11px] mb-3" style={{ color: 'var(--ink-3)' }}>
            Whose lead is this?
            <select value={assignedToId} onChange={(e) => setAssignedToId(e.target.value)} className={`${inputCls} mt-1`} style={inputStyle}>
              <option value="">Nobody yet</option>
              {(staff ?? []).map((person) => (
                <option key={person._id} value={person._id}>{person.firstName} {person.lastName}</option>
              ))}
            </select>
          </label>

          <label className="block text-[11px]" style={{ color: 'var(--ink-3)' }}>
            Note
            <textarea value={staffNotes} onChange={(e) => setStaffNotes(e.target.value)} rows={5} maxLength={2000} placeholder="Serious buyer, wants to see it Saturday. Offered 5% off if they take the tank too." className={`${inputCls} mt-1`} style={{ ...inputStyle, resize: 'vertical' }} />
          </label>

          {error && <p role="alert" className="text-sm mt-3" style={{ color: 'var(--red-hi)' }}>{error}</p>}

          <div className="flex gap-2 mt-5">
            <button onClick={onClose} disabled={busy} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium border disabled:opacity-50" style={{ borderColor: 'var(--line)', color: 'var(--ink-2)' }}>
              Cancel
            </button>
            <button onClick={submit} disabled={busy} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50" style={{ background: 'var(--red)', color: 'oklch(0.99 0 0)' }}>
              {busy ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default function InquiriesPage() {
  return (
    <SafeAreaProvider applySafeArea={false}>
      <InquiriesContent />
    </SafeAreaProvider>
  );
}
