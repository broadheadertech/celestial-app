// app/onboarding/page.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ArrowRight, Check } from 'lucide-react';
import Image from 'next/image';
import SafeAreaProvider, { useSafeArea } from '@/components/provider/SafeAreaProvider';

const ONBOARDING_KEY = 'onboarding_completed';

const onboardingSteps = [
  {
    id: 1,
    title: 'Welcome to Dragon Cave Inventory',
    subtitle: 'Your Premium Aquatic Partner',
    description: 'Discover exceptional aquatic life, premium equipment, and expert guidance for your aquarium journey',
    image: '/img/slide1.png',
    features: ['Premium Fish Collection', 'Expert Guidance', 'Quality Guarantee']
  },
  {
    id: 2,
    title: 'Explore Our Collection',
    subtitle: 'Curated Excellence',
    description: 'Browse thousands of premium fish, state-of-the-art tanks, and professional-grade accessories',
    image: '/img/slide2.png',
    features: ['Rare Fish Species', 'Premium Equipment', 'Complete Setups']
  },
  {
    id: 3,
    title: 'Reserve & Collect',
    subtitle: 'Seamless Experience',
    description: 'Reserve your favorites online and collect them at your convenience with our flexible pickup system',
    image: '/img/slide3.png',
    features: ['Easy Reservations', 'Flexible Pickup', 'Secure Payments']
  }
];

// Onboarding Content Component (consumes safe area context)
function OnboardingContent() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [imageErrors, setImageErrors] = useState<{[key: number]: boolean}>({});
  const { isMobileApp, isInitialized } = useSafeArea();

  const handleNext = () => {
    if (isAnimating) return;
    
    if (currentStep < onboardingSteps.length - 1) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(currentStep + 1);
        setIsAnimating(false);
      }, 300);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (isAnimating || currentStep === 0) return;
    
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentStep(currentStep - 1);
      setIsAnimating(false);
    }, 300);
  };

  const handleComplete = () => {
    try {
      localStorage.setItem(ONBOARDING_KEY, 'true');
      router.replace('/');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      router.replace('/');
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const goToStep = (index: number) => {
    if (index !== currentStep && !isAnimating) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(index);
        setIsAnimating(false);
      }, 300);
    }
  };

  const handleImageError = (stepId: number) => {
    console.error(`Failed to load image for step ${stepId}`);
    setImageErrors(prev => ({ ...prev, [stepId]: true }));
  };

  const currentStepData = onboardingSteps[currentStep];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header with Safe Area Support - Fixed spacing */}
      <div className="absolute top-0 left-0 right-0 z-10 mb-2">
        <div className="px-4 pt-6 pb-4 bg-gradient-to-b from-black/60 via-black/40 to-transparent">
          <div className="flex items-center justify-between max-w-6xl mx-auto w-full">
            <button
              onClick={handlePrevious}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                currentStep === 0 
                  ? 'opacity-0 pointer-events-none' 
                  : 'opacity-100 bg-white/10 backdrop-blur-sm hover:bg-white/20 active:scale-95'
              }`}
              disabled={currentStep === 0}
              aria-label="Previous step"
            >
              <ChevronLeft size={24} className="text-white" />
            </button>
            
            {/* Progress Dots */}
            <div className="flex items-center space-x-2">
              {onboardingSteps.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToStep(index)}
                  className="p-1.5 active:scale-90 transition-transform"
                  aria-label={`Go to step ${index + 1}`}
                >
                  <div
                    className={`rounded-full transition-all duration-500 ${
                      index === currentStep 
                        ? 'w-6 h-1.5 bg-primary shadow-lg shadow-primary/30' 
                        : index < currentStep 
                          ? 'w-1.5 h-1.5 bg-primary/50' 
                          : 'w-1.5 h-1.5 bg-white/30 hover:bg-white/50'
                    }`}
                  />
                </button>
              ))}
            </div>
            
            <button
              onClick={handleSkip}
              className="text-white/90 hover:text-white active:scale-95 transition-all duration-300 text-sm font-medium px-4 py-2 rounded-full"
            >
              Skip
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative">
        <div 
          className={`flex-1 transition-all duration-500 ${
            isAnimating ? 'opacity-0' : 'opacity-100'
          }`}
        >
          {/* Image Section - Adjusted height to prevent overlap */}
          <div className="relative h-[45vh] w-full overflow-hidden">
            {!imageErrors[currentStepData.id] ? (
              <>
                <Image
                  src={currentStepData.image}
                  alt={currentStepData.title}
                  fill
                  className="object-cover"
                  priority={currentStep === 0}
                  onError={() => handleImageError(currentStepData.id)}
                  unoptimized
                />
                {/* Enhanced gradient overlay for better separation */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-background" />
              </>
            ) : (
              <div className="w-full h-full bg-gradient-to-b from-secondary/20 to-background flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto rounded-full bg-white/5 flex items-center justify-center mb-4 animate-pulse">
                    <div className="w-10 h-10 rounded-full bg-white/10" />
                  </div>
                  <p className="text-white/30 text-sm">Image loading...</p>
                </div>
              </div>
            )}
          </div>

          {/* Content Section */}
          <div className="flex-1 flex flex-col justify-center px-5 py-6">
            <div className="text-center space-y-6">
              {/* Title Section */}
              <div className="space-y-3">
                {currentStep === 0 ? (
                  <h1 className="text-3xl font-bold tracking-tight">
                    <span className="text-white block">Celestial</span>
                    <span className="text-primary block mt-1">Drakon Aquatics</span>
                  </h1>
                ) : (
                  <>
                    <p className="text-primary/80 text-xs font-medium tracking-[0.2em] uppercase opacity-90">
                      {currentStepData.subtitle}
                    </p>
                    <h2 className="text-white text-2xl font-bold leading-tight tracking-tight">
                      {currentStepData.title}
                    </h2>
                  </>
                )}
              </div>
              
              {/* Description */}
              <p className="text-white/70 text-base leading-relaxed px-2">
                {currentStepData.description}
              </p>

              {/* Features */}
              <div className="pt-2">
                <div className="flex flex-wrap justify-center gap-3">
                  {currentStepData.features.map((feature, index) => (
                    <div 
                      key={index}
                      className="flex items-center space-x-1.5 bg-white/5 backdrop-blur-sm px-3 py-2 rounded-full transition-all duration-300 hover:bg-white/10"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-primary/70" />
                      <span className="text-white/80 text-sm">
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Action with Safe Area Support */}
        <div className="absolute bottom-0 left-0 right-0 safe-area-bottom">
          <div className="p-5 pt-12 pb-6 safe-area-inset-bottom bg-gradient-to-t from-background via-background to-transparent">
            <div className="max-w-md mx-auto w-full">
              <button
                className="w-full rounded-full py-4 px-6 flex items-center justify-center bg-primary hover:bg-primary/90 active:scale-[0.98] transition-all duration-200 shadow-xl shadow-primary/25 hover:shadow-primary/35 group disabled:opacity-70 disabled:cursor-not-allowed relative overflow-hidden"
                onClick={handleNext}
                disabled={isAnimating}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent w-full -translate-x-full group-hover:animate-shine" />
                
                <span className="text-white text-base font-medium mr-2 relative z-10">
                  {currentStep === onboardingSteps.length - 1 ? 'Get Started' : 'Continue'}
                </span>
                <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-1 transition-transform duration-300 relative z-10" />
              </button>

              {currentStep === onboardingSteps.length - 1 && (
                <div className="flex items-center justify-center mt-4 space-x-1.5">
                  <Check className="w-4 h-4 text-primary/70" />
                  <p className="text-center text-white/40 text-xs">
                    Start your aquatic journey today
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Shine Animation */}
      <style jsx>{`
        @keyframes shine {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shine {
          animation: shine 1.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

// Main Page Component with SafeAreaProvider
export default function OnboardingPage() {
  return (
    <SafeAreaProvider applySafeArea={false}>
      <OnboardingContent />
    </SafeAreaProvider>
  );
}