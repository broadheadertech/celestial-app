'use client';

/**
 * Storefront access to Admin → Business Details (convex/services/business.ts).
 * Every contact detail on the public site comes from here — never hardcode a phone
 * number, address or hours in a page. Missing values come back empty, and pages hide
 * the corresponding line/button instead of showing a placeholder.
 */

import { useQuery } from './useQuery';
import { api } from '@/convex/_generated/api';
import { messengerUrl } from './links';

export type BusinessHours = { day: string; open: string; close: string; closed: boolean };

const SHORT_DAY: Record<string, string> = {
  Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun',
};

/** "10:00" → "10:00" (kept 24h to match the site's mono styling). */
const t = (s: string) => s;

/** Groups consecutive days with identical hours: [{ days: "Tue – Fri", hours: "10:00 – 18:00" }]. */
export function groupHours(hours: BusinessHours[]): { days: string; hours: string; closed: boolean }[] {
  const out: { from: string; to: string; key: string; closed: boolean; hours: string }[] = [];
  for (const h of hours) {
    const key = h.closed ? 'closed' : `${h.open}-${h.close}`;
    const last = out[out.length - 1];
    if (last && last.key === key) {
      last.to = h.day;
    } else {
      out.push({ from: h.day, to: h.day, key, closed: h.closed, hours: h.closed ? 'Closed' : `${t(h.open)} – ${t(h.close)}` });
    }
  }
  return out.map((g) => ({
    days: g.from === g.to ? g.from : `${SHORT_DAY[g.from] ?? g.from} – ${SHORT_DAY[g.to] ?? g.to}`,
    hours: g.hours,
    closed: g.closed,
  }));
}

/** Compact two-line summary for footers/tiles, e.g. ["Tue–Sat", "10:00–18:00"]. */
export function hoursSummary(hours: BusinessHours[]): [string, string] {
  const open = hours.filter((h) => !h.closed);
  if (open.length === 0) return ['By appointment', ''];
  const same = open.every((h) => h.open === open[0].open && h.close === open[0].close);
  const groups = groupHours(hours).filter((g) => !g.closed);
  const days = groups.length === 1 ? groups[0].days.replace(/ – /g, '–') : `${open.length} days a week`;
  return [days, same ? `${open[0].open}–${open[0].close}` : 'See hours'];
}

const enquiryText = (storeName: string, name: string, extra: string) =>
  `Hi ${storeName} — I'd like to enquire about ${name}${extra ? ` (${extra})` : ''}. Is it still available?`;

export function useBusiness() {
  const profile = useQuery(api.services.business.getBusinessProfile, {});

  const whatsapp = profile?.whatsappNumber || '';
  const wa = (text: string) => (whatsapp ? `https://wa.me/${whatsapp}?text=${encodeURIComponent(text)}` : null);
  const storeName = profile?.storeName || "Dragon's Cave";

  return {
    loaded: profile !== undefined,
    profile,
    storeName,
    city: profile?.city || '',
    address: profile?.addressLine || '',
    phone: profile?.phone || '',
    landline: profile?.landline || '',
    email: profile?.email || '',
    establishedYear: profile?.establishedYear || '',
    hours: (profile?.hours ?? []) as BusinessHours[],
    hoursNote: profile?.hoursNote || '',
    gcashNumber: profile?.gcashNumber || '',
    gcashName: profile?.gcashName || '',
    bankDetails: profile?.bankDetails || '',
    /** Google Maps link: the admin's link, else a search for the address, else null. */
    mapUrl:
      profile?.mapUrl ||
      (profile?.addressLine
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${profile.addressLine} ${profile.city}`)}`
        : null),
    /** Messenger chat with the Facebook page, or null when no usable Facebook link is set. */
    messenger: messengerUrl(profile?.facebookUrl),
    /** wa.me link with a prefilled message, or null when no WhatsApp number is set. */
    wa,
    /** Enquiry message about a specific product (prefilled on WhatsApp, copied for Messenger). */
    enquiryText: (name: string, extra = '') => enquiryText(storeName, name, extra),
    /** Enquiry about a specific product; falls back to the contact page. */
    enquireHref: (name: string, extra = '') => wa(enquiryText(storeName, name, extra)) ?? '/contact',
    generalHref:
      wa(`Hi ${storeName} — I'd like to enquire about your arowana.`) ?? '/contact',
  };
}
