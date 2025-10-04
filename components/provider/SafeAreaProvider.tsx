// components/providers/SafeAreaProvider.tsx
'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

// Type definitions for Safe Area
interface SafeAreaInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

interface SafeAreaContextType {
  insets: SafeAreaInsets;
  statusBarHeight: number;
  isInitialized: boolean;
  isMobileApp: boolean;
}

// Create context
const SafeAreaContext = createContext<SafeAreaContextType>({
  insets: { top: 0, right: 0, bottom: 0, left: 0 },
  statusBarHeight: 0,
  isInitialized: false,
  isMobileApp: false,
});

// Custom hook to use safe area
export const useSafeArea = () => {
  const context = useContext(SafeAreaContext);
  if (!context) {
    throw new Error('useSafeArea must be used within SafeAreaProvider');
  }
  return context;
};

interface SafeAreaProviderProps {
  children: ReactNode;
  className?: string;
  applySafeArea?: boolean; // Option to apply safe area padding to wrapper
}

export default function SafeAreaProvider({ 
  children, 
  className = '',
  applySafeArea = false 
}: SafeAreaProviderProps) {
  const [insets, setInsets] = useState<SafeAreaInsets>({ 
    top: 0, 
    right: 0, 
    bottom: 0, 
    left: 0 
  });
  const [statusBarHeight, setStatusBarHeight] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isMobileApp, setIsMobileApp] = useState(false);

  useEffect(() => {
    let cleanupListener: (() => Promise<void>) | null = null;

    const initializeSafeArea = async () => {
      try {
        // Check if we're in a Capacitor environment
        if (typeof window !== 'undefined' && (window as any).Capacitor) {
          const { SafeArea } = await import('capacitor-plugin-safe-area');
          
          setIsMobileApp(true);

          // Get initial safe area insets
          const { insets: initialInsets } = await SafeArea.getSafeAreaInsets();
          setInsets(initialInsets);
          
          // Apply CSS variables for safe area
          applyCSSVariables(initialInsets);
          
          // Listen for safe area changes (orientation changes, etc.)
          const listener = await SafeArea.addListener('safeAreaChanged', (data) => {
            const { insets: updatedInsets } = data;
            setInsets(updatedInsets);
            applyCSSVariables(updatedInsets);
          });
          
          // Get status bar height
          try {
            const { statusBarHeight: height } = await SafeArea.getStatusBarHeight();
            setStatusBarHeight(height);
            document.documentElement.style.setProperty(
              '--status-bar-height',
              `${height}px`
            );
          } catch (error) {
            console.warn('Status bar height not available:', error);
          }

          // Store cleanup function
          cleanupListener = async () => {
            try {
              await SafeArea.removeAllListeners();
            } catch (error) {
              console.error('Error removing safe area listeners:', error);
            }
          };

          setIsInitialized(true);
        } else {
          // Web environment - use CSS env() fallbacks
          setIsMobileApp(false);
          setIsInitialized(true);
          applyWebFallbacks();
        }
      } catch (error) {
        console.error('Error initializing safe area:', error);
        setIsInitialized(true);
        applyWebFallbacks();
      }
    };

    initializeSafeArea();

    // Cleanup on unmount
    return () => {
      if (cleanupListener) {
        cleanupListener();
      }
    };
  }, []);

  // Apply CSS variables for safe area
  const applyCSSVariables = (safeInsets: SafeAreaInsets) => {
    const entries = Object.entries(safeInsets) as [keyof SafeAreaInsets, number][];
    entries.forEach(([key, value]) => {
      document.documentElement.style.setProperty(
        `--safe-area-inset-${key}`,
        `${value}px`
      );
    });
  };

  // Apply web fallbacks using env()
  const applyWebFallbacks = () => {
    const fallbacks = ['top', 'right', 'bottom', 'left'];
    fallbacks.forEach((direction) => {
      document.documentElement.style.setProperty(
        `--safe-area-inset-${direction}`,
        `env(safe-area-inset-${direction}, 0px)`
      );
    });
  };

  const contextValue: SafeAreaContextType = {
    insets,
    statusBarHeight,
    isInitialized,
    isMobileApp,
  };

  return (
    <SafeAreaContext.Provider value={contextValue}>
      <div className={`${applySafeArea ? 'safe-area-container' : ''} ${className}`}>
        {children}
      </div>

      {/* Global Safe Area Styles */}
      <style jsx global>{`
        /* Safe Area CSS Variables - Fallbacks for web */
        :root {
          --safe-area-inset-top: env(safe-area-inset-top, 0px);
          --safe-area-inset-right: env(safe-area-inset-right, 0px);
          --safe-area-inset-bottom: env(safe-area-inset-bottom, 0px);
          --safe-area-inset-left: env(safe-area-inset-left, 0px);
          --status-bar-height: 0px;
        }

        /* Safe Area Utility Classes */
        .safe-area-container {
          padding-top: var(--safe-area-inset-top);
          padding-right: var(--safe-area-inset-right);
          padding-bottom: var(--safe-area-inset-bottom);
          padding-left: var(--safe-area-inset-left);
        }

        .safe-area-top {
          padding-top: var(--safe-area-inset-top);
        }

        .safe-area-right {
          padding-right: var(--safe-area-inset-right);
        }

        .safe-area-bottom {
          padding-bottom: var(--safe-area-inset-bottom);
        }

        .safe-area-left {
          padding-left: var(--safe-area-inset-left);
        }

        /* Combined safe areas */
        .safe-area-horizontal {
          padding-left: var(--safe-area-inset-left);
          padding-right: var(--safe-area-inset-right);
        }

        .safe-area-vertical {
          padding-top: var(--safe-area-inset-top);
          padding-bottom: var(--safe-area-inset-bottom);
        }

        /* Safe area with minimum padding */
        .safe-area-inset-top {
          padding-top: max(1rem, var(--safe-area-inset-top));
        }

        .safe-area-inset-bottom {
          padding-bottom: max(1.5rem, var(--safe-area-inset-bottom));
        }

        /* Status bar specific */
        .status-bar-height {
          padding-top: var(--status-bar-height);
        }

        /* Margin variants */
        .safe-area-mt {
          margin-top: var(--safe-area-inset-top);
        }

        .safe-area-mb {
          margin-bottom: var(--safe-area-inset-bottom);
        }

        .safe-area-ml {
          margin-left: var(--safe-area-inset-left);
        }

        .safe-area-mr {
          margin-right: var(--safe-area-inset-right);
        }

        /* Prevent content from being hidden behind system UI */
        @supports (padding: max(0px)) {
          .safe-area-container {
            padding-top: max(var(--safe-area-inset-top), env(safe-area-inset-top, 0px));
            padding-bottom: max(var(--safe-area-inset-bottom), env(safe-area-inset-bottom, 0px));
            padding-left: max(var(--safe-area-inset-left), env(safe-area-inset-left, 0px));
            padding-right: max(var(--safe-area-inset-right), env(safe-area-inset-right, 0px));
          }
        }

        /* iOS specific safe area handling */
        @supports (-webkit-touch-callout: none) {
          .safe-area-container {
            padding-top: max(var(--safe-area-inset-top), env(safe-area-inset-top, 0px));
            padding-bottom: max(var(--safe-area-inset-bottom), env(safe-area-inset-bottom, 20px));
          }
        }
      `}</style>
    </SafeAreaContext.Provider>
  );
}