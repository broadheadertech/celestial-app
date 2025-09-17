'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import {
  Activity,
  GaugeCircle,
  Radar,
  Smartphone,
  Waves,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

export default function Home() {
  const router = useRouter();
  const { isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#050505] text-white">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-black via-black to-zinc-950" />
        <div className="absolute -top-60 right-0 h-[520px] w-[520px] bg-primary/10 blur-[160px]" />
        <div className="absolute -bottom-40 left-24 h-72 w-72 bg-primary/10 blur-[140px]" />
        <div className="relative max-w-6xl mx-auto px-6 lg:px-10 pt-24 pb-28 grid gap-16 lg:grid-cols-[1.15fr,0.85fr] items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.4em] text-muted">
              Control Every Current
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight">
              The command center for aquariums that deserve more than autopilot.
            </h1>
            <p className="text-lg text-muted max-w-xl">
              Celestial Drakon keeps your installations vivid, balanced, and ready to awe. Monitor health, choreograph maintenance, and sync alerts across every device—all through a single immersive workspace.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                onClick={() => router.push('/auth/login')}
                size="lg"
                className="w-full sm:w-auto"
              >
                Continue in Web Browser
              </Button>
              <Button
                size="lg"
                variant="ghost"
                disabled
                className="w-full sm:w-auto border border-dashed border-white/15 text-muted"
              >
                Android App · Coming Soon
              </Button>
            </div>
            <div className="grid gap-6 sm:grid-cols-3 pt-4">
              {[
                {
                  title: 'Live Health Scoring',
                  description: 'Automated diagnostics with instant anomaly alerts.',
                },
                {
                  title: 'Adaptive Scheduling',
                  description: 'Tasks flex with livestock changes and water chemistry.',
                },
                {
                  title: 'Collaborative Access',
                  description: 'Invite caretakers, stylists, or clients with tailored roles.',
                },
              ].map((item) => (
                <div key={item.title} className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.3em] text-primary/70">{item.title}</p>
                  <p className="text-sm text-muted">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="relative">
            <Card
              variant="modern"
              className="relative h-[520px] overflow-hidden border border-white/10 bg-gradient-to-b from-white/[0.08] via-white/[0.02] to-transparent"
              padding="none"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.12),_transparent_55%)]" />
              <div className="relative z-10 h-full w-full p-10 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-muted uppercase tracking-[0.45em]">
                  <span>Live Dashboard</span>
                  <span>V2.4</span>
                </div>
                <div className="relative flex-1 flex items-center justify-center">
                  <div className="relative w-full max-w-sm">
                    <div className="relative rounded-[36px] border border-white/10 bg-black/70 p-6 shadow-[0px_24px_80px_-20px_rgba(0,0,0,0.9)]">
                      <div className="flex items-center justify-between text-xs text-muted">
                        <span className="flex items-center gap-2 text-primary"><GaugeCircle className="h-4 w-4" /> Stability</span>
                        <span>98%</span>
                      </div>
                      <div className="mt-6 rounded-2xl border border-white/5 bg-gradient-to-br from-primary/10 via-black to-black/80 p-4">
                        <p className="text-sm text-muted">Lagoon Exhibit</p>
                        <p className="mt-1 text-2xl font-semibold text-white">Crystal Balance</p>
                        <div className="mt-4 grid grid-cols-3 gap-3 text-center text-xs text-muted">
                          <div className="rounded-xl bg-white/5 p-3">
                            <p className="text-primary font-semibold text-sm">7.9</p>
                            <p>pH</p>
                          </div>
                          <div className="rounded-xl bg-white/5 p-3">
                            <p className="text-primary font-semibold text-sm">25°C</p>
                            <p>Temp</p>
                          </div>
                          <div className="rounded-xl bg-white/5 p-3">
                            <p className="text-primary font-semibold text-sm">0 ppm</p>
                            <p>Ammonia</p>
                          </div>
                        </div>
                      </div>
                      <div className="mt-6 space-y-3 text-sm text-muted">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-2 text-white"><Activity className="h-4 w-4 text-primary" /> Pulse Feed</span>
                          <span className="text-primary">Due in 20m</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-2 text-white"><Radar className="h-4 w-4 text-primary" /> Health Scan</span>
                          <span>Tomorrow 7:00</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-2 text-white"><Smartphone className="h-4 w-4 text-primary" /> Concierge Chat</span>
                          <span>Online</span>
                        </div>
                      </div>
                    </div>
                    <div className="absolute -right-10 -bottom-6 hidden lg:block">
                      <div className="rounded-3xl border border-white/10 bg-black/70 px-5 py-4 shadow-2xl">
                        <p className="text-xs uppercase tracking-[0.4em] text-muted">Insights</p>
                        <p className="mt-3 text-sm text-white">Coral blooms up 14% after lighting adjustment. Keep current profile.</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-muted">
                  <span className="flex items-center gap-2 text-primary"><Waves className="h-4 w-4" /> Synced to 3 locations</span>
                  <span>Last refresh · 12s ago</span>
                </div>
              </div>
            </Card>
            <div className="absolute -bottom-14 left-5 right-5 hidden md:block">
              <Card variant="glass" padding="lg" className="border border-white/5 bg-black/70 backdrop-blur">
                <div className="flex flex-col gap-2 text-sm text-muted">
                  <span className="text-xs uppercase tracking-[0.35em] text-primary/70">What to Expect</span>
                  <p>One unified workspace for alarms, routines, and remote specialists—purpose-built for aquatic curators.</p>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <section className="relative border-y border-white/5 bg-black/85">
        <div className="max-w-6xl mx-auto px-6 lg:px-10 py-20">
          <div className="grid gap-8 lg:grid-cols-3">
            <Card variant="modern" hover padding="lg" className="bg-black/50">
              <GaugeCircle className="h-10 w-10 text-primary" />
              <h3 className="mt-6 text-2xl font-semibold">Always in the Sweet Spot</h3>
              <p className="mt-3 text-sm text-muted">
                Predictive analytics balance nutrients, lighting, and chemistry so moments of wonder stay effortless.
              </p>
            </Card>
            <Card variant="modern" hover padding="lg" className="bg-black/50">
              <Radar className="h-10 w-10 text-primary" />
              <h3 className="mt-6 text-2xl font-semibold">Know Before It Shows</h3>
              <p className="mt-3 text-sm text-muted">
                Precision monitoring reads micro-shifts in your ecosystem and issues tailored playbooks for each scenario.
              </p>
            </Card>
            <Card variant="modern" hover padding="lg" className="bg-black/50">
              <Smartphone className="h-10 w-10 text-primary" />
              <h3 className="mt-6 text-2xl font-semibold">Presence From Anywhere</h3>
              <p className="mt-3 text-sm text-muted">
                Seamless handoffs between desktop, tablet, and upcoming mobile keep your team synced in real time.
              </p>
            </Card>
          </div>
        </div>
      </section>

      <section className="relative flex-1">
        <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-950 to-black" />
        <div className="relative max-w-6xl mx-auto px-6 lg:px-10 py-24 grid gap-12 lg:grid-cols-[0.9fr,1.1fr] items-center">
          <div className="space-y-6">
            <p className="text-xs uppercase tracking-[0.35em] text-primary/70">Designed for Impact</p>
            <h2 className="text-3xl sm:text-4xl font-semibold">
              Showcase-worthy aquariums need orchestration, not guesswork.
            </h2>
            <p className="text-lg text-muted">
              Build routines once, layer in intelligent triggers, and let Celestial Drakon orchestrate your environments. Whether running a boutique gallery or managing multi-site attractions, every detail is ready before the lights come on.
            </p>
            <div className="space-y-4 text-sm text-muted">
              <div className="flex items-start gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
                <p>Instant sync with IoT sensors, lighting rigs, and dosing controllers.</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
                <p>Role-based workspaces tailored for curators, technicians, and VIP stakeholders.</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
                <p>Story-ready reporting with cinematic visuals for investor decks or guest briefings.</p>
              </div>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -top-12 -left-10 h-40 w-40 rounded-full bg-primary/15 blur-[120px]" />
            <Card variant="modern" padding="lg" className="relative overflow-hidden border border-white/10 bg-black/60">
              <div className="relative z-10 grid gap-6">
                <div className="flex items-center gap-4">
                  <div className="relative h-14 w-14 overflow-hidden rounded-2xl border border-white/10">
                    <Image
                      src="/img/logo-app.png"
                      alt="Celestial Drakon emblem"
                      fill
                      className="object-contain p-2"
                    />
                  </div>
                  <div>
                    <p className="text-sm uppercase tracking-[0.3em] text-muted">In-app Preview</p>
                    <p className="text-lg text-white">Client Dashboard</p>
                  </div>
                </div>
                <div className="grid gap-4 text-sm text-muted">
                  <div className="rounded-2xl border border-white/5 bg-white/5 p-5">
                    <p className="text-xs uppercase tracking-[0.3em] text-primary/70">Curator Broadcast</p>
                    <p className="mt-2 text-white">&ldquo;Lighting Profile Orion&rdquo; deployed to Four Seasons Sky Atrium. Spectators gathered within minutes.&rdquo;</p>
                  </div>
                  <div className="rounded-2xl border border-white/5 bg-white/5 p-5">
                    <p className="text-xs uppercase tracking-[0.3em] text-primary/70">Guest Mode</p>
                    <p className="mt-2 text-white">Share a guided story through your tanks with timed highlights and ambient audio.</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 text-xs uppercase tracking-[0.3em] text-muted">
                  <span className="rounded-full border border-white/10 px-4 py-2 text-white/80">Dark Mode Native</span>
                  <span className="rounded-full border border-white/10 px-4 py-2 text-white/80">Multi-Tank Sync</span>
                  <span className="rounded-full border border-white/10 px-4 py-2 text-white/80">Cinematic Reporting</span>
                </div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/60" />
            </Card>
          </div>
        </div>
      </section>

      <footer className="py-8 px-6 border-t border-white/10 bg-black">
        <div className="max-w-6xl mx-auto text-center text-sm text-muted">
          © 2024 Celestial Drakon Aquatics. Premium aquatic environments, handcrafted.
        </div>
      </footer>
    </div>
  );
}
