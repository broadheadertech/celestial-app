'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { Fish, ShoppingCart, Users, Settings } from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

export default function Home() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show landing page for non-authenticated users
  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center">
        <div className="mb-8">
          <h1 className="text-4xl sm:text-6xl font-bold text-white mb-4 text-shadow">
            Celestial Drakon
            <br />
            <span className="text-primary">Aquatics</span>
          </h1>
          <p className="text-xl text-muted max-w-2xl mx-auto leading-relaxed">
            Your trusted partner for premium aquarium fish, tanks, and accessories.
            Explore our collection and bring your aquatic dreams to life.
          </p>
        </div>

        {/* Quick Access Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-4xl mb-8">
          <Card variant="glass" className="text-center p-6 hover:scale-105 transition-transform">
            <Fish className="w-8 h-8 text-primary mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-white mb-2">Premium Fish</h3>
            <p className="text-sm text-muted">Exotic and local fish species</p>
          </Card>

          <Card variant="glass" className="text-center p-6 hover:scale-105 transition-transform">
            <ShoppingCart className="w-8 h-8 text-primary mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-white mb-2">Easy Shopping</h3>
            <p className="text-sm text-muted">Simple reservation system</p>
          </Card>

          <Card variant="glass" className="text-center p-6 hover:scale-105 transition-transform">
            <Users className="w-8 h-8 text-primary mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-white mb-2">Expert Support</h3>
            <p className="text-sm text-muted">Professional guidance</p>
          </Card>

          <Card variant="glass" className="text-center p-6 hover:scale-105 transition-transform">
            <Settings className="w-8 h-8 text-primary mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-white mb-2">Quality Gear</h3>
            <p className="text-sm text-muted">Tanks and accessories</p>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
          <Button
            onClick={() => router.push('/auth/login')}
            className="w-full"
            size="lg"
          >
            Sign In
          </Button>
          <Button
            onClick={() => router.push('/client/dashboard')}
            variant="outline"
            className="w-full"
            size="lg"
          >
            Browse as Guest
          </Button>
        </div>

        <div className="mt-6">
          <p className="text-sm text-muted">
            New to Celestial Drakon?{' '}
            <button
              onClick={() => router.push('/auth/register')}
              className="text-primary hover:underline"
            >
              Create an account
            </button>
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-6 px-6 border-t border-white/10">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-sm text-muted">
            © 2024 Celestial Drakon Aquatics. Premium aquatic solutions for enthusiasts.
          </p>
        </div>
      </footer>
    </div>
  );
}
