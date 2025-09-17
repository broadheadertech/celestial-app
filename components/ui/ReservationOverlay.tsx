'use client';

import { useState, useEffect } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Check, CalendarCheck2, Copy, ShieldCheck } from 'lucide-react';
import Button from './Button';

interface ReservationOverlayProps {
  isVisible: boolean;
  onComplete: () => void;
  onSuccess?: () => void;
  reservationCode?: string;
}

const loadingMessages = [
  "Verifying your reservation...",
  "This will take just a minute...",
  "Please wait while we confirm...",
  "Checking product availability...",
  "Processing your request...",
  "Almost done, thank you for waiting..."
];

export default function ReservationOverlay({
  isVisible,
  onComplete,
  onSuccess,
  reservationCode
}: ReservationOverlayProps) {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [animationPhase, setAnimationPhase] = useState<'loading' | 'success' | 'complete'>('loading');

  // Live-poll reservation status by code; convex `useQuery` will re-run
  // when data changes server-side and trigger the success screen.
  const reservation = useQuery(
    api.services.reservations.getReservationByCode,
    reservationCode ? { reservationCode } : 'skip'
  );

  useEffect(() => {
    if (!isVisible) return;

    // Rotate messages every 5 seconds
    const messageInterval = setInterval(() => {
      setCurrentMessageIndex((prev) => (prev + 1) % loadingMessages.length);
    }, 5000);

    // Maximum loading duration of 2 minutes
    const maxLoadingTimeout = setTimeout(() => {
      if (animationPhase === 'loading') {
        handleSuccess();
      }
    }, 120000); // 2 minutes

    return () => {
      clearInterval(messageInterval);
      clearTimeout(maxLoadingTimeout);
    };
  }, [isVisible, animationPhase]);

  // When backend marks the reservation as confirmed, show success UI
  useEffect(() => {
    if (!isVisible || !reservationCode) return;
    if (!reservation) return; // still loading / or skipped
    if (reservation.status === 'confirmed' && !showSuccess) {
      handleSuccess();
    }
  }, [reservation, isVisible, reservationCode]);

  const handleSuccess = () => {
    setAnimationPhase('success');
    setShowSuccess(true);
    if (onSuccess) {
      onSuccess();
    }
  };

  const handleComplete = () => {
    setAnimationPhase('complete');
    onComplete();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center">
      {/* Subtle glow accents */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 right-10 h-80 w-80 bg-primary/15 blur-[120px]" />
        <div className="absolute -bottom-32 left-20 h-64 w-64 bg-primary/10 blur-[120px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-8">
        {!showSuccess ? (
          // Loading State
          <>
            {/* Brand */}
            <div className="mb-10 text-center">
              <div className="mx-auto h-14 w-14 rounded-2xl border border-white/10 bg-white/5 flex items-center justify-center">
                <CalendarCheck2 className="h-7 w-7 text-primary" />
              </div>
              <p className="mt-4 text-sm uppercase tracking-[0.35em] text-muted">Reservation</p>
            </div>

            {/* Loading Animation */}
            <div className="relative mb-10">
              <div className="w-20 h-20 rounded-full border border-white/10" />
              <div className="absolute inset-0 w-20 h-20 rounded-full border-2 border-transparent border-t-primary animate-spin" />
              <div className="absolute inset-3 w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center">
                <div className="h-8 w-8 rounded-full bg-primary/30 animate-ping" />
              </div>
            </div>

            {/* Loading Message */}
            <div className="text-center mb-8">
              <h2 className="text-2xl font-semibold text-white mb-3">Processing your reservation</h2>
              <p className="text-lg text-white/80 transition-all duration-500 ease-in-out">
                {loadingMessages[currentMessageIndex]}
              </p>
            </div>

            {/* Status Indicator */}
            <div className="flex items-center justify-center space-x-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce delay-100"></div>
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce delay-200"></div>
              </div>
            </div>

            <p className="text-xs text-white/50 mt-4">Do not close this window</p>
          </>
        ) : (
          // Success State
          <div className="text-center animate-in fade-in duration-300">
            <div className="mx-auto mb-8 h-16 w-16 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center">
              <Check className="h-8 w-8 text-green-400" />
            </div>

            <h2 className="text-2xl font-semibold text-white">Reservation confirmed</h2>
            <p className="mt-3 text-white/80 max-w-md mx-auto">
              We’ll notify you when your order is ready for pickup. Keep this code handy for a faster experience at the counter.
            </p>

            {reservationCode && (
              <div className="mt-6 inline-flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.35em] text-muted">Reservation Code</p>
                  <p className="mt-1 font-mono text-xl font-bold text-primary">{reservationCode}</p>
                </div>
                <button
                  type="button"
                  aria-label="Copy reservation code"
                  className="rounded-xl border border-white/10 bg-black/40 p-2 text-white/80 hover:text-white hover:border-white/20"
                  onClick={() => navigator.clipboard.writeText(reservationCode)}
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            )}

            <div className="mt-8 text-xs text-muted flex items-center justify-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <span>Confirmation saved to your account</span>
            </div>

            <div className="mt-10">
              <Button
                onClick={handleComplete}
                size="lg"
                className="px-7 py-3 text-base bg-primary text-white hover:bg-primary/90"
              >
                View Reservation
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
