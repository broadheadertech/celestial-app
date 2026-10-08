'use client';

import Placeholder from './Placeholder';
import { HeartIcon } from './icons';

const peso = (n: number) => '₱' + Math.round(n || 0).toLocaleString('en-PH');

/** Red "N left" / black "Sold out" tag pinned to a product photo. */
export function StockBadge({ stock }: { stock: number }) {
  return <span className={`dk-stock${stock === 0 ? ' out' : ''}`}>{stock === 0 ? 'Sold out' : `${stock} left`}</span>;
}

/**
 * Member-app product card (Browse, Home): photo with stock badge and wishlist heart, category, name (two lines),
 * price, then one full-width action — "Add to cart" (chip button with a +), a quantity stepper once it's in the
 * cart, or a plain "Sold Out" pill.
 */
export default function MemberProductCard({
  name,
  image,
  price,
  originalPrice,
  stock,
  category,
  cartQty,
  onOpen,
  onAdd,
  onQty,
  saved,
  onToggleSave,
}: {
  name: string;
  image?: string;
  price: number;
  originalPrice?: number;
  stock: number;
  category?: string;
  /** Quantity already in the cart (shows the stepper instead of "Add to cart"). */
  cartQty?: number;
  onOpen: () => void;
  onAdd: () => void;
  onQty: (change: number) => void;
  /** Wishlist state; omit to hide the heart (guests). */
  saved?: boolean;
  onToggleSave?: () => void;
}) {
  const hasDiscount = !!originalPrice && originalPrice > price;
  return (
    <article className="dk-pcard">
      <div className="dk-pc-img">
        <button type="button" onClick={onOpen} aria-label={`View ${name}`}>
          <Placeholder src={image} alt="" contain />
        </button>
        <StockBadge stock={stock} />
        {onToggleSave && (
          <button type="button" className="dk-heart" aria-pressed={!!saved} aria-label={`Save ${name}`} onClick={onToggleSave}>
            <HeartIcon />
          </button>
        )}
      </div>
      <div className="dk-pc-body">
        {category && <p className="dk-pc-cat">{category}</p>}
        <h3><button type="button" className="dk-pc-name" onClick={onOpen} title={name}>{name}</button></h3>
        <p className="dk-pc-price">
          {peso(price)}
          {hasDiscount && <s>{peso(originalPrice!)}</s>}
        </p>
        <div className="dk-pc-action">
          {cartQty ? (
            <div className="dk-pc-stepper" role="group" aria-label={`${name} in cart`}>
              <button type="button" onClick={() => onQty(-1)} aria-label={`Decrease ${name}`}>−</button>
              <span aria-live="polite">{cartQty} in cart</span>
              <button type="button" className="plus" onClick={() => onQty(1)} disabled={cartQty >= stock} aria-label={`Increase ${name}`}>+</button>
            </div>
          ) : stock === 0 ? (
            <span className="dk-pc-soldout">Sold Out</span>
          ) : (
            <button type="button" className="dk-btn dk-btn-red dk-pc-add" onClick={onAdd}>Add to cart</button>
          )}
        </div>
      </div>
    </article>
  );
}
