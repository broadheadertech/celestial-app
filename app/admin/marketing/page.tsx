'use client';

import { useRouter } from 'next/navigation';
import BottomNavbar from '@/components/common/BottomNavbar';
import SafeAreaProvider from '@/components/provider/SafeAreaProvider';
import {
  ArrowLeft,
  Mail,
  Send,
  Bell,
  MessageSquare,
  Megaphone,
  Construction,
} from 'lucide-react';

function MarketingContent() {
  const router = useRouter();

  const upcomingFeatures = [
    {
      icon: Mail,
      title: 'Email Campaigns',
      description: 'Send promotional emails, new arrivals, and sale announcements to your customers.',
      status: 'Planned',
    },
    {
      icon: MessageSquare,
      title: 'SMS Notifications',
      description: 'Automated SMS for order confirmations, pickup reminders, and promotions.',
      status: 'Planned',
    },
    {
      icon: Bell,
      title: 'Push Notifications',
      description: 'Send push notifications to mobile app users about deals and new products.',
      status: 'Planned',
    },
    {
      icon: Megaphone,
      title: 'Promotions & Discounts',
      description: 'Create discount codes, bundle deals, and time-limited promotions.',
      status: 'Planned',
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 sm:pb-6">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-white/10 safe-area-top">
        <div className="px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-full bg-secondary border border-white/10 hover:bg-white/10 active:scale-95 transition-all"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </button>
            <div>
              <h1 className="text-lg sm:text-2xl font-bold text-white">Marketing</h1>
              <p className="text-xs sm:text-sm text-white/60">Campaigns & promotions</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 py-6 max-w-7xl mx-auto">
        {/* Current Status */}
        <div className="bg-secondary/40 rounded-xl p-6 border border-white/10 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
              <Send className="w-5 h-5 text-success" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Active Email Service</h2>
              <p className="text-xs text-white/60">Transactional emails via Resend</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-background/40 rounded-lg p-3 border border-white/5">
              <p className="text-xs text-white/40">Password Reset</p>
              <p className="text-sm font-medium text-success">Active</p>
            </div>
            <div className="bg-background/40 rounded-lg p-3 border border-white/5">
              <p className="text-xs text-white/40">Order Notifications</p>
              <p className="text-sm font-medium text-warning">In-app only</p>
            </div>
            <div className="bg-background/40 rounded-lg p-3 border border-white/5">
              <p className="text-xs text-white/40">SMS Notifications</p>
              <p className="text-sm font-medium text-white/40">Not configured</p>
            </div>
          </div>
        </div>

        {/* Upcoming Features */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-4">
            <Construction className="w-5 h-5 text-warning" />
            <h2 className="text-base font-bold text-white">Upcoming Features</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {upcomingFeatures.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="bg-secondary/40 rounded-xl p-4 border border-white/10">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h3 className="text-sm font-bold text-white">{feature.title}</h3>
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-warning/10 text-warning border border-warning/20">
                          {feature.status}
                        </span>
                      </div>
                      <p className="text-xs text-white/60 leading-relaxed">{feature.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <BottomNavbar />
    </div>
  );
}

export default function MarketingPage() {
  return (
    <SafeAreaProvider applySafeArea={false}>
      <MarketingContent />
    </SafeAreaProvider>
  );
}
