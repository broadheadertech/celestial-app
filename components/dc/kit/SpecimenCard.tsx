import Link from 'next/link';
import type { ReactNode } from 'react';
import Placeholder from './Placeholder';

/**
 * Specimen card from the reference (Home bloodlines + Cave grid): rounded photo with the price in a
 * black corner tag (`tag`) or in a pill sitting in a carved cut-out (`cut`), then category, name and
 * one red arrow link.
 */
export default function SpecimenCard({
  href,
  image,
  name,
  category,
  price,
  priceStyle = 'tag',
  action,
  overlay,
}: {
  href: string;
  image?: string;
  name: string;
  category: string;
  price: string;
  priceStyle?: 'tag' | 'cut';
  action: { href: string; label: string };
  /** Badges drawn over the photo (video, pre-order). */
  overlay?: ReactNode;
}) {
  const external = action.href.startsWith('http');
  return (
    <article className="dk-card">
      <Link href={href} className="dk-card-img" aria-label={name}>
        <Placeholder src={image} alt={name} contain />
        {overlay}
        {priceStyle === 'tag' ? (
          <span className="dk-price-tag">{price}</span>
        ) : (
          <span className="dk-cut"><span className="dk-pill">{price}</span></span>
        )}
      </Link>
      <p className="dk-card-cat">{category}</p>
      <h3><Link href={href} className="dk-card-name">{name}</Link></h3>
      <a className="dk-card-link dk-link-arrow" href={action.href} target={external ? '_blank' : undefined} rel="noopener">
        {action.label}
      </a>
    </article>
  );
}
