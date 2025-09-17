'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  Clock,
  User,
  Search,
  Calendar,
  MapPin
} from 'lucide-react';
import { useCartStore, useCartItems, useCartTotal } from '@/store/cart';
import { useAuthStore, useIsAuthenticated, useIsGuest } from '@/store/auth';
import { formatCurrency, generateId } from '@/lib/utils';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';
import ReservationOverlay from '@/components/ui/ReservationOverlay';

export default function CartPage() {
  const router = useRouter();
  const cartItems = useCartItems();
  const cartTotal = useCartTotal();
  const { updateQuantity, removeItem, clearCart } = useCartStore();
  const { user, guestId } = useAuthStore();
  const isAuthenticated = useIsAuthenticated();
  const isGuest = useIsGuest();

  // Convex mutation for creating reservations
  const createReservation = useMutation(api.services.reservations.createReservation);

  // Redirect admins and super_admins to their respective dashboards
  if (isAuthenticated && user?.role === 'admin') {
    router.push('/admin/dashboard');
    return null;
  }

  if (isAuthenticated && user?.role === 'super_admin') {
    router.push('/control_panel');
    return null;
  }

  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [showReservationOverlay, setShowReservationOverlay] = useState(false);
  const [reservationCode, setReservationCode] = useState<string>('');
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

    // Show reservation overlay immediately
    setShowReservationOverlay(true);
    setIsCheckingOut(true);

    try {
      // Simulate minimum loading time for better UX (3 seconds)
      const minLoadingTime = new Promise(resolve => setTimeout(resolve, 3000));

      // Prepare reservation data
      const reservationItems = cartItems.map(item => ({
        productId: item.productId,
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
        setReservationCode(result.reservationCode);
        // Clear cart after successful reservation
        clearCart();
      }

    } catch (error) {
      console.error('Checkout failed:', error);
      // Hide overlay on error and show error message
      setShowReservationOverlay(false);
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

  const handleReservationComplete = () => {
    setShowReservationOverlay(false);
    router.push('/client/dashboard');
  };

  const handleReservationSuccess = () => {
    // This is called when admin approves the reservation
    // In a real app, this would be triggered by real-time updates
    console.log('Reservation approved by admin');
  };

  if (showGuestForm && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-white/10">
          <div className="px-6 py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowGuestForm(false)}
                className="p-2 rounded-full bg-secondary border border-white/10 hover:bg-white/10 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
              <h1 className="text-xl font-semibold text-white">Guest Information</h1>
            </div>
          </div>
        </div>

        {/* Guest Form */}
        <div className="px-6 py-6">
          <Card className="mb-6">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-white mb-2">Contact Information</h3>
                <div className="space-y-3">
                  <Input
                    label="Full Name"
                    placeholder="Enter your full name"
                    value={guestInfo.name}
                    onChange={(value) => handleGuestInputChange('name', value)}
                    error={guestErrors.name}
                    required
                  />
                  <Input
                    label="Email Address"
                    type="email"
                    placeholder="Enter your email"
                    value={guestInfo.email}
                    onChange={(value) => handleGuestInputChange('email', value)}
                    error={guestErrors.email}
                    required
                  />
                  <Input
                    label="Phone Number"
                    type="tel"
                    placeholder="Enter your phone number"
                    value={guestInfo.phone}
                    onChange={(value) => handleGuestInputChange('phone', value)}
                    error={guestErrors.phone}
                    required
                  />
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-white mb-2">Pickup Information</h3>
                <div className="space-y-3">
                  <Input
                    label="Complete Address"
                    placeholder="Enter your complete address"
                    value={guestInfo.address}
                    onChange={(value) => handleGuestInputChange('address', value)}
                    error={guestErrors.address}
                    required
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="Pickup Date"
                      type="date"
                      value={guestInfo.pickupDate}
                      onChange={(value) => handleGuestInputChange('pickupDate', value)}
                      error={guestErrors.pickupDate}
                      required
                    />
                    <Input
                      label="Pickup Time"
                      type="time"
                      value={guestInfo.pickupTime}
                      onChange={(value) => handleGuestInputChange('pickupTime', value)}
                      error={guestErrors.pickupTime}
                      required
                    />
                  </div>
                  <Input
                    label="Special Notes (Optional)"
                    placeholder="Any special instructions..."
                    value={guestInfo.notes}
                    onChange={(value) => handleGuestInputChange('notes', value)}
                  />
                </div>
              </div>
            </div>
          </Card>

          <Button
            onClick={handleCheckout}
            loading={isCheckingOut}
            disabled={isCheckingOut}
            className="w-full"
            size="lg"
          >
            {isCheckingOut ? 'Creating Reservation...' : `Reserve Items - ${formatCurrency(cartTotal)}`}
          </Button>

          <div className="mt-4 text-center">
            <p className="text-sm text-muted mb-2">Have an account?</p>
            <Button
              variant="outline"
              onClick={() => router.push('/auth/login')}
              className="w-full"
            >
              Sign In Instead
            </Button>
          </div>
        </div>

        {/* Reservation Overlay for Guest Form */}
        <ReservationOverlay
          isVisible={showReservationOverlay}
          onComplete={handleReservationComplete}
          onSuccess={handleReservationSuccess}
          reservationCode={reservationCode}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-white/10">
        <div className="px-6 py-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-full bg-secondary border border-white/10 hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <h1 className="text-xl font-semibold text-white">
              Shopping Cart ({cartItems.length})
            </h1>
          </div>
        </div>
      </div>

      {/* Cart Content */}
      <div className="px-6 py-6">
        {cartItems.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingBag className="w-16 h-16 text-muted mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Your cart is empty</h3>
            <p className="text-muted mb-6">Add some products to get started</p>
            <Button onClick={() => router.push('/client/search')}>
              Browse Products
            </Button>
          </div>
        ) : (
          <>
            {/* Cart Items */}
            <div className="space-y-4 mb-6">
              {cartItems.map((item) => (
                <Card key={item.productId} className="p-4">
                  <div className="flex space-x-4">
                    <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-primary/20 to-info/20 overflow-hidden">
                      {item.product?.image ? (
                        <img
                          src={item.product.image}
                          alt={item.product.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div className={`w-full h-full bg-gradient-to-br from-primary/20 to-info/20 flex items-center justify-center ${item.product?.image ? 'hidden' : ''}`}>
                        <span className="text-xs text-muted">IMG</span>
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white mb-1 line-clamp-1">
                        {item.product?.name}
                      </h3>
                      <p className="text-sm text-muted mb-2">
                        {formatCurrency(item.product?.price || 0)} each
                      </p>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleQuantityChange(item.productId, -1)}
                            className="w-8 h-8 rounded-full bg-secondary border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
                          >
                            <Minus className="w-4 h-4 text-white" />
                          </button>
                          <span className="text-white font-medium w-8 text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => handleQuantityChange(item.productId, 1)}
                            disabled={item.quantity >= (item.product?.stock || 0)}
                            className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center disabled:opacity-50 hover:bg-primary/90 transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="flex items-center space-x-3">
                          <span className="font-bold text-white">
                            {formatCurrency((item.product?.price || 0) * item.quantity)}
                          </span>
                          <button
                            onClick={() => removeItem(item.productId)}
                            className="p-1 text-error hover:bg-error/10 rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Reservation Notice */}
            <Card variant="glass" className="mb-6 bg-info/10 border-info/20">
              <div className="flex items-start space-x-3">
                <Clock className="w-5 h-5 text-info mt-0.5" />
                <div>
                  <h3 className="font-medium text-white mb-1">Reservation System</h3>
                  <p className="text-sm text-muted">
                    Items will be reserved for 48 hours. You can pick them up at our store or
                    arrange for delivery within Metro Manila.
                  </p>
                </div>
              </div>
            </Card>

            {/* Total Summary */}
            <Card className="mb-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-muted">
                  <span>Subtotal ({cartItems.reduce((sum, item) => sum + item.quantity, 0)} items)</span>
                  <span>{formatCurrency(cartTotal)}</span>
                </div>
                <div className="flex items-center justify-between text-success">
                  <span>Reservation Fee</span>
                  <span>FREE</span>
                </div>
                <div className="border-t border-white/10 pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold text-white">Total</span>
                    <span className="text-xl font-bold text-primary">
                      {formatCurrency(cartTotal)}
                    </span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Checkout Button */}
            <Button
              onClick={handleCheckout}
              loading={isCheckingOut}
              disabled={isCheckingOut || cartItems.length === 0}
              className="w-full"
              size="lg"
            >
              {isCheckingOut
                ? 'Processing...'
                : isAuthenticated
                ? 'Reserve Now'
                : 'Continue as Guest'
              }
            </Button>

            {!isAuthenticated && (
              <div className="mt-4 text-center">
                <p className="text-sm text-muted mb-2">
                  Sign in to save your preferences and track reservations
                </p>
                <Button
                  variant="outline"
                  onClick={() => router.push('/auth/login')}
                  className="w-full"
                >
                  Sign In
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-white/10">
        <div className="grid grid-cols-4 py-2">
          <button
            onClick={() => router.push('/client/dashboard')}
            className="flex flex-col items-center py-2 px-3 text-muted hover:text-white transition-colors"
          >
            <div className="w-5 h-5 mb-1 bg-muted rounded"></div>
            <span className="text-xs">Home</span>
          </button>
          <button
            onClick={() => router.push('/client/search')}
            className="flex flex-col items-center py-2 px-3 text-muted hover:text-white transition-colors"
          >
            <Search className="w-5 h-5 mb-1" />
            <span className="text-xs">Search</span>
          </button>
          <button className="flex flex-col items-center py-2 px-3 text-primary">
            <ShoppingBag className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium">Cart</span>
          </button>
          <button
            onClick={() => router.push('/client/profile')}
            className="flex flex-col items-center py-2 px-3 text-muted hover:text-white transition-colors"
          >
            <User className="w-5 h-5 mb-1" />
            <span className="text-xs">Profile</span>
          </button>
        </div>
      </div>

      {/* Bottom padding */}
      <div className="h-16" />

      {/* Reservation Overlay */}
      <ReservationOverlay
        isVisible={showReservationOverlay}
        onComplete={handleReservationComplete}
        onSuccess={handleReservationSuccess}
        reservationCode={reservationCode}
      />
    </div>
  );
}