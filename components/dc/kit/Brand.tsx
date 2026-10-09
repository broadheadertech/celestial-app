/* eslint-disable @next/next/no-img-element -- static logo in /public */
import Link from 'next/link';
import type { ReactNode } from 'react';

/**
 * The store logo in place of the reference's red 龍 badge. `onDark` swaps to the variant with the
 * white "C" so it reads on black / red backgrounds.
 */
export function BrandMark({ onDark = false, className = '' }: { onDark?: boolean; className?: string }) {
  return (
    <img
      src={onDark ? '/img/dc-logo-dark.png' : '/img/dc-logo-light.png'}
      alt=""
      aria-hidden="true"
      width={46}
      height={36}
      className={`dk-brand-mark ${className}`.trim()}
      draggable={false}
    />
  );
}

/** Logo + store name + optional sub-line ("Est. 20 · Malolos City"), linking home. */
export default function Brand({
  name,
  sub,
  onDark = false,
  href = '/',
  className = 'dk-brand',
  label,
  children,
}: {
  name: string;
  sub?: ReactNode;
  onDark?: boolean;
  href?: string;
  className?: string;
  label?: string;
  children?: ReactNode;
}) {
  return (
    <Link className={className} href={href} aria-label={label ?? `${name} home`}>
      <BrandMark onDark={onDark} />
      <span style={{ minWidth: 0 }}>
        <span className="dk-brand-name">{name}</span>
        {sub ? <span className="dk-brand-sub">{sub}</span> : null}
      </span>
      {children}
    </Link>
  );
}
