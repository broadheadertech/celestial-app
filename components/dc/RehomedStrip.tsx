'use client';

import Link from 'next/link';
import { api } from '@/convex/_generated/api';
import { useQuery } from './useQuery';
import { useBusiness } from './business';
import { bloodlineOf, familyOf, isArowana, kindName, type DcProduct } from './fish';
import Placeholder from './kit/Placeholder';

type Rehomed = DcProduct & { rehomedStatus: 'reserved' | 'sold'; rehomedAt: number };

/**
 * "Recently rehomed" — fish that recently sold or are reserved (see products.getRehomedSpecimens),
 * shown under the Catalog (arowana) or Cave (everything else) grid. Renders nothing when empty.
 */
export default function RehomedStrip({ arowana }: { arowana: boolean }) {
  const all = useQuery(api.services.products.getRehomedSpecimens, { limit: 24 }) as Rehomed[] | undefined;
  const biz = useBusiness();
  const items = (all ?? []).filter((p) => isArowana(kindName(p)) === arowana).slice(0, 8);
  if (items.length === 0) return null;

  const similarHref = biz.wa(`Hi ${biz.storeName} — I saw your recently rehomed ${arowana ? 'arowana' : 'fish'}. Do you have anything similar available?`) ?? '/contact';

  return (
    <section className="dk dk-rehomed" aria-labelledby="rehomed-title">
      <div className="dk-wrap">
        <div className="dk-bl-head">
          <div>
            <p className="dk-eyebrow">Recently rehomed</p>
            <h2 className="dk-h2" id="rehomed-title">Already found their keepers.</h2>
          </div>
          <a className="dk-btn dk-btn-outline-dark dk-bl-all" href={similarHref} target={similarHref.startsWith('http') ? '_blank' : undefined} rel="noopener">
            Ask for something similar
          </a>
        </div>
        <div className="dk-sold-grid">
          {items.map((item) => (
            <article key={item._id}>
              <Link href={`/specimen-detail?id=${item._id}`} className="dk-sold-img" style={{ display: 'block' }} aria-label={item.name}>
                <Placeholder src={item.image} alt={item.name} contain />
                <span className="dk-sold-tag">{item.rehomedStatus === 'reserved' ? 'Reserved' : 'Sold'}</span>
              </Link>
              <p className="dk-sold-cat">{arowana ? bloodlineOf(kindName(item)) : familyOf(kindName(item))}</p>
              <h3 className="dk-sold-name">{item.name}</h3>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
