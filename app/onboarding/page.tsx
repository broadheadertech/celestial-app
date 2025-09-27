'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ArrowRight, Check } from 'lucide-react';
import Image from 'next/image';

const ONBOARDING_KEY = 'onboarding_completed';

// Simplified onboarding data
const onboardingSteps = [
  {
    id: 1,
    title: 'Welcome to Celestial Drakon Aquatics',
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

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [imageErrors, setImageErrors] = useState<{[key: number]: boolean}>({});

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
    <div className="min-h-screen bg-background flex flex-col safe-area-inset">
      {/* Mobile-optimized Header with larger touch targets */}
      <div className="absolute top-0 left-0 right-0 z-10 px-4 pt-4 pb-2">
        <div className="flex items-center justify-between max-w-6xl mx-auto w-full">
          <button
            onClick={handlePrevious}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
              currentStep === 0 
                ? 'opacity-0 pointer-events-none' 
                : 'opacity-100 bg-white/10 backdrop-blur-sm hover:bg-white/20'
            }`}
            disabled={currentStep === 0}
            aria-label="Previous step"
          >
            <ChevronLeft size={24} className="text-white" />
          </button>
          
          {/* Mobile-optimized Progress Dots */}
          <div className="flex items-center space-x-2">
            {onboardingSteps.map((_, index) => (
              <button
                key={index}
                onClick={() => goToStep(index)}
                className="p-1.5"
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
            className="text-white/60 hover:text-white transition-colors duration-300 text-sm font-medium px-3 py-1.5 rounded-full hover:bg-white/10"
          >
            Skip
          </button>
        </div>
      </div>

      {/* Main Content - Mobile-optimized Layout */}
      <div className="flex-1 flex flex-col relative">
        <div 
          className={`flex-1 transition-all duration-500 ${
            isAnimating ? 'opacity-0' : 'opacity-100'
          }`}
        >
          {/* Mobile-optimized Image Section - reduced height for better content visibility */}
          <div className="relative h-[40vh] w-full overflow-hidden">
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
                {/* Enhanced Gradient overlay for better text readability */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent/70 to-background" />
                
                {/* Step indicator overlay */}
                <div className="absolute top-4 right-4 bg-black/20 backdrop-blur-sm px-3 py-1.5 rounded-full">
                  <span className="text-white text-xs font-medium">
                    {currentStep + 1} / {onboardingSteps.length}
                  </span>
                </div>
              </>
            ) : (
              /* Mobile-optimized Fallback */
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

          {/* Mobile-optimized Content Section */}
          <div className="flex-1 flex flex-col justify-center px-5 py-6">
            <div className="text-center space-y-6">
              {/* Mobile-optimized Title Section */}
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
              
              {/* Mobile-optimized Description with better readability */}
              <p className="text-white/70 text-base leading-relaxed px-2">
                {currentStepData.description}
              </p>

              {/* Mobile-optimized Feature Display */}
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

        {/* Mobile-optimized Bottom Action */}
        <div className="absolute bottom-0 left-0 right-0 p-5 pt-12 pb-6">
          <div className="max-w-md mx-auto w-full">
            <button
              className="w-full rounded-full py-4 px-6 flex items-center justify-center bg-primary hover:bg-primary/90 active:scale-[0.98] transition-all duration-200 shadow-xl shadow-primary/25 hover:shadow-primary/35 group disabled:opacity-70 disabled:cursor-not-allowed relative overflow-hidden"
              onClick={handleNext}
              disabled={isAnimating}
            >
              {/* Subtle animated shine effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent w-full -translate-x-full group-hover:animate-shine" />
              
              <span className="text-white text-base font-medium mr-2 relative z-10">
                {currentStep === onboardingSteps.length - 1 ? 'Get Started' : 'Continue'}
              </span>
              <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-1 transition-transform duration-300 relative z-10" />
            </button>

            {/* Mobile-optimized hint on last page */}
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
      
      {/* Add global styles for shine animation */}
      <style jsx global>{`
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