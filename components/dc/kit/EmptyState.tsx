import type { ReactNode } from 'react';
import { AlertIcon } from './icons';

/**
 * Empty / error state: red-stroke icon in a pale red circle, bold heading, one or two lines of grey
 * text, then up to two actions (red primary + outline secondary) passed as `actions`.
 */
export default function EmptyState({
  icon,
  title,
  children,
  actions,
  className = '',
  role,
  as: Heading = 'h3',
}: {
  icon?: ReactNode;
  title: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  className?: string;
  /** e.g. "alert" for error states, "status" for loading. */
  role?: string;
  /** Heading level — use "h1" when the empty state is the whole page. */
  as?: 'h1' | 'h2' | 'h3';
}) {
  return (
    <div className={`dk-empty-state ${className}`.trim()} role={role}>
      <span className="dk-empty-icon" aria-hidden="true">{icon ?? <AlertIcon />}</span>
      <Heading>{title}</Heading>
      {children ? <p>{children}</p> : null}
      {actions ? <div className="dk-actions">{actions}</div> : null}
    </div>
  );
}
