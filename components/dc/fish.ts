/**
 * Shared helpers for wiring the Dragon's Cave storefront to real Convex data.
 *
 * The DB keeps all live fish in one "Fish" category. The design splits them into
 *   • Catalog  — the arowana bloodlines ("the dragons")
 *   • The Cave — everything else ("the wider water": oscars, discus, rays, oddballs)
 * so we classify by name.
 */

export type DcProduct = {
  _id: string;
  name: string;
  price: number;
  stock: number;
  image?: string;
  images?: string[];
  grade?: string;
  tankNumber?: string;
  sku?: string | number;
  categoryName?: string;
  isActive?: boolean;
  createdAt?: number;
  description?: string;
  certificate?: string;
};

export const fmtPeso = (n: number) =>
  '₱' + Math.round(n || 0).toLocaleString('en-PH');

export const isFish = (p: { categoryName?: string }) => (p.categoryName || '') === 'Fish';

// Tokens that mark a fish as NOT an arowana even if the name also has "SR"/"Super Red"
// (e.g. "SUPER RED OSCAR" is an oscar). Checked first.
const CAVE_RE =
  /\b(OSCAR|DISCUS|STINGRAY|STINGRAYS|RAY|PARROT|GAR|ARAPAIMA|LOACH|GIBBICEPS|SEVERUM|ANGELFISH|PIGEON|TINFOIL|BICHIR|ENDLICHERI|PUFFER|KNIFE|SNAKEHEAD|DATNOID|FRONTISA|FRONTOSA|KELBERI|HECKELI|TIGER|FLOWERHORN|HOOK|DEVIL|LAMAX|OMRON|MELON|CHECKERBOARD)\b/;

const ARO_RE =
  /\b(AROWANA|SR|SUPER ?RED|CHILI ?RED|CROSSBACK|XB|RTG|RFT|24K|BANJAR|GHXB|BBXB|MGXB|SHB|SHBRTG|HB|RONIN|SAMURAI|DARMO|SIANLON|WAF|RR|SILVER|PEARL|JARDINI|CLASSIC)\b/;

export const isArowana = (name: string) => {
  const u = (name || '').toUpperCase();
  return ARO_RE.test(u) && !CAVE_RE.test(u);
};

/** Catalog bloodline bucket for an arowana name. */
export function bloodlineOf(name: string): string {
  const u = (name || '').toUpperCase();
  if (/\b24K\b/.test(u)) return '24K Golden';
  if (/\b(RTG|RFT|RED ?TAIL)\b/.test(u)) return 'Red Tail Gold';
  if (/\b(CROSSBACK|XB|GHXB|BBXB|MGXB)\b/.test(u)) return 'Crossback Gold';
  if (/\bSILVER\b/.test(u)) return 'Silver';
  if (/\b(PEARL|JARDINI)\b/.test(u)) return 'Jardini';
  if (/\bBANJAR\b/.test(u)) return 'Banjar';
  if (/\b(SHB|HB)\b/.test(u)) return 'Highback';
  return 'Asian Red';
}

/** Cave family bucket for a non-arowana name. */
export function familyOf(name: string): string {
  const u = (name || '').toUpperCase();
  if (/\bDISCUS\b/.test(u)) return 'Discus';
  if (/\b(STINGRAY|STINGRAYS|RAY)\b/.test(u)) return 'Stingray';
  if (/\b(GAR|ARAPAIMA|SNAKEHEAD|DATNOID|TIGER)\b/.test(u)) return 'Predator';
  if (/\b(BICHIR|ENDLICHERI|GIBBICEPS|LOACH|TINFOIL|KNIFE|PUFFER|HOOK)\b/.test(u)) return 'Oddball';
  if (/\b(OSCAR|PARROT|SEVERUM|ANGELFISH|FLOWERHORN|KELBERI|FRONTISA|FRONTOSA|HECKELI|DEVIL|PIGEON|MELON|CHECKERBOARD)\b/.test(u)) return 'Cichlid';
  return 'Exotic';
}

const GRADE_ORDER: Record<string, number> = { S: 0, AAA: 1, AA: 2, A: 3 };
export const gradeRank = (g?: string) => (g && g in GRADE_ORDER ? GRADE_ORDER[g] : 9);

/** Deterministic tint for a silhouette fallback when a product has no image. */
export function tintFor(id: string): string {
  const tints = [
    'oklch(0.66 0.16 45)', 'oklch(0.63 0.14 52)', 'oklch(0.60 0.10 205)',
    'oklch(0.68 0.13 72)', 'oklch(0.56 0.09 235)', 'oklch(0.58 0.06 132)',
    'oklch(0.70 0.11 108)', 'oklch(0.58 0.03 262)',
  ];
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return tints[h % tints.length];
}

/** Build filter chips (All + present buckets) from a set of products. */
export function buildChips(products: DcProduct[], keyOf: (p: DcProduct) => string) {
  const seen = new Set<string>();
  for (const p of products) seen.add(keyOf(p));
  return ['all', ...Array.from(seen)];
}

const WA = '639172345678';
export function waEnquire(name: string, extra = '') {
  const text = "Hi Dragon's Cave — I'd like to enquire about " + name + (extra ? ' (' + extra + ')' : '') + '. Is it still available?';
  return 'https://wa.me/' + WA + '?text=' + encodeURIComponent(text);
}
