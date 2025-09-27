'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ArrowRight, Search, ShoppingBag, Star, X, ImageIcon } from 'lucide-react';

const ONBOARDING_KEY = 'onboarding_completed';

// Professional onboarding data using brand colors
const onboardingSteps = [
  {
    id: 1,
    title: 'Welcome to Celestial Drakon Aquatics',
    subtitle: 'Your Premium Aquatic Partner',
    description: 'Discover exceptional aquatic life, premium equipment, and expert guidance for your aquarium journey',
    icon: Star,
    bgColor: 'bg-primary/10',
    borderColor: 'border-primary/20',
    features: ['Premium Fish Collection', 'Expert Guidance', 'Quality Guarantee']
  },
  {
    id: 2,
    title: 'Explore Our Collection',
    subtitle: 'Curated Excellence',
    description: 'Browse thousands of premium fish, state-of-the-art tanks, and professional-grade accessories',
    icon: Search,
    bgColor: 'bg-primary/10',
    borderColor: 'border-primary/20',
    features: ['Rare Fish Species', 'Premium Equipment', 'Complete Setups']
  },
  {
    id: 3,
    title: 'Reserve & Collect',
    subtitle: 'Seamless Experience',
    description: 'Reserve your favorites online and collect them at your convenience with our flexible pickup system',
    icon: ShoppingBag,
    bgColor: 'bg-primary/10',
    borderColor: 'border-primary/20',
    features: ['Easy Reservations', 'Flexible Pickup', 'Secure Payments']
  }
];

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

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

  const currentStepData = onboardingSteps[currentStep];
  const IconComponent = currentStepData.icon;

  return (
    <div className="min-h-screen bg-background flex flex-col safe-area-inset">
      {/* Mobile-optimized Header */}
      <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-6">
        <div className="flex items-center justify-between max-w-4xl mx-auto w-full">
          <button
            onClick={handlePrevious}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${
              currentStep === 0 
                ? 'opacity-30 cursor-not-allowed bg-transparent' 
                : 'opacity-100 bg-secondary hover:bg-white/10 active:bg-white/20'
            }`}
            disabled={currentStep === 0}
          >
            <ChevronLeft size={18} className="text-white" />
          </button>
          
          {/* Progress Bar */}
          <div className="flex-1 mx-4">
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${((currentStep + 1) / onboardingSteps.length) * 100}%`,
                }}
              />
            </div>
          </div>
          
          <button
            onClick={handleSkip}
            className="px-3 py-2 rounded-full bg-secondary hover:bg-white/10 active:bg-white/20 transition-colors duration-200"
          >
            <X size={16} className="text-white/80" />
          </button>
        </div>
      </div>

      {/* Main Content - Mobile Optimized */}
      <div className="flex-1 flex flex-col px-4 sm:px-6">
        <div 
          className={`flex-1 transition-all duration-300 ${
            isAnimating ? 'opacity-0 transform translate-y-4' : 'opacity-100 transform translate-y-0'
          }`}
        >
          <div className="max-w-2xl mx-auto w-full h-full flex flex-col">
            {/* Hero Section - Optimized for mobile */}
            <div className="text-center mb-8 sm:mb-12">
              {currentStep === 0 ? (
                /* Brand Introduction with Logo Placeholder */
                <div className="flex flex-col items-center">
                  {/* Logo Placeholder */}
                  <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full flex items-center justify-center mb-6 sm:mb-8 bg-secondary border-2 border-primary/20 shadow-2xl">
                    <ImageIcon className="w-12 h-12 sm:w-16 sm:h-16 text-primary" />
                  </div>
                  <div className="mb-4 sm:mb-6">
                    <h1 className="text-white text-2xl sm:text-4xl md:text-5xl font-bold mb-1 sm:mb-2">
                      Celestial
                    </h1>
                    <h1 className="text-primary text-2xl sm:text-4xl md:text-5xl font-bold">
                      Drakon Aquatics
                    </h1>
                  </div>
                </div>
              ) : (
                /* Step Icons */
                <div className="flex flex-col items-center mb-6 sm:mb-8">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center mb-4 sm:mb-6 shadow-2xl bg-primary">
                    <IconComponent size={28} className="text-white sm:w-8 sm:h-8" />
                  </div>
                </div>
              )}
            </div>

            {/* Content Section - Mobile Optimized */}
            <div className="flex-1 flex flex-col justify-center">
              <div className="text-center mb-8 sm:mb-12">
                <p className="text-primary text-xs sm:text-sm font-medium mb-2 sm:mb-3 tracking-widest uppercase">
                  {currentStepData.subtitle}
                </p>
                <h2 className="text-white text-xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6 leading-tight px-2">
                  {currentStepData.title}
                </h2>
                <p className="text-muted text-base sm:text-lg leading-6 sm:leading-7 max-w-xl mx-auto px-2">
                  {currentStepData.description}
                </p>
              </div>

              {/* Visual Element - Mobile Optimized */}
              <div className="flex justify-center mb-8 sm:mb-12">
                <div 
                  className={`w-full max-w-sm h-32 sm:h-40 rounded-2xl sm:rounded-3xl flex flex-col items-center justify-center relative overflow-hidden ${currentStepData.bgColor} backdrop-blur-sm ${currentStepData.borderColor} border`}
                >
                  {/* Background Pattern */}
                  <div className="absolute inset-0 opacity-5 bg-primary" />
                  
                  {/* Image Placeholder */}
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-secondary rounded-xl flex items-center justify-center mb-2 sm:mb-4">
                    <ImageIcon className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
                  </div>
                  
                  <div className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-primary/20">
                    <span className="text-xs sm:text-sm font-medium text-white">
                      Step {currentStep + 1} of {onboardingSteps.length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Features List - Mobile Optimized */}
              <div className="hidden sm:block">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 max-w-lg mx-auto">
                  {currentStepData.features.map((feature, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-center p-3 rounded-xl bg-secondary border border-white/10"
                    >
                      <span className="text-muted text-sm text-center">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Navigation - Mobile Optimized */}
        <div className="pb-6 sm:pb-8 pt-4">
          <div className="max-w-2xl mx-auto w-full">
            <button
              className="w-full rounded-xl sm:rounded-2xl py-3.5 sm:py-4 flex items-center justify-center bg-primary hover:bg-primary/90 active:scale-98 transition-all duration-200 shadow-lg hover:shadow-primary/25 group disabled:opacity-70 disabled:cursor-not-allowed"
              onClick={handleNext}
              disabled={isAnimating}
            >
              <span className="text-white text-base sm:text-lg font-bold mr-2">
                {currentStep === onboardingSteps.length - 1 ? 'Get Started' : 'Continue'}
              </span>
              <ArrowRight size={18} className="text-white group-hover:translate-x-1 transition-transform duration-200 sm:w-5 sm:h-5" />
            </button>

            {/* Step Indicator - Mobile Optimized */}
            <div className="flex justify-center mt-4 sm:mt-6 space-x-2">
              {onboardingSteps.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToStep(index)}
                  className="transition-all duration-200 hover:scale-110 active:scale-95 p-1"
                  aria-label={`Go to step ${index + 1}`}
                >
                  <div
                    className={`rounded-full transition-all duration-300 ${
                      index === currentStep 
                        ? 'w-6 sm:w-8 bg-primary' 
                        : 'w-2 bg-white/20 hover:bg-white/30'
                    }`}
                    style={{ height: '6px' }}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}