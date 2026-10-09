/**
 * Duotone step icons (Visit / Home service "how it works"): a red line drawing over a soft pale-red
 * shade, offset slightly so it reads as a light vector illustration rather than a flat glyph.
 * Brand palette only: --dk-red for the line, --dk-red-pale for the shade.
 */

import type { ReactNode } from 'react';

type P = { size?: number };

const LINE = { fill: 'none', stroke: 'var(--dk-red)', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
const SHADE = { fill: 'var(--dk-red-pale)' } as const;

const Svg = ({ size = 36, children }: P & { children: ReactNode }) => (
  <svg width={size} height={size} viewBox="0 0 36 36" aria-hidden="true" focusable="false">
    {children}
  </svg>
);

export const StepCalendarIcon = ({ size }: P) => (
  <Svg size={size}>
    <rect x="8" y="10" width="24" height="22" rx="4" {...SHADE} />
    <rect x="5" y="7" width="24" height="23" rx="4" {...LINE} />
    <path d="M5 14h24M11 4v6M23 4v6" {...LINE} />
    <path d="M11 20h3M17 20h3M11 25h3" {...LINE} />
  </Svg>
);

export const StepPhoneIcon = ({ size }: P) => (
  <Svg size={size}>
    <circle cx="22" cy="21" r="11" {...SHADE} />
    <path d="M29 23.6v3.6a2.4 2.4 0 0 1-2.6 2.4A23.8 23.8 0 0 1 6.4 9.6 2.4 2.4 0 0 1 8.8 7h3.6a2.4 2.4 0 0 1 2.4 2c.15 1.1.45 2.2.85 3.2a2.4 2.4 0 0 1-.55 2.5l-1.5 1.5a19 19 0 0 0 7.2 7.2l1.5-1.5a2.4 2.4 0 0 1 2.5-.55c1 .4 2.1.7 3.2.85a2.4 2.4 0 0 1 2 2.4z" {...LINE} />
  </Svg>
);

export const StepHouseIcon = ({ size }: P) => (
  <Svg size={size}>
    <path d="M10 17l11-8 11 8v15H10z" {...SHADE} />
    <path d="M5 15L17 6l12 9" {...LINE} />
    <path d="M8 13v16h18V13" {...LINE} />
    <path d="M14 29v-7h6v7" {...LINE} />
  </Svg>
);

export const StepPlanIcon = ({ size }: P) => (
  <Svg size={size}>
    <rect x="10" y="8" width="21" height="25" rx="3.5" {...SHADE} />
    <rect x="6" y="4" width="21" height="26" rx="3.5" {...LINE} />
    <path d="M11 11h11M11 16h11M11 21h6" {...LINE} />
    <path d="M18.5 25l2.2 2.2 4.3-4.6" {...LINE} />
  </Svg>
);

export const StepChatIcon = ({ size }: P) => (
  <Svg size={size}>
    <path d="M13 12h16a4 4 0 0 1 4 4v9a4 4 0 0 1-4 4h-2v4l-5-4h-9a4 4 0 0 1-4-4v-9a4 4 0 0 1 4-4z" {...SHADE} />
    <path d="M8 6h17a4 4 0 0 1 4 4v9a4 4 0 0 1-4 4H15l-6 5v-5H8a4 4 0 0 1-4-4v-9a4 4 0 0 1 4-4z" {...LINE} />
    <path d="M11 13h11M11 17.5h7" {...LINE} />
  </Svg>
);

export const StepClockIcon = ({ size }: P) => (
  <Svg size={size}>
    <circle cx="20" cy="20" r="12.5" {...SHADE} />
    <circle cx="17" cy="17" r="12.5" {...LINE} />
    <path d="M17 10v7l5 3" {...LINE} />
  </Svg>
);
