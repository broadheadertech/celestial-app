'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Minus,
  Trash2,
  Clock,
  Loader2,
} from 'lucide-react';
import { useCartStore, useCartItems, useCartTotal } from '@/store/cart';
import { useAuthStore, useIsAuthenticated } from '@/store/auth';
import { formatCurrency } from '@/lib/utils';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useReservation } from '@/context/ReservationContext';
import SafeAreaProvider from '@/components/provider/SafeAreaProvider';
import MemberSidebar from '@/components/dc/kit/MemberSidebar';
import EmptyState from '@/components/dc/kit/EmptyState';
import Field from '@/components/dc/kit/Field';
import Placeholder from '@/components/dc/kit/Placeholder';
import { BackIcon, CaretIcon, CartIcon, MenuIcon } from '@/components/dc/kit/icons';

function CartContent() {
  const router = useRouter();
  const cartItems = useCartItems();
  const cartTotal = useCartTotal();
  const { updateQuantity, removeItem, clearCart } = useCartStore();
  const { user, guestId } = useAuthStore();
  const isAuthenticated = useIsAuthenticated();
  const { showReservation } = useReservation();

  // Convex mutation for creating reservations
  const createReservation = useMutation(api.services.reservations.createReservation);

  const isStaff = isAuthenticated && (user?.role === 'admin' || user?.role === 'super_admin');

  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [guestInfo, setGuestInfo] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    pickupDate: '',
    pickupTime: '',
    notes: '',
  });
  const [guestErrors, setGuestErrors] = useState<Record<string, string>>({});
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  // Redirect admins and super_admins to their respective dashboards
  useEffect(() => {
    if (isStaff) router.push('/admin/dashboard');
  }, [isStaff, router]);

  if (isStaff) return null;

  const handleQuantityChange = (productId: string, change: number) => {
    const item = cartItems.find(item => item.productId === productId);
    if (!item) return;

    const newQuantity = Math.max(0, Math.min(item.product!.stock, item.quantity + change));

    if (newQuantity === 0) {
      removeItem(productId);
    } else {
      updateQuantity(productId, newQuantity);
    }
  };

  const validateGuestForm = () => {
    const errors: Record<string, string> = {};

    if (!guestInfo.name.trim()) errors.name = 'Name is required';
    if (!guestInfo.email.trim()) errors.email = 'Email is required';
    if (!guestInfo.phone.trim()) errors.phone = 'Phone is required';
    if (!guestInfo.address.trim()) errors.address = 'Address is required';
    if (!guestInfo.pickupDate) errors.pickupDate = 'Pickup date is required';
    if (!guestInfo.pickupTime) errors.pickupTime = 'Pickup time is required';

    setGuestErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCheckout = async () => {
    if (cartItems.length === 0) return;

    if (!isAuthenticated && !showGuestForm) {
      setShowGuestForm(true);
      return;
    }

    if (!isAuthenticated && !validateGuestForm()) {
      return;
    }

    setIsCheckingOut(true);

    try {
      // Simulate minimum loading time for better UX (3 seconds)
      const minLoadingTime = new Promise(resolve => setTimeout(resolve, 3000));

      // Prepare reservation data
      const reservationItems = cartItems.map(item => ({
        productId: item.productId as Id<'products'>,
        quantity: item.quantity,
        reservedPrice: item.product?.price || 0
      }));

      const totalAmount = cartTotal;
      const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);

      // Create guest info if user is not authenticated
      const guestInfoData = !isAuthenticated ? {
        name: guestInfo.name,
        email: guestInfo.email,
        phone: guestInfo.phone,
        completeAddress: guestInfo.address,
        pickupSchedule: {
          date: guestInfo.pickupDate,
          time: guestInfo.pickupTime
        },
        notes: guestInfo.notes || undefined
      } : undefined;

      // Create reservation in database
      const [result] = await Promise.all([
        createReservation({
          userId: isAuthenticated ? user!._id : undefined,
          guestId: !isAuthenticated ? guestId : undefined,
          guestInfo: guestInfoData,
          items: reservationItems,
          totalAmount,
          totalQuantity,
          reservationDate: Date.now(),
          notes: !isAuthenticated ? guestInfo.notes : undefined
        }),
        minLoadingTime
      ]);

      if (result) {
        // Use global reservation context
        showReservation(result.reservationCode);
        // Clear cart after successful reservation
        clearCart();
        // Navigate to dashboard
        router.push('/client/dashboard');
      }

    } catch (error) {
      console.error('Checkout failed:', error);
      // You might want to show an error message to user here
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleGuestInputChange = (field: string, value: string) => {
    setGuestInfo(prev => ({ ...prev, [field]: value }));
    if (guestErrors[field]) {
      setGuestErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  // Member layout shell: sidebar drawer + top bar with the screen title.
  const shell = (title: string, onBack: () => void, children: React.ReactNode) => (
    <div className="dk dk-member">
      <div className="dk-app">
        <MemberSidebar id="sidebar" active="cart" open={sidebarOpen} onClose={closeSidebar} />

        <section className="dk-app-main safe-area-top safe-area-bottom">
          <div className="dk-app-top">
            <div className="dk-app-top-l">
              <button
                type="button"
                className="dk-view-btn dk-app-menu"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open menu"
                aria-controls="sidebar"
                aria-expanded={sidebarOpen}
              >
                <MenuIcon />
              </button>
              <button type="button" className="dk-view-btn" onClick={onBack} aria-label="Back">
                <BackIcon />
              </button>
              <h1>{title}</h1>
            </div>
            <div className="dk-app-actions">
              {user ? (
                <Link className="dk-user-pill" href="/client/profile" aria-label="Account">
                  <span className="dk-avatar">{(user.firstName?.[0] || 'D').toUpperCase()}</span>
                  <span><CaretIcon /></span>
                </Link>
              ) : null}
            </div>
          </div>

          <div className="dk-app-section">{children}</div>
        </section>
      </div>
    </div>
  );

  if (showGuestForm && !isAuthenticated) {
    const guestField = (
      field: keyof typeof guestInfo,
      label: string,
      opts: { type?: string; placeholder?: string; required?: boolean; full?: boolean } = {},
    ) => {
      const id = `guest-${field}`;
      const error = guestErrors[field];
      return (
        <Field id={id} label={label} required={opts.required} error={error || undefined} full={opts.full}>
          <input
            id={id}
            className="dk-input"
            type={opts.type || 'text'}
            placeholder={opts.placeholder}
            value={guestInfo[field]}
            onChange={(e) => handleGuestInputChange(field, e.target.value)}
            required={opts.required}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-msg` : undefined}
          />
        </Field>
      );
    };

    return shell('Guest Information', () => setShowGuestForm(false), (
      <div className="dk-split">
        <div className="dk-panel">
          <div className="dk-stack lg">
            <section aria-labelledby="guest-contact">
              <h3 id="guest-contact" className="dk-h4" style={{ marginBottom: 16 }}>Contact Information</h3>
              <div className="dk-fgrid">
                {guestField('name', 'Full Name', { placeholder: 'Enter your full name', required: true, full: true })}
                {guestField('email', 'Email Address', { type: 'email', placeholder: 'Enter your email', required: true })}
                {guestField('phone', 'Phone Number', { type: 'tel', placeholder: 'Enter your phone number', required: true })}
              </div>
            </section>

            <div className="dk-divider" />

            <section aria-labelledby="guest-pickup">
              <h3 id="guest-pickup" className="dk-h4" style={{ marginBottom: 16 }}>Pickup Information</h3>
              <div className="dk-fgrid">
                {guestField('address', 'Complete Address', { placeholder: 'Enter your complete address', required: true, full: true })}
                {guestField('pickupDate', 'Pickup Date', { type: 'date', required: true })}
                {guestField('pickupTime', 'Pickup Time', { type: 'time', required: true })}
                {guestField('notes', 'Special Notes (Optional)', { placeholder: 'Any special instructions...', full: true })}
              </div>
            </section>
          </div>
        </div>

        <aside className="dk-panel dk-sticky">
          <div className="dk-stack">
            <button
              type="button"
              onClick={handleCheckout}
              disabled={isCheckingOut}
              className="dk-btn dk-btn-red block"
            >
              {isCheckingOut && <Loader2 className="animate-spin" size={16} aria-hidden="true" />}
              {isCheckingOut ? 'Creating Reservation...' : `Reserve Items - ${formatCurrency(cartTotal)}`}
            </button>

            <p className="dk-small dk-muted" style={{ textAlign: 'center' }}>Have an account?</p>
            <button
              type="button"
              onClick={() => router.push('/auth/login')}
              className="dk-btn dk-btn-outline-dark block"
            >
              Sign In Instead
            </button>
          </div>
        </aside>
      </div>
    ));
  }

  return shell(`Shopping Cart (${cartItems.length})`, () => router.back(), (
    cartItems.length === 0 ? (
      <div className="dk-panel">
        <EmptyState
          icon={<CartIcon />}
          title="Your cart is empty"
          actions={
            <>
              <button type="button" className="dk-btn dk-btn-red" onClick={() => router.push('/client/search')}>
                Browse Products
              </button>
              <button type="button" className="dk-btn dk-btn-outline-dark" onClick={() => router.push('/client/categories')}>
                View Categories
              </button>
            </>
          }
        >
          Start building your aquarium! Browse our collection of fish, tanks, and accessories.
        </EmptyState>
      </div>
    ) : (
      <div className="dk-split">
        {/* Cart Items */}
        <div className="dk-panel" style={{ paddingTop: 8, paddingBottom: 8 }}>
          <ul className="dk-list">
            {cartItems.map((item) => (
              <li key={item.productId} className="dk-list-row">
                <div className="dk-thumb">
                  <Placeholder
                    src={item.product?.image || null}
                    alt={item.product?.name || ''}
                    style={{ width: '100%', height: '100%' }}
                  />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3
                    className="dk-h4"
                    style={{ fontSize: 16, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  >
                    {item.product?.name}
                  </h3>
                  <p className="dk-small dk-muted" style={{ marginTop: 2 }}>
                    {formatCurrency(item.product?.price || 0)} each
                  </p>

                  <div className="dk-row between wrap" style={{ marginTop: 10 }}>
                    <div className="dk-qty">
                      <button
                        type="button"
                        onClick={() => handleQuantityChange(item.productId, -1)}
                        aria-label={`Decrease quantity of ${item.product?.name ?? 'item'}`}
                      >
                        <Minus size={14} aria-hidden="true" />
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        type="button"
                        className="plus"
                        onClick={() => handleQuantityChange(item.productId, 1)}
                        disabled={item.quantity >= (item.product?.stock || 0)}
                        aria-label={`Increase quantity of ${item.product?.name ?? 'item'}`}
                      >
                        <Plus size={14} aria-hidden="true" />
                      </button>
                    </div>

                    <div className="dk-row" style={{ gap: 10 }}>
                      <span className="dk-mono" style={{ fontWeight: 800 }}>
                        {formatCurrency((item.product?.price || 0) * item.quantity)}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeItem(item.productId)}
                        className="dk-view-btn"
                        aria-label={`Remove ${item.product?.name ?? 'item'}`}
                        style={{ width: 32, height: 32, color: 'var(--dk-red)' }}
                      >
                        <Trash2 size={15} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <aside className="dk-sticky dk-stack">
          {/* Reservation Notice */}
          <div className="dk-panel muted" style={{ padding: 20 }}>
            <div className="dk-row" style={{ alignItems: 'flex-start' }}>
              <Clock size={20} aria-hidden="true" style={{ color: 'var(--dk-red)', flex: 'none', marginTop: 2 }} />
              <div>
                <h3 className="dk-h4">Reservation System</h3>
                <p className="dk-small dk-muted" style={{ marginTop: 4 }}>
                  Items will be reserved for 48 hours. You can pick them up at our store or
                  arrange for delivery within Metro Manila.
                </p>
              </div>
            </div>
          </div>

          {/* Total Summary */}
          <div className="dk-panel">
            <div className="dk-summary">
              <div>
                <span>Subtotal ({itemCount} items)</span>
                <span className="dk-mono">{formatCurrency(cartTotal)}</span>
              </div>
              <div>
                <span>Reservation Fee</span>
                <span className="dk-status black">FREE</span>
              </div>
              <div className="total">
                <span>Total</span>
                <span className="dk-mono" style={{ color: 'var(--dk-red)' }}>{formatCurrency(cartTotal)}</span>
              </div>
            </div>

            {/* Checkout Button */}
            <button
              type="button"
              onClick={handleCheckout}
              disabled={isCheckingOut || cartItems.length === 0}
              className="dk-btn dk-btn-red block"
              style={{ marginTop: 22 }}
            >
              {isCheckingOut && <Loader2 className="animate-spin" size={16} aria-hidden="true" />}
              {isCheckingOut
                ? 'Processing...'
                : isAuthenticated
                ? 'Reserve Now'
                : 'Continue as Guest'
              }
            </button>

            {!isAuthenticated && (
              <div className="dk-stack" style={{ marginTop: 18, gap: 10 }}>
                <p className="dk-small dk-muted" style={{ textAlign: 'center' }}>
                  Sign in to save your preferences and track reservations
                </p>
                <button
                  type="button"
                  onClick={() => router.push('/auth/login')}
                  className="dk-btn dk-btn-outline-dark block"
                >
                  Sign In
                </button>
              </div>
            )}
          </div>
        </aside>
      </div>
    )
  ));
}

export default function CartPage() {
  return (
    <SafeAreaProvider applySafeArea={false}>
      <CartContent />
    </SafeAreaProvider>
  );
}
