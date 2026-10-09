'use client';

import type { ReactNode } from 'react';
import { useBusiness } from '../business';
import Brand from './Brand';
import { BackIcon } from './icons';

/**
 * Split auth layout from the reference: the red gradient brand panel (with the carved corner) on the
 * left, the white form card overlapping it. Stacks into panel-then-card below 1260px.
 */
export default function AuthShell({
  title,
  tagline,
  onBack,
  register = false,
  card,
  below,
}: {
  title: ReactNode;
  tagline: ReactNode;
  onBack: () => void;
  register?: boolean;
  card: ReactNode;
  below?: ReactNode;
}) {
  const biz = useBusiness();
  const subline = [biz.establishedYear && `Est. ${biz.establishedYear}`, biz.city].filter(Boolean).join(' · ');
  return (
    <div className="dk dk-auth">
      <div className="dk-auth-frame">
        <div className={`dk-auth-panel${register ? ' reg' : ''}`}>
          <Brand name={biz.storeName} sub={subline} onDark className="dk-brand dk-auth-brand" />
          <div className="dk-auth-title">
            <h1>{title}</h1>
            <p>{tagline}</p>
          </div>
          <button type="button" className="dk-auth-back" onClick={onBack}>
            <BackIcon />Back to site
          </button>
        </div>

        <div className={`dk-auth-side${register ? ' reg' : ''}`}>
          <div className="dk-auth-card">{card}</div>
          {below}
        </div>
      </div>
    </div>
  );
}
