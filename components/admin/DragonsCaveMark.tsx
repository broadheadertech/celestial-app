'use client';

import { useTheme } from '@/store/theme';

/** Theme-aware Dragon's Cave logo used in the admin sidebar and mobile nav. */
export default function DragonsCaveMark({ size = 36 }: { size?: number }) {
  const theme = useTheme((s) => s.theme);
  const src = theme === 'dark' ? '/img/dc-logo-dark.png' : '/img/dc-logo-light.png';
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt="Dragon's Cave"
      height={size}
      style={{
        display: 'block',
        height: size,
        width: 'auto',
        objectFit: 'contain',
      }}
      draggable={false}
    />
  );
}
