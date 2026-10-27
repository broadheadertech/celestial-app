import { describe, expect, it } from 'vitest';
import {
  allProductsList,
  availableOnly,
  catalogList,
  caveList,
  merchList,
  shopList,
} from '@/components/dc/listings';

/**
 * These filters are used twice — by the client listing pages and by the build-time
 * CollectionPage/ItemList structured data — so the thing worth pinning down is that both
 * callers get exactly what a visitor sees on the page.
 */

type P = Parameters<typeof catalogList>[0][number] & { purchaseMode?: string };

const p = (over: Partial<P> & { name: string }): P => ({
  stock: 1,
  isActive: true,
  categoryName: 'Fish',
  ...over,
});

describe('catalogList', () => {
  it('keeps arowana and leaves the rest of the fish to the Cave', () => {
    const items = catalogList([p({ name: 'SUPER RED AROWANA' }), p({ name: 'DISCUS PIGEON' })]);
    expect(items.map((i) => i.name)).toEqual(['SUPER RED AROWANA']);
  });

  it('classifies on the internal name, never the customer-facing one', () => {
    // publicName() can be anything; bloodline/section must come from the inventory name.
    const renamed = p({ name: 'House Special', internalName: 'SHB RTG AROWANA' });
    expect(catalogList([renamed])).toHaveLength(1);
  });

  it('does not treat a SUPER RED OSCAR as an arowana', () => {
    expect(catalogList([p({ name: 'SUPER RED OSCAR' })])).toHaveLength(0);
    expect(caveList([p({ name: 'SUPER RED OSCAR' })])).toHaveLength(1);
  });

  it('excludes non-fish categories', () => {
    expect(catalogList([p({ name: 'AROWANA MUG', categoryName: 'Accessories' })])).toHaveLength(0);
  });

  it('excludes inactive products', () => {
    expect(catalogList([p({ name: 'SUPER RED AROWANA', isActive: false })])).toHaveLength(0);
  });

  it('keeps an out-of-stock arowana that is open for pre-order', () => {
    const incoming = p({ name: 'CHILI RED AROWANA', stock: 0, preorder: { enabled: true, incomingQty: 4 } });
    expect(catalogList([incoming])).toHaveLength(1);
  });

  it('drops an out-of-stock arowana with nothing actually incoming', () => {
    const sold = p({ name: 'CHILI RED AROWANA', stock: 0 });
    const enabledButEmpty = p({ name: '24K AROWANA', stock: 0, preorder: { enabled: true, incomingQty: 0 } });
    expect(catalogList([sold, enabledButEmpty])).toHaveLength(0);
  });
});

describe('caveList', () => {
  it('is the exact complement of catalogList within the fish', () => {
    const fish = [p({ name: 'SUPER RED AROWANA' }), p({ name: 'DISCUS' }), p({ name: 'STINGRAY' })];
    expect(catalogList(fish).length + caveList(fish).length).toBe(fish.length);
  });
});

describe('shopList', () => {
  it('keeps only cart-mode stock that is actually on hand', () => {
    const items = shopList([
      p({ name: 'PELLET FOOD', categoryName: 'Food', purchaseMode: 'cart' }),
      p({ name: 'LIGHT BAR', categoryName: 'Lighting', purchaseMode: 'cart', stock: 0 }),
      p({ name: 'SUPER RED AROWANA', purchaseMode: 'enquire' }),
      p({ name: 'MUG BOX', categoryName: 'Accessories', purchaseMode: 'cart', isActive: false }),
    ]);
    expect(items.map((i) => i.name)).toEqual(['PELLET FOOD']);
  });

  it('excludes products with no purchase mode set, since the page requires cart explicitly', () => {
    expect(shopList([p({ name: 'MYSTERY ITEM', categoryName: 'Food' })])).toHaveLength(0);
  });
});

/**
 * The Shop is now the single product surface — live fish and hard goods together — so these two
 * decide what that page can show.
 */
describe('allProductsList', () => {
  it('keeps live fish and hard goods side by side', () => {
    const items = allProductsList([
      p({ name: 'SUPER RED AROWANA', purchaseMode: 'enquire' }),
      p({ name: 'RETURN PUMP', categoryName: 'Accessories', purchaseMode: 'cart' }),
    ]);
    expect(items).toHaveLength(2);
  });

  it('still excludes anything inactive', () => {
    expect(allProductsList([p({ name: 'OLD STOCK', isActive: false })])).toHaveLength(0);
  });

  it('does not care about stock — the availability filter is a separate choice', () => {
    expect(allProductsList([p({ name: 'SOLD FISH', stock: 0 })])).toHaveLength(1);
  });
});

describe('merchList', () => {
  it('takes only the Merch category, case-insensitively', () => {
    const items = merchList([
      p({ name: 'CAVE TEE', categoryName: 'Merch' }),
      p({ name: 'CAVE MUG', categoryName: 'merch' }),
      p({ name: 'RETURN PUMP', categoryName: 'Accessories' }),
    ]);
    expect(items.map((i) => i.name)).toEqual(['CAVE TEE', 'CAVE MUG']);
  });

  it('does not guess merch from the product name', () => {
    // "STRIP STICKER 5FT" is a tank measuring strip, not merchandise — only the category decides.
    expect(merchList([p({ name: 'STRIP STICKER 5FT', categoryName: 'Accessories' })])).toHaveLength(0);
    expect(merchList([p({ name: 'MERCH TSHIRT', categoryName: 'Accessories' })])).toHaveLength(0);
  });

  it('excludes inactive merch', () => {
    expect(merchList([p({ name: 'OLD TEE', categoryName: 'Merch', isActive: false })])).toHaveLength(0);
  });

  it('keeps sold-out merch, so the lookbook still shows the range', () => {
    expect(merchList([p({ name: 'CAVE TEE', categoryName: 'Merch', stock: 0 })])).toHaveLength(1);
  });
});

describe('availableOnly', () => {
  it('keeps what is in stock or genuinely incoming, drops what is gone', () => {
    const items = availableOnly([
      p({ name: 'IN STOCK', stock: 2 }),
      p({ name: 'INCOMING', stock: 0, preorder: { enabled: true, incomingQty: 5 } }),
      p({ name: 'SOLD', stock: 0 }),
      p({ name: 'PREORDER WITH NOTHING COMING', stock: 0, preorder: { enabled: true, incomingQty: 0 } }),
    ]);
    expect(items.map((i) => i.name)).toEqual(['IN STOCK', 'INCOMING']);
  });
});
