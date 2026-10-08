/** Line icons from design-reference/dragoncave-site.html (its SVG sprite), as components. */

type P = { size?: number; className?: string };

const svg = (size: number, viewBox: string, className?: string) => ({
  width: size,
  height: size,
  viewBox,
  className,
  'aria-hidden': true as const,
  focusable: false as const,
});

export const SignInIcon = ({ size = 22, className }: P) => (
  <svg {...svg(size, '0 0 24 24', className)}><g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><path d="M10 17l5-5-5-5" /><path d="M15 12H3" /></g></svg>
);
export const SearchIcon = ({ size = 16, className }: P) => (
  <svg {...svg(size, '0 0 24 24', className)}><g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></g></svg>
);
export const BagIcon = ({ size = 16, className }: P) => (
  <svg {...svg(size, '0 0 24 24', className)}><g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 8h14l-1 13H6L5 8z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></g></svg>
);
export const MenuIcon = ({ size = 16, className }: P) => (
  <svg {...svg(size, '0 0 24 24', className)}><path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
);
export const CloseIcon = ({ size = 16, className }: P) => (
  <svg {...svg(size, '0 0 24 24', className)}><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
);
/** North-east arrow used on links ("All specimens ↗"). */
export const NeIcon = ({ size = 9, className }: P) => (
  <svg {...svg(size, '0 0 10 10', className)}><path d="M2 8l6-6M3 2h5v5" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>
);
export const ChipIcon = ({ size = 18, className }: P) => (
  <svg {...svg(size, '0 0 16 16', className)}><g fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="1" y="1" width="14" height="14" rx="3" /><rect x="5" y="5" width="6" height="6" rx="1" /></g></svg>
);
export const ClockIcon = ({ size = 20, className }: P) => (
  <svg {...svg(size, '0 0 20 20', className)}><g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><circle cx="10" cy="10" r="9" /><path d="M10 5v5l4 3" /></g></svg>
);
export const PhoneIcon = ({ size = 18, className }: P) => (
  <svg {...svg(size, '0 0 24 24', className)}><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
export const HouseIcon = ({ size = 18, className }: P) => (
  <svg {...svg(size, '0 0 24 24', className)}><g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21V9l9-6 9 6v12" /><path d="M9 21v-6h6v6M12 8v4M10 10h4" /></g></svg>
);
export const WaveIcon = ({ className }: P) => (
  <svg width={24} height={8} viewBox="0 0 24 8" className={className} aria-hidden="true" focusable="false"><path d="M1 4c2.5-3 5-3 7.5 0s5 3 7.5 0 5-3 7 0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
);
export const ChatIcon = ({ size = 22, className }: P) => (
  <svg {...svg(size, '0 0 24 24', className)}><g fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" /><path d="M8.5 12h.01M12 12h.01M15.5 12h.01" /></g></svg>
);
export const HeartIcon = ({ size = 16, className }: P) => (
  <svg {...svg(size, '0 0 24 24', className)}><path d="M12 20.5s-7.5-4.6-9.3-9.2C1.5 8 3.6 4.5 7.2 4.5c2 0 3.4 1.1 4.8 2.9 1.4-1.8 2.8-2.9 4.8-2.9 3.6 0 5.7 3.5 4.5 6.8-1.8 4.6-9.3 9.2-9.3 9.2z" strokeWidth="1.8" strokeLinejoin="round" /></svg>
);
export const CertIcon = ({ size = 16, className }: P) => (
  <svg {...svg(size, '0 0 16 16', className)}><path d="M8 0l1.9 1.4 2.3-.1.7 2.2 1.9 1.3-.7 2.2.7 2.2-1.9 1.3-.7 2.2-2.3-.1L8 14l-1.9-1.4-2.3.1-.7-2.2-1.9-1.3.7-2.2-.7-2.2 1.9-1.3.7-2.2 2.3.1z" fill="currentColor" /><path d="M5 7.2l2 2 4-4" fill="none" stroke="#000" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
export const EyeIcon = ({ size = 24, className }: P) => (
  <svg {...svg(size, '0 0 24 24', className)}><g fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M1.5 12S5.5 5 12 5s10.5 7 10.5 7-4 7-10.5 7S1.5 12 1.5 12z" /><circle cx="12" cy="12" r="3" /></g></svg>
);
export const EyeOffIcon = ({ size = 24, className }: P) => (
  <svg {...svg(size, '0 0 24 24', className)}><g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M1.5 12S5.5 5 12 5s10.5 7 10.5 7-4 7-10.5 7S1.5 12 1.5 12z" /><circle cx="12" cy="12" r="3" /><path d="M3 21L21 3" /></g></svg>
);
export const BackIcon = ({ className }: P) => (
  <svg width={17} height={12} viewBox="0 0 18 12" className={className} aria-hidden="true" focusable="false"><path d="M17 6H1M6 1L1 6l5 5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
export const CheckIcon = ({ size = 14, className }: P) => (
  <svg {...svg(size, '0 0 16 12', className)}><path d="M1 6.5l4.5 4.5L15 1" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
export const CrossIcon = ({ size = 14, className }: P) => (
  <svg {...svg(size, '0 0 16 16', className)}><path d="M3 3l10 10M13 3L3 13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
);
export const ChevronIcon = ({ dir = 'right', className }: { dir?: 'left' | 'right'; className?: string }) => (
  <svg width={7} height={12} viewBox="0 0 7 12" className={className} aria-hidden="true" focusable="false"><path d={dir === 'left' ? 'M6 1L1 6l5 5' : 'M1 1l5 5-5 5'} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
export const CaretIcon = ({ className }: P) => (
  <svg width={12} height={7} viewBox="0 0 12 7" className={className} aria-hidden="true" focusable="false"><path d="M1 1l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
);
export const GridIcon = ({ className }: P) => (
  <svg width={18} height={18} viewBox="0 0 18 18" fill="currentColor" className={className} aria-hidden="true" focusable="false"><rect x="1" y="1" width="7" height="7" rx="1.5" /><rect x="10" y="1" width="7" height="7" rx="1.5" /><rect x="1" y="10" width="7" height="7" rx="1.5" /><rect x="10" y="10" width="7" height="7" rx="1.5" /></svg>
);
export const ListIcon = ({ className }: P) => (
  <svg width={18} height={12} viewBox="0 0 18 12" className={className} aria-hidden="true" focusable="false"><path d="M1 1h16M1 6h16M1 11h16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
);
export const WhatsAppIcon = ({ size = 20, className }: P) => (
  <svg {...svg(size, '0 0 24 24', className)} fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3z" /></svg>
);
/* Member sidebar */
export const HomeIcon = ({ className }: P) => (
  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" className={className} aria-hidden="true" focusable="false"><path d="M3 11l9-7 9 7v10H3z" /></svg>
);
export const CalendarIcon = ({ className }: P) => (
  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className} aria-hidden="true" focusable="false"><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 9h18" /></svg>
);
export const CartIcon = ({ className }: P) => (
  <svg width={20} height={18} viewBox="0 0 24 22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true" focusable="false"><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" /><circle cx="9" cy="20" r="1.4" /><circle cx="19" cy="20" r="1.4" /></svg>
);
export const OrdersIcon = ({ className }: P) => (
  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" className={className} aria-hidden="true" focusable="false"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M7 9h10M7 14h7" /></svg>
);
/** Frame icon inside the "Image placeholder" box. */
export const ImageFrameIcon = ({ size = 22, className }: P) => (
  <svg {...svg(size, '0 0 24 24', className)}><g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2.5" /><circle cx="8.5" cy="9.5" r="1.8" /><path d="M21 16l-5-5-8 9" /></g></svg>
);
/** Generic icons for empty / error states. */
export const AlertIcon = ({ size = 26, className }: P) => (
  <svg {...svg(size, '0 0 24 24', className)}><g fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5.5M12 16.5v.01" /></g></svg>
);
