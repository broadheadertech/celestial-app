'use client';

import { useState, useEffect } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Check, CalendarCheck2, Copy, ShieldCheck, X, AlertCircle } from 'lucide-react';
import Button from './Button';
import { useReservation } from '@/context/ReservationContext';

const loadingMessages = [
  "Getting things ready for you...",
  "Just a moment, we're preparing your request...",
  "This typically takes about 120 seconds...",
  "Hang tight – we're almost there...",
  "Finalizing your details...",
  "Just one more step...",
  "Thank you for your patience!",
  "Nearly complete..."
];

export default function GlobalReservationOverlay() {
  const {
    isVisible,
    isMinimized,
    reservationCode,
    hideReservation,
    minimizeReservation,
    maximizeReservation,
  } = useReservation();

  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [animationPhase, setAnimationPhase] = useState<'loading' | 'success' | 'timeout' | 'complete'>('loading');

  // Live-poll reservation status by code
  const reservation = useQuery(
    api.services.reservations.getReservationByCode,
    reservationCode ? { reservationCode } : 'skip'
  );

  useEffect(() => {
    if (!isVisible) {
      // Reset state when overlay is hidden
      setShowSuccess(false);
      setTimedOut(false);
      setAnimationPhase('loading');
      setCurrentMessageIndex(0);
      return;
    }

    // Rotate messages every 5 seconds
    const messageInterval = setInterval(() => {
      setCurrentMessageIndex((prev) => (prev + 1) % loadingMessages.length);
    }, 5000);

    // Maximum loading duration of 2 minutes
    const maxLoadingTimeout = setTimeout(() => {
      if (animationPhase === 'loading') {
        handleTimeout();
      }
    }, 120000); // 2 minutes

    return () => {
      clearInterval(messageInterval);
      clearTimeout(maxLoadingTimeout);
    };
  }, [isVisible, animationPhase]);

  // When backend marks the reservation as confirmed, show success UI
  useEffect(() => {
    if (!reservationCode) return;
    if (!reservation) return;
    
    if (reservation.status === 'confirmed' && !showSuccess) {
      handleSuccess();
      // Keep minimized if already minimized - don't show full overlay
      // User can click to expand if they want to see details
    }
  }, [reservation, reservationCode, showSuccess]);

  const handleSuccess = () => {
    setAnimationPhase('success');
    setShowSuccess(true);
    setTimedOut(false);
  };

  const handleTimeout = () => {
    setAnimationPhase('timeout');
    setTimedOut(true);
  };

  if (!isVisible) return null;

  // Mini notification when minimized
  if (isMinimized) {
    let statusIcon = CalendarCheck2;
    let statusText = 'Processing';
    let statusColor = 'text-primary';
    let bgColor = 'bg-primary/10';
    let borderColor = 'border-white/10';
    let statusMessage = 'Verifying reservation...';
    let showSpinner = true;

    if (showSuccess) {
      statusIcon = Check;
      statusText = 'Confirmed';
      statusColor = 'text-green-400';
      bgColor = 'bg-green-500/10';
      borderColor = 'border-green-500/20';
      statusMessage = 'Ready for pickup';
      showSpinner = false;
    } else if (timedOut) {
      statusIcon = AlertCircle;
      statusText = 'Pending';
      statusColor = 'text-amber-400';
      bgColor = 'bg-amber-500/10';
      borderColor = 'border-amber-500/20';
      statusMessage = 'Awaiting approval';
      showSpinner = false;
    }

    const StatusIcon = statusIcon;

    return (
      <div className="fixed top-4 right-4 z-[9999] animate-in slide-in-from-top-4 fade-in duration-300">
        <div className={`relative rounded-xl border ${borderColor} ${bgColor} backdrop-blur-xl shadow-2xl p-2.5 w-[240px]`}>
          <div className="flex items-center gap-2">
            <div className="relative flex-shrink-0">
              <div className={`w-7 h-7 rounded-full border ${borderColor} bg-black/20 flex items-center justify-center`}>
                <StatusIcon className={`h-3.5 w-3.5 ${statusColor}`} />
              </div>
              {showSpinner && (
                <div className="absolute inset-0 w-7 h-7 rounded-full border-2 border-transparent border-t-primary animate-spin" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className={`text-xs font-semibold ${statusColor}`}>{statusText}</span>
                {reservationCode && (
                  <>
                    <span className="text-white/30">•</span>
                    <span className="font-mono text-[10px] text-white/60">{reservationCode}</span>
                  </>
                )}
              </div>
              <p className="text-[10px] text-white/50 mt-0.5 truncate">
                {statusMessage}
              </p>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={maximizeReservation}
                className="p-1 hover:bg-white/10 rounded transition-colors"
                aria-label="View status"
                title="View full status"
              >
                <CalendarCheck2 className="h-3.5 w-3.5 text-white/60 hover:text-white" />
              </button>
              <button
                onClick={hideReservation}
                className="p-1 hover:bg-white/10 rounded transition-colors"
                aria-label="Dismiss"
                title="Dismiss"
              >
                <X className="h-3.5 w-3.5 text-white/60 hover:text-white" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Full overlay
  return (
    <div className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 right-10 h-80 w-80 bg-primary/15 blur-[120px]" />
        <div className="absolute -bottom-32 left-20 h-64 w-64 bg-primary/10 blur-[120px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen w-full px-4 sm:px-8 py-8">
        {!showSuccess && !timedOut ? (
          // Loading State
          <>
            <div className="mb-8 sm:mb-10 text-center">
              <div className="mx-auto h-12 w-12 sm:h-14 sm:w-14 rounded-2xl border border-white/10 bg-white/5 flex items-center justify-center">
                <CalendarCheck2 className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
              </div>
              <p className="mt-3 sm:mt-4 text-xs sm:text-sm uppercase tracking-[0.25em] sm:tracking-[0.35em] text-muted">Reservation</p>
            </div>

            <div className="relative mb-8 sm:mb-10">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border border-white/10" />
              <div className="absolute inset-0 w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-transparent border-t-primary animate-spin" />
              <div className="absolute inset-2 sm:inset-3 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-primary/15 flex items-center justify-center">
                <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-primary/30 animate-ping" />
              </div>
            </div>

            <div className="text-center mb-6 sm:mb-8 max-w-sm">
              <h2 className="text-xl sm:text-2xl font-semibold text-white mb-2 sm:mb-3">Processing your reservation</h2>
              <p className="text-base sm:text-lg text-white/80 transition-all duration-500 ease-in-out px-4">
                {loadingMessages[currentMessageIndex]}
              </p>
            </div>

            <div className="flex items-center justify-center space-x-2 mb-6 sm:mb-8">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce delay-100"></div>
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce delay-200"></div>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:gap-3 items-center w-full max-w-xs">
              <Button
                onClick={minimizeReservation}
                variant="outline"
                size="lg"
                className="w-full px-6 border-white/20 text-white hover:bg-white/10"
              >
                Continue browsing
              </Button>
              <p className="text-xs text-white/50">We'll notify you when it's ready</p>
            </div>
          </>
        ) : timedOut ? (
          // Timeout State
          <div className="text-center animate-in fade-in duration-300 max-w-md w-full">
            <div className="mx-auto mb-6 sm:mb-8 h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
              <AlertCircle className="h-7 w-7 sm:h-8 sm:w-8 text-amber-400" />
            </div>

            <h2 className="text-xl sm:text-2xl font-semibold text-white mb-2 sm:mb-3">Reservation in process</h2>
            <p className="text-sm sm:text-base text-white/80 px-4">
              Your reservation is still being processed by our team. We'll send you a confirmation notification once it's approved.
            </p>

            {reservationCode && (
              <div className="mt-5 sm:mt-6 mx-4 inline-flex items-center gap-3 sm:gap-4 rounded-2xl border border-white/10 bg-white/[0.06] px-4 sm:px-5 py-3 sm:py-4">
                <div className="text-left flex-1 min-w-0">
                  <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.25em] sm:tracking-[0.35em] text-muted">Code</p>
                  <p className="mt-1 font-mono text-lg sm:text-xl font-bold text-amber-400 truncate">{reservationCode}</p>
                </div>
                <button
                  type="button"
                  aria-label="Copy reservation code"
                  className="rounded-xl border border-white/10 bg-black/40 p-2 text-white/80 hover:text-white hover:border-white/20 flex-shrink-0"
                  onClick={() => navigator.clipboard.writeText(reservationCode)}
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            )}

            <div className="mt-6 sm:mt-8 text-xs text-muted flex items-center justify-center gap-2">
              <ShieldCheck className="h-4 w-4 text-amber-400" />
              <span>Status: Pending confirmation</span>
            </div>

            <div className="mt-8 sm:mt-10 px-4 w-full">
              <Button
                onClick={hideReservation}
                size="lg"
                className="w-full px-7 bg-primary text-white hover:bg-primary/90"
              >
                Confirm
              </Button>
            </div>
          </div>
        ) : (
          // Success State
          <div className="text-center animate-in fade-in duration-300 max-w-md w-full">
            <div className="mx-auto mb-6 sm:mb-8 h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center">
              <Check className="h-7 w-7 sm:h-8 sm:w-8 text-green-400" />
            </div>

            <h2 className="text-xl sm:text-2xl font-semibold text-white mb-2 sm:mb-3">Reservation confirmed</h2>
            <p className="text-sm sm:text-base text-white/80 px-4">
              We'll notify you when your order is ready for pickup. Keep this code handy for a faster experience at the counter.
            </p>

            {reservationCode && (
              <div className="mt-5 sm:mt-6 mx-4 inline-flex items-center gap-3 sm:gap-4 rounded-2xl border border-white/10 bg-white/[0.06] px-4 sm:px-5 py-3 sm:py-4">
                <div className="text-left flex-1 min-w-0">
                  <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.25em] sm:tracking-[0.35em] text-muted">Code</p>
                  <p className="mt-1 font-mono text-lg sm:text-xl font-bold text-primary truncate">{reservationCode}</p>
                </div>
                <button
                  type="button"
                  aria-label="Copy reservation code"
                  className="rounded-xl border border-white/10 bg-black/40 p-2 text-white/80 hover:text-white hover:border-white/20 flex-shrink-0"
                  onClick={() => navigator.clipboard.writeText(reservationCode)}
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            )}

            <div className="mt-6 sm:mt-8 text-xs text-muted flex items-center justify-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <span>Confirmation saved to your account</span>
            </div>

            <div className="mt-8 sm:mt-10 px-4 w-full">
              <Button
                onClick={hideReservation}
                size="lg"
                className="w-full px-7 bg-primary text-white hover:bg-primary/90"
              >
                Confirm
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}