'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, Fish, ShoppingCart, Package, CheckCircle } from 'lucide-react';
import Button from '@/components/ui/Button';

const onboardingSteps = [
  {
    icon: Fish,
    title: 'Explore Our Aquatic Collection',
    description: 'Discover a wide variety of premium fish, tanks, and aquatic accessories for your aquarium paradise.',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    icon: ShoppingCart,
    title: 'Easy Shopping Experience',
    description: 'Browse products, add to cart, and reserve live fish with our seamless shopping system.',
    color: 'from-purple-500 to-pink-500',
  },
  {
    icon: Package,
    title: 'Track Your Orders',
    description: 'Stay updated with real-time notifications and track your orders and reservations effortlessly.',
    color: 'from-orange-500 to-red-500',
  },
  {
    icon: CheckCircle,
    title: 'Ready to Dive In?',
    description: 'Create an account or continue as a guest to start your aquatic journey with us!',
    color: 'from-green-500 to-emerald-500',
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    // Check if already completed onboarding
    const hasCompleted = localStorage.getItem('onboarding_completed');
    if (hasCompleted) {
      router.replace('/auth/login');
    }
  }, [router]);

  const handleNext = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleSkip = () => {
    localStorage.setItem('onboarding_completed', 'true');
    router.push('/auth/login');
  };

  const handleGetStarted = () => {
    localStorage.setItem('onboarding_completed', 'true');
    router.push('/auth/login');
  };

  const currentStepData = onboardingSteps[currentStep];
  const Icon = currentStepData.icon;
  const isLastStep = currentStep === onboardingSteps.length - 1;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background to-background-dark">
      {/* Skip Button */}
      <div className="absolute top-6 right-6 z-10">
        <button
          onClick={handleSkip}
          className="px-4 py-2 text-sm text-muted hover:text-white transition-colors"
        >
          Skip
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Icon with Gradient Background */}
        <div className={`w-32 h-32 rounded-full bg-gradient-to-br ${currentStepData.color} flex items-center justify-center mb-8 shadow-2xl`}>
          <Icon className="w-16 h-16 text-white" />
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-white text-center mb-4 max-w-md">
          {currentStepData.title}
        </h1>

        {/* Description */}
        <p className="text-muted text-center mb-12 max-w-md leading-relaxed">
          {currentStepData.description}
        </p>

        {/* Step Indicators */}
        <div className="flex gap-2 mb-12">
          {onboardingSteps.map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentStep
                  ? 'w-8 bg-primary'
                  : index < currentStep
                  ? 'w-2 bg-primary/50'
                  : 'w-2 bg-white/20'
              }`}
            />
          ))}
        </div>

        {/* Action Button */}
        <div className="w-full max-w-sm">
          {isLastStep ? (
            <Button
              onClick={handleGetStarted}
              className="w-full"
              size="lg"
            >
              Get Started
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              className="w-full flex items-center justify-center gap-2"
              size="lg"
            >
              Next
              <ChevronRight className="w-5 h-5" />
            </Button>
          )}
        </div>
      </div>

      {/* App Name/Logo at Bottom */}
      <div className="pb-8 text-center">
        <p className="text-white font-semibold text-lg">Celestial Drakon Aquatics</p>
        <p className="text-muted text-sm">Your Aquatic Paradise</p>
      </div>
    </div>
  );
}
