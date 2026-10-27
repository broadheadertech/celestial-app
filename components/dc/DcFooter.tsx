'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { hoursSummary, useBusiness } from './business';
import { MessengerIcon } from './MessengerButton';
import Brand from './kit/Brand';
import { CertIcon, WhatsAppIcon } from './kit/icons';

/** Site footer (dark; cream on Visit, as in the reference) + floating WhatsApp button, wired to Business Details. */
export default function DcFooter() {
  const pathname = usePathname();
  const biz = useBusiness();
  const [days, time] = hoursSummary(biz.hours);
  const waHref = biz.wa(`Hi ${biz.storeName} — I'd like to enquire about your arowana.`);
  const theme = pathname.startsWith('/cave') ? 'cream' : 'dark';

  return (
    <>
      <footer className="dk dk-footer" data-theme={theme}>
        <div className="dk-wrap">
          <div className="dk-footer-top">
            <div>
              <Brand name={biz.storeName} onDark={theme === 'dark'} />
              <p className="dk-footer-about">Home of premium Asian arowana — the living dragon. Every specimen chipped, certified, and quarantined before it meets our gallery water.</p>
              <p className="dk-cert"><CertIcon />CITES-certified dealer</p>
            </div>
            <nav aria-label="Explore">
              <p className="dk-f-head">Explore</p>
              <ul className="dk-f-links">
                <li><Link href="/">Home</Link></li>
                <li><Link href="/catalog">The Catalog</Link></li>
                <li><Link href="/shop">Shop all products</Link></li>
                <li><Link href="/merch">Dragon Merch</Link></li>
                <li><Link href="/cave">The Cave &mdash; visit &amp; book</Link></li>
                <li><Link href="/drago-knows">Drago-knows &mdash; care guides</Link></li>
                <li><Link href="/ka-dragon">Certified Ka-Dragon</Link></li>
                <li><Link href="/home-service">Home service</Link></li>
                <li><Link href="/contact">Contact</Link></li>
                <li><Link href="/track">Track an order</Link></li>
              </ul>
            </nav>
            <div>
              <p className="dk-f-head">Gallery</p>
              <div className="dk-f-text">
                {(biz.address || biz.city) && (
                  <p>
                    {biz.address}
                    {biz.address && biz.city && <br />}
                    {biz.city}
                  </p>
                )}
                {biz.loaded && (
                  <p>
                    {days} &middot; {time ? <Link href="/cave#hours">{time}</Link> : <Link href="/cave#hours">See hours</Link>}
                    {biz.hoursNote && <><br />{biz.hoursNote}</>}
                  </p>
                )}
              </div>
            </div>
            <div>
              <p className="dk-f-head">Inquire</p>
              <div className="dk-f-btns">
                <Link className="dk-btn dk-btn-red" href="/contact">Contact us</Link>
                {biz.messenger && (
                  <a className="dk-btn dk-btn-outline-light" href={biz.messenger} target="_blank" rel="noopener">
                    <MessengerIcon size={15} />
                    Message us on Messenger
                  </a>
                )}
              </div>
            </div>
          </div>
          <div className="dk-footer-bottom">
            <p className="dk-copy">
              &copy; <span suppressHydrationWarning>{new Date().getFullYear()}</span> {biz.storeName}
              {biz.city && <> &middot; {biz.city}, Philippines</>}
            </p>
            <p className="dk-tagline">Kept, not merely sold.</p>
          </div>
        </div>
      </footer>

      {waHref && (
        <span className="dk">
          <a href={waHref} target="_blank" rel="noopener" className="dk-fab" aria-label="Enquire on WhatsApp">
            <WhatsAppIcon size={26} />
          </a>
        </span>
      )}
    </>
  );
}
