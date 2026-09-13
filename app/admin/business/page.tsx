'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  Clock,
  CreditCard,
  ExternalLink,
  MapPin,
  MessageCircle,
  RefreshCw,
  Save,
  Share2,
  Store,
  XCircle,
} from 'lucide-react';
import BottomNavbar from '@/components/common/BottomNavbar';
import SafeAreaProvider from '@/components/provider/SafeAreaProvider';

interface HoursRow {
  day: string;
  open: string;
  close: string;
  closed: boolean;
}

interface BusinessForm {
  storeName: string;
  tagline: string;
  establishedYear: string;
  whatsappNumber: string;
  phone: string;
  landline: string;
  email: string;
  addressLine: string;
  city: string;
  mapUrl: string;
  gcashNumber: string;
  gcashName: string;
  bankDetails: string;
  facebookUrl: string;
  instagramUrl: string;
  tiktokUrl: string;
  hours: HoursRow[];
  hoursNote: string;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const EMPTY: BusinessForm = {
  storeName: '',
  tagline: '',
  establishedYear: '',
  whatsappNumber: '',
  phone: '',
  landline: '',
  email: '',
  addressLine: '',
  city: '',
  mapUrl: '',
  gcashNumber: '',
  gcashName: '',
  bankDetails: '',
  facebookUrl: '',
  instagramUrl: '',
  tiktokUrl: '',
  hours: DAYS.map((day) => ({ day, open: '10:00', close: '18:00', closed: false })),
  hoursNote: '',
};

const inputCls =
  'w-full px-3 py-2.5 rounded-lg border text-sm focus:outline-none focus:border-[var(--red)] placeholder:text-[var(--ink-4)] transition-colors';
const timeInputCls =
  'flex-1 sm:flex-none sm:w-32 px-3 py-1.5 rounded-lg border text-sm dc-mono focus:outline-none focus:border-[var(--red)] transition-colors';
const inputStyle: React.CSSProperties = {
  background: 'var(--bg-2)',
  borderColor: 'var(--line)',
  color: 'var(--ink)',
};

function BusinessContent() {
  const router = useRouter();
  const profile = useQuery(api.services.business.getBusinessProfile);
  const updateProfile = useMutation(api.services.business.updateBusinessProfile);

  const [form, setForm] = useState<BusinessForm>(EMPTY);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (profile && !dirty) {
      setForm({
        storeName: profile.storeName ?? '',
        tagline: profile.tagline ?? '',
        establishedYear: profile.establishedYear ?? '',
        whatsappNumber: profile.whatsappNumber ?? '',
        phone: profile.phone ?? '',
        landline: profile.landline ?? '',
        email: profile.email ?? '',
        addressLine: profile.addressLine ?? '',
        city: profile.city ?? '',
        mapUrl: profile.mapUrl ?? '',
        gcashNumber: profile.gcashNumber ?? '',
        gcashName: profile.gcashName ?? '',
        bankDetails: profile.bankDetails ?? '',
        facebookUrl: profile.facebookUrl ?? '',
        instagramUrl: profile.instagramUrl ?? '',
        tiktokUrl: profile.tiktokUrl ?? '',
        hours:
          profile.hours && profile.hours.length === 7
            ? profile.hours.map((h) => ({ day: h.day, open: h.open, close: h.close, closed: h.closed }))
            : EMPTY.hours,
        hoursNote: profile.hoursNote ?? '',
      });
    }
  }, [profile, dirty]);

  const patch = <K extends keyof BusinessForm>(key: K, value: BusinessForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
    setStatus(null);
  };

  const patchHours = (index: number, changes: Partial<HoursRow>) => {
    setForm((prev) => ({
      ...prev,
      hours: prev.hours.map((h, i) => (i === index ? { ...h, ...changes } : h)),
    }));
    setDirty(true);
    setStatus(null);
  };

  const waDigits = form.whatsappNumber.replace(/\D/g, '');
  const waValid = waDigits.length >= 10 && waDigits.length <= 15;
  const isLoading = profile === undefined;

  const handleSave = async () => {
    setSaving(true);
    setStatus(null);
    try {
      if (!form.storeName.trim()) throw new Error('Store name is required');
      await updateProfile({
        storeName: form.storeName,
        tagline: form.tagline,
        establishedYear: form.establishedYear,
        whatsappNumber: waDigits,
        phone: form.phone,
        landline: form.landline,
        email: form.email,
        addressLine: form.addressLine,
        city: form.city,
        mapUrl: form.mapUrl.trim(),
        gcashNumber: form.gcashNumber,
        gcashName: form.gcashName,
        bankDetails: form.bankDetails,
        facebookUrl: form.facebookUrl.trim(),
        instagramUrl: form.instagramUrl.trim(),
        tiktokUrl: form.tiktokUrl.trim(),
        hours: form.hours,
        hoursNote: form.hoursNote,
      });
      setForm((prev) => ({ ...prev, whatsappNumber: waDigits }));
      setDirty(false);
      setStatus({ kind: 'success', message: 'Business details saved. The website now shows these details.' });
    } catch (e) {
      setStatus({ kind: 'error', message: e instanceof Error ? e.message : 'Failed to save business details' });
    } finally {
      setSaving(false);
    }
  };

  const saveButton = (
    <button
      onClick={handleSave}
      disabled={saving || isLoading || (!dirty && profile?.isConfigured !== false)}
      className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold border transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
      style={{ background: 'var(--red)', borderColor: 'var(--red-deep)', color: 'oklch(0.99 0 0)' }}
    >
      {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
      {saving ? 'Saving…' : 'Save'}
    </button>
  );

  return (
    <div className="min-h-screen pb-24 sm:pb-6" style={{ background: 'var(--bg)', color: 'var(--ink)' }}>
      {/* Header */}
      <div
        className="sticky top-0 z-50 backdrop-blur-sm border-b safe-area-top"
        style={{ background: 'color-mix(in oklch, var(--bg) 88%, transparent)', borderColor: 'var(--line)' }}
      >
        <div className="px-3 sm:px-6 py-3 sm:py-4 max-w-4xl mx-auto flex items-center justify-between gap-3">
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
              <p className="label-eyebrow truncate">Settings · storefront</p>
              <h1 className="display text-lg sm:text-2xl truncate">Business Details</h1>
            </div>
          </div>
          {dirty && !saving && (
            <span className="hidden sm:inline text-xs" style={{ color: 'var(--ink-4)' }}>
              Unsaved changes
            </span>
          )}
          {saveButton}
        </div>
      </div>

      <div className="px-3 sm:px-6 py-4 sm:py-6 max-w-4xl mx-auto space-y-4">
        {isLoading ? (
          <div className="text-center py-16 text-sm" style={{ color: 'var(--ink-4)' }}>
            <RefreshCw className="w-6 h-6 mx-auto mb-3 animate-spin" />
            Loading business details…
          </div>
        ) : (
          <>
            {!profile.isConfigured && (
              <div
                className="flex items-start gap-3 p-3 sm:p-4 rounded-[12px] border"
                style={{ background: 'var(--gold-wash)', borderColor: 'var(--gold)' }}
              >
                <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--gold)' }} />
                <p className="text-sm leading-relaxed" style={{ color: 'var(--ink)' }}>
                  These details haven&apos;t been saved yet — the website is hiding contact info until you save
                  real details.
                </p>
              </div>
            )}

            <StatusMessage status={status} />

            {/* Store */}
            <Section icon={Store} title="Store" subtitle="How your shop is named on the website">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Store name *">
                  <input
                    value={form.storeName}
                    onChange={(e) => patch('storeName', e.target.value)}
                    maxLength={80}
                    placeholder="Dragon's Cave"
                    className={inputCls}
                    style={inputStyle}
                  />
                </Field>
                <Field label="Established year">
                  <input
                    value={form.establishedYear}
                    onChange={(e) => patch('establishedYear', e.target.value.replace(/\D/g, '').slice(0, 4))}
                    inputMode="numeric"
                    placeholder="2015"
                    className={inputCls}
                    style={inputStyle}
                  />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Tagline">
                    <input
                      value={form.tagline}
                      onChange={(e) => patch('tagline', e.target.value)}
                      maxLength={120}
                      placeholder="Home of Premium Arowanas"
                      className={inputCls}
                      style={inputStyle}
                    />
                  </Field>
                </div>
              </div>
            </Section>

            {/* Contact */}
            <Section icon={MessageCircle} title="Contact" subtitle="Used by the WhatsApp, call and email buttons">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <Field label="WhatsApp number">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        value={form.whatsappNumber}
                        onChange={(e) => patch('whatsappNumber', e.target.value)}
                        inputMode="tel"
                        placeholder="639171234567"
                        className={inputCls}
                        style={inputStyle}
                      />
                      <a
                        href={waValid ? `https://wa.me/${waDigits}` : undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-disabled={!waValid}
                        onClick={(e) => {
                          if (!waValid) e.preventDefault();
                        }}
                        className={`inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border text-xs font-semibold whitespace-nowrap ${
                          waValid ? 'hover:opacity-90' : 'opacity-50 cursor-not-allowed'
                        }`}
                        style={{ background: 'var(--jade-wash)', borderColor: 'var(--jade)', color: 'var(--jade)' }}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Test link
                      </a>
                    </div>
                  </Field>
                  <p className="text-[11px] mt-1.5 leading-relaxed" style={{ color: 'var(--ink-4)' }}>
                    International format, digits only: country code + number without the leading 0 (e.g.{' '}
                    <span className="dc-mono">639171234567</span>). Spaces, dashes and + are removed when you save.
                  </p>
                  {waDigits.startsWith('0') && (
                    <p className="text-[11px] mt-1" style={{ color: 'var(--gold)' }}>
                      Starts with 0 — replace the leading 0 with 63 for a Philippine number.
                    </p>
                  )}
                  {waDigits.length > 0 && !waValid && !waDigits.startsWith('0') && (
                    <p className="text-[11px] mt-1" style={{ color: 'var(--red-hi)' }}>
                      Must be 10–15 digits ({waDigits.length} entered).
                    </p>
                  )}
                </div>
                <Field label="Mobile / phone">
                  <input
                    value={form.phone}
                    onChange={(e) => patch('phone', e.target.value)}
                    inputMode="tel"
                    placeholder="+63 917 123 4567"
                    className={inputCls}
                    style={inputStyle}
                  />
                </Field>
                <Field label="Landline">
                  <input
                    value={form.landline}
                    onChange={(e) => patch('landline', e.target.value)}
                    inputMode="tel"
                    placeholder="(02) 8123 4567"
                    className={inputCls}
                    style={inputStyle}
                  />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Email">
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => patch('email', e.target.value)}
                      placeholder="hello@yourstore.ph"
                      className={inputCls}
                      style={inputStyle}
                    />
                  </Field>
                </div>
              </div>
            </Section>

            {/* Location */}
            <Section icon={MapPin} title="Location" subtitle="Where customers can visit the gallery">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Address line">
                  <input
                    value={form.addressLine}
                    onChange={(e) => patch('addressLine', e.target.value)}
                    maxLength={200}
                    placeholder="123 Example St., Brgy. Sample"
                    className={inputCls}
                    style={inputStyle}
                  />
                </Field>
                <Field label="City">
                  <input
                    value={form.city}
                    onChange={(e) => patch('city', e.target.value)}
                    maxLength={80}
                    placeholder="Quezon City"
                    className={inputCls}
                    style={inputStyle}
                  />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Google Maps link">
                    <input
                      type="url"
                      value={form.mapUrl}
                      onChange={(e) => patch('mapUrl', e.target.value)}
                      placeholder="https://maps.app.goo.gl/..."
                      className={inputCls}
                      style={inputStyle}
                    />
                  </Field>
                  <UrlHint value={form.mapUrl} />
                </div>
              </div>
            </Section>

            {/* Opening hours */}
            <Section icon={Clock} title="Opening hours" subtitle="Shown on the contact section of the website">
              <div className="flex flex-col divide-y" style={{ borderColor: 'var(--line-soft)' }}>
                {form.hours.map((h, i) => {
                  const invalid = !h.closed && !(h.open && h.close && h.open < h.close);
                  return (
                    <div
                      key={h.day}
                      className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2.5"
                      style={{ borderColor: 'var(--line-soft)' }}
                    >
                      <span className="w-24 text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                        {h.day}
                      </span>
                      <label className="inline-flex items-center gap-2 text-xs cursor-pointer" style={{ color: 'var(--ink-3)' }}>
                        <Switch checked={h.closed} onChange={(v) => patchHours(i, { closed: v })} label={`${h.day} closed`} />
                        Closed
                      </label>
                      {h.closed ? (
                        <span className="text-xs sm:ml-auto" style={{ color: 'var(--ink-4)' }}>
                          Closed all day
                        </span>
                      ) : (
                        <div className="flex items-center gap-2 w-full sm:w-auto sm:ml-auto">
                          <input
                            type="time"
                            value={h.open}
                            onChange={(e) => patchHours(i, { open: e.target.value })}
                            aria-label={`${h.day} opening time`}
                            className={timeInputCls}
                            style={{ ...inputStyle, borderColor: invalid ? 'var(--red)' : 'var(--line)' }}
                          />
                          <span className="text-xs" style={{ color: 'var(--ink-4)' }}>
                            to
                          </span>
                          <input
                            type="time"
                            value={h.close}
                            onChange={(e) => patchHours(i, { close: e.target.value })}
                            aria-label={`${h.day} closing time`}
                            className={timeInputCls}
                            style={{ ...inputStyle, borderColor: invalid ? 'var(--red)' : 'var(--line)' }}
                          />
                        </div>
                      )}
                      {invalid && (
                        <p className="w-full text-[11px] sm:text-right" style={{ color: 'var(--red-hi)' }}>
                          Opening time must be before closing time.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="mt-3">
                <Field label="Hours note">
                  <input
                    value={form.hoursNote}
                    onChange={(e) => patch('hoursNote', e.target.value)}
                    maxLength={200}
                    placeholder="Viewings by appointment outside these hours"
                    className={inputCls}
                    style={inputStyle}
                  />
                </Field>
              </div>
            </Section>

            {/* Payments */}
            <Section icon={CreditCard} title="Payments" subtitle="Shown to customers when they pay for orders">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="GCash number">
                  <input
                    value={form.gcashNumber}
                    onChange={(e) => patch('gcashNumber', e.target.value)}
                    inputMode="tel"
                    placeholder="0917 123 4567"
                    className={inputCls}
                    style={inputStyle}
                  />
                </Field>
                <Field label="GCash account name">
                  <input
                    value={form.gcashName}
                    onChange={(e) => patch('gcashName', e.target.value)}
                    maxLength={80}
                    placeholder="Juan D."
                    className={inputCls}
                    style={inputStyle}
                  />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Bank details">
                    <textarea
                      value={form.bankDetails}
                      onChange={(e) => patch('bankDetails', e.target.value)}
                      maxLength={500}
                      rows={3}
                      placeholder={'BDO · Account name · 0000 0000 0000'}
                      className={`${inputCls} resize-y`}
                      style={inputStyle}
                    />
                  </Field>
                </div>
              </div>
            </Section>

            {/* Social */}
            <Section icon={Share2} title="Social links" subtitle="Full links starting with https://">
              <div className="grid grid-cols-1 gap-3">
                {(
                  [
                    { key: 'facebookUrl', label: 'Facebook', placeholder: 'https://facebook.com/yourpage' },
                    { key: 'instagramUrl', label: 'Instagram', placeholder: 'https://instagram.com/yourhandle' },
                    { key: 'tiktokUrl', label: 'TikTok', placeholder: 'https://tiktok.com/@yourhandle' },
                  ] as const
                ).map((s) => (
                  <div key={s.key}>
                    <Field label={s.label}>
                      <input
                        type="url"
                        value={form[s.key]}
                        onChange={(e) => patch(s.key, e.target.value)}
                        placeholder={s.placeholder}
                        className={inputCls}
                        style={inputStyle}
                      />
                    </Field>
                    <UrlHint value={form[s.key]} />
                  </div>
                ))}
              </div>
            </Section>

            <StatusMessage status={status} />

            <div className="flex justify-end">{saveButton}</div>
          </>
        )}
      </div>

      <BottomNavbar />
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className="rounded-[14px] border p-4 sm:p-5"
      style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}
    >
      <div className="flex items-center gap-3 mb-4">
        <span
          className="w-9 h-9 rounded-[10px] inline-flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--red-wash)' }}
        >
          <Icon className="w-4 h-4" style={{ color: 'var(--red-hi)' }} />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm sm:text-base font-bold" style={{ color: 'var(--ink)' }}>
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs" style={{ color: 'var(--ink-3)' }}>
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {children}
    </section>
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

function UrlHint({ value }: { value: string }) {
  const v = value.trim();
  if (!v || /^https:\/\//i.test(v)) return null;
  return (
    <p className="text-[11px] mt-1" style={{ color: 'var(--red-hi)' }}>
      Links must start with https://
    </p>
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
      className="relative w-9 h-5 rounded-full transition-colors flex-shrink-0"
      style={{ background: checked ? 'var(--red)' : 'var(--surface-hi)' }}
    >
      <span
        className={`absolute top-0.5 ${checked ? 'left-[18px]' : 'left-0.5'} w-4 h-4 rounded-full transition-all`}
        style={{ background: 'oklch(0.99 0 0)', boxShadow: '0 1px 2px oklch(0 0 0 / 0.3)' }}
      />
    </button>
  );
}

function StatusMessage({ status }: { status: { kind: 'success' | 'error'; message: string } | null }) {
  if (!status) return null;
  const ok = status.kind === 'success';
  const Icon = ok ? CheckCircle : XCircle;
  return (
    <div
      role={ok ? 'status' : 'alert'}
      className="flex items-start gap-2.5 p-3 rounded-[12px] border text-sm"
      style={{
        background: ok ? 'var(--jade-wash)' : 'var(--red-wash)',
        borderColor: ok ? 'var(--jade)' : 'var(--red)',
        color: 'var(--ink)',
      }}
    >
      <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: ok ? 'var(--jade)' : 'var(--red-hi)' }} />
      <span>{status.message}</span>
    </div>
  );
}

export default function BusinessDetailsPage() {
  return (
    <SafeAreaProvider applySafeArea={false}>
      <BusinessContent />
    </SafeAreaProvider>
  );
}
