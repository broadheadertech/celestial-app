'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import {
  ArrowLeft,
  Archive,
  Check,
  Mail,
  MessageCircle,
  Phone,
  RefreshCw,
} from 'lucide-react';
import BottomNavbar from '@/components/common/BottomNavbar';
import SafeAreaProvider from '@/components/provider/SafeAreaProvider';

type MessageStatus = 'new' | 'responded' | 'archived';

function MessagesContent() {
  const router = useRouter();
  const [filter, setFilter] = useState<'all' | MessageStatus>('all');
  const [busyId, setBusyId] = useState<string | null>(null);

  const messages = useQuery(api.services.contact.getContactMessages, {
    status: filter === 'all' ? undefined : filter,
    limit: 200,
  });
  const updateStatus = useMutation(api.services.contact.updateContactStatus);

  const counts = useMemo(() => {
    if (!messages) return { all: 0, new: 0, responded: 0, archived: 0 };
    return {
      all: messages.length,
      new: messages.filter((m) => m.status === 'new').length,
      responded: messages.filter((m) => m.status === 'responded').length,
      archived: messages.filter((m) => m.status === 'archived').length,
    };
  }, [messages]);

  const handleStatus = async (id: string, status: MessageStatus) => {
    setBusyId(id);
    try {
      await updateStatus({ id: id as Id<'contactMessages'>, status });
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to update');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="min-h-screen pb-24 sm:pb-6" style={{ background: 'var(--bg)', color: 'var(--ink)' }}>
      <div
        className="sticky top-0 z-50 backdrop-blur-sm border-b safe-area-top relative"
        style={{ background: 'oklch(0.135 0.005 25 / 0.85)', borderColor: 'var(--line)' }}
      >
        <div className="caustics-line absolute bottom-0 left-3 right-3 sm:left-6 sm:right-6" />
        <div className="px-3 sm:px-6 py-3 sm:py-4 max-w-7xl mx-auto flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg border hover:opacity-90 flex-shrink-0"
            style={{ background: 'var(--surface-2)', borderColor: 'var(--line)' }}
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: 'var(--ink)' }} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="label-eyebrow truncate">Public contact form · /contact</p>
            <h1
              className="display text-lg sm:text-2xl truncate"
              style={{ fontVariationSettings: '"opsz" 32, "wght" 700' }}
            >
              Messages
            </h1>
          </div>
        </div>
      </div>

      <div className="px-3 sm:px-6 py-4 sm:py-6 max-w-7xl mx-auto space-y-5">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {([
            { key: 'all', label: 'All' },
            { key: 'new', label: 'New' },
            { key: 'responded', label: 'Responded' },
            { key: 'archived', label: 'Archived' },
          ] as const).map((f) => {
            const active = filter === f.key;
            const count = counts[f.key as keyof typeof counts];
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className="flex-shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold border whitespace-nowrap transition-all"
                style={{
                  borderColor: active ? 'var(--red)' : 'var(--line)',
                  background: active ? 'var(--red)' : 'var(--surface)',
                  color: active ? 'oklch(0.99 0 0)' : 'var(--ink-2)',
                }}
              >
                <span>{f.label}</span>
                <span
                  className="font-mono-tabular text-[10px] px-1.5 py-0.5 rounded"
                  style={{
                    background: active ? 'oklch(1 0 0 / 0.18)' : 'var(--surface-hi)',
                    color: active ? 'oklch(0.99 0 0)' : 'var(--ink-3)',
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {!messages ? (
          <div className="text-center py-16 text-sm" style={{ color: 'var(--ink-4)' }}>
            <RefreshCw className="w-6 h-6 mx-auto mb-3 animate-spin" />
            Loading messages…
          </div>
        ) : messages.length === 0 ? (
          <div
            className="text-center py-16 rounded-[14px] border"
            style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}
          >
            <MessageCircle className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--ink-4)' }} />
            <p className="text-sm" style={{ color: 'var(--ink-3)' }}>
              No messages in this view.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {messages.map((m) => {
              const status = m.status as MessageStatus;
              const statusTone =
                status === 'new'
                  ? { bg: 'var(--gold-wash)', fg: 'var(--gold-deep)' }
                  : status === 'responded'
                  ? { bg: 'var(--jade-wash)', fg: 'var(--jade)' }
                  : { bg: 'var(--surface-hi)', fg: 'var(--ink-3)' };
              const created = new Date(m.createdAt).toLocaleString('en-PH', {
                dateStyle: 'medium',
                timeStyle: 'short',
              });
              return (
                <div
                  key={m._id}
                  className="rounded-[14px] border p-4 sm:p-5"
                  style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}
                >
                  <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span
                          className="font-mono-tabular text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold"
                          style={{ background: statusTone.bg, color: statusTone.fg }}
                        >
                          {status}
                        </span>
                        <span className="placard" style={{ color: 'var(--ink-4)' }}>
                          {created}
                        </span>
                      </div>
                      <h3
                        className="display text-base sm:text-lg"
                        style={{ fontVariationSettings: '"opsz" 24, "wght" 700' }}
                      >
                        {m.subject}
                      </h3>
                      <p className="text-[12px] mt-0.5" style={{ color: 'var(--ink-3)' }}>
                        From {m.name}
                      </p>
                    </div>
                    <div className="flex gap-1.5">
                      {status === 'new' && (
                        <button
                          onClick={() => handleStatus(m._id, 'responded')}
                          disabled={busyId === m._id}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-bold border"
                          style={{
                            background: 'var(--jade-wash)',
                            borderColor: 'var(--jade)',
                            color: 'var(--jade)',
                          }}
                        >
                          <Check size={12} />
                          Mark responded
                        </button>
                      )}
                      {status !== 'archived' && (
                        <button
                          onClick={() => handleStatus(m._id, 'archived')}
                          disabled={busyId === m._id}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-semibold border"
                          style={{
                            background: 'transparent',
                            borderColor: 'var(--line)',
                            color: 'var(--ink-3)',
                          }}
                        >
                          <Archive size={12} />
                          Archive
                        </button>
                      )}
                      {status === 'archived' && (
                        <button
                          onClick={() => handleStatus(m._id, 'new')}
                          disabled={busyId === m._id}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-semibold border"
                          style={{
                            background: 'transparent',
                            borderColor: 'var(--line)',
                            color: 'var(--ink-3)',
                          }}
                        >
                          Reopen
                        </button>
                      )}
                    </div>
                  </div>

                  <div
                    className="text-[14px] mb-3 whitespace-pre-wrap leading-relaxed"
                    style={{ color: 'var(--ink-2)' }}
                  >
                    {m.message}
                  </div>

                  <div
                    className="flex flex-wrap gap-3 items-center text-[12px]"
                    style={{ color: 'var(--ink-3)' }}
                  >
                    <a
                      href={`mailto:${m.email}?subject=Re: ${encodeURIComponent(m.subject)}`}
                      className="inline-flex items-center gap-1.5 hover:opacity-80"
                    >
                      <Mail size={12} />
                      {m.email}
                    </a>
                    {m.phone && (
                      <a
                        href={`tel:${m.phone}`}
                        className="inline-flex items-center gap-1.5 hover:opacity-80"
                      >
                        <Phone size={12} />
                        {m.phone}
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <BottomNavbar />
    </div>
  );
}

export default function MessagesPage() {
  return (
    <SafeAreaProvider applySafeArea={false}>
      <MessagesContent />
    </SafeAreaProvider>
  );
}
