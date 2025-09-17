'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle, Calendar, MapPin, Clock, Copy } from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

export default function ReservationSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reservationCode = searchParams?.get('code') || 'RES-UNKNOWN';

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(reservationCode);
      // Could add a toast notification here
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background px-6 py-8">
      {/* Success Icon */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-success/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-12 h-12 text-success" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Reservation Confirmed!</h1>
        <p className="text-muted">Your items have been successfully reserved</p>
      </div>

      {/* Reservation Details */}
      <Card className="mb-6">
        <div className="text-center mb-6">
          <p className="text-sm text-muted mb-2">Reservation Code</p>
          <div className="flex items-center justify-center space-x-2">
            <span className="text-2xl font-mono font-bold text-primary">{reservationCode}</span>
            <button
              onClick={copyToClipboard}
              className="p-2 rounded-lg bg-secondary border border-white/10 hover:bg-white/10 transition-colors"
            >
              <Copy className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center space-x-3 p-3 bg-secondary/50 rounded-lg">
            <Clock className="w-5 h-5 text-info" />
            <div>
              <p className="text-white font-medium">Valid for 48 hours</p>
              <p className="text-sm text-muted">Items reserved until pickup</p>
            </div>
          </div>

          <div className="flex items-center space-x-3 p-3 bg-secondary/50 rounded-lg">
            <MapPin className="w-5 h-5 text-warning" />
            <div>
              <p className="text-white font-medium">Store Pickup</p>
              <p className="text-sm text-muted">123 Aquarium St, Manila City</p>
            </div>
          </div>

          <div className="flex items-center space-x-3 p-3 bg-secondary/50 rounded-lg">
            <Calendar className="w-5 h-5 text-success" />
            <div>
              <p className="text-white font-medium">Store Hours</p>
              <p className="text-sm text-muted">Mon-Sat: 9:00 AM - 7:00 PM</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Important Notes */}
      <Card variant="glass" className="mb-6 bg-warning/10 border-warning/20">
        <h3 className="font-semibold text-white mb-3">Important Reminders</h3>
        <ul className="space-y-2 text-sm text-muted">
          <li className="flex items-start">
            <span className="text-warning mr-2">•</span>
            Please bring a valid ID and your reservation code
          </li>
          <li className="flex items-start">
            <span className="text-warning mr-2">•</span>
            Items will be held for 48 hours from reservation time
          </li>
          <li className="flex items-start">
            <span className="text-warning mr-2">•</span>
            Payment can be made upon pickup (Cash or GCash)
          </li>
          <li className="flex items-start">
            <span className="text-warning mr-2">•</span>
            Contact us at +63 123 456 7890 for any concerns
          </li>
        </ul>
      </Card>

      {/* Actions */}
      <div className="space-y-3">
        <Button
          onClick={() => router.push('/client/reservations')}
          className="w-full"
          size="lg"
        >
          View My Reservations
        </Button>

        <Button
          onClick={() => router.push('/client/search')}
          variant="outline"
          className="w-full"
        >
          Continue Shopping
        </Button>

        <Button
          onClick={() => router.push('/client/dashboard')}
          variant="ghost"
          className="w-full"
        >
          Back to Home
        </Button>
      </div>

      {/* Contact Info */}
      <div className="mt-8 text-center">
        <p className="text-sm text-muted mb-2">Need help?</p>
        <p className="text-sm text-white">
          Call us at <span className="text-primary">+63 123 456 7890</span>
        </p>
      </div>
    </div>
  );
}