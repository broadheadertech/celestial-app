/** Pure link helpers for the storefront (no React/Convex imports, so they are unit-testable). */

/**
 * m.me link for the Facebook page in Business Details, or null when it can't be derived.
 * Handles facebook.com/<page>, profile.php?id=<id> and /people/<name>/<id> links.
 */
export function messengerUrl(facebookUrl: string | undefined): string | null {
  if (!facebookUrl) return null;
  let url: URL;
  try {
    url = new URL(facebookUrl.trim());
  } catch {
    return null;
  }
  if (!/(^|\.)(facebook|fb)\.com$/i.test(url.hostname)) return null;
  const parts = url.pathname.split('/').filter(Boolean);
  if (parts[0] === 'profile.php') {
    const id = url.searchParams.get('id');
    return id && /^\d+$/.test(id) ? `https://m.me/${id}` : null;
  }
  if (parts[0] === 'people') {
    const id = parts.find((p) => /^\d{6,}$/.test(p));
    return id ? `https://m.me/${id}` : null;
  }
  const page = parts[0] === 'pages' ? parts.find((p) => /^\d{6,}$/.test(p)) : parts[0];
  return page && /^[\w.-]+$/.test(page) ? `https://m.me/${page}` : null;
}

export const SITE_URL = 'https://dc.broadheader.com';

/** Public, shareable link for a product — always the live site, even inside the Android app. */
export function productUrl(product: { _id: string; slug?: string }): string {
  return product.slug ? `${SITE_URL}/specimen/${product.slug}` : `${SITE_URL}/specimen-detail?id=${product._id}`;
}

/** Share targets for browsers without the native share sheet. */
export function shareLinks(url: string, text: string) {
  return {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`,
  };
}
