// components/safe-area/SafeAreaComponents.tsx
'use client';

import React, { ReactNode } from 'react';
import { useSafeArea } from '../provider/SafeAreaProvider';
// ========================================
// Safe Area Header
// ========================================
interface SafeAreaHeaderProps {
  children: ReactNode;
  className?: string;
  sticky?: boolean;
  fixed?: boolean;
}

export function SafeAreaHeader({ 
  children, 
  className = '', 
  sticky = false,
  fixed = false 
}: SafeAreaHeaderProps) {
  const positionClass = fixed ? 'fixed' : sticky ? 'sticky' : 'relative';
  
  return (
    <header className={`${positionClass} top-0 left-0 right-0 z-50 safe-area-top ${className}`}>
      {children}
    </header>
  );
}

// ========================================
// Safe Area Footer
// ========================================
interface SafeAreaFooterProps {
  children: ReactNode;
  className?: string;
  fixed?: boolean;
}

export function SafeAreaFooter({ 
  children, 
  className = '', 
  fixed = false 
}: SafeAreaFooterProps) {
  const positionClass = fixed ? 'fixed' : 'relative';
  
  return (
    <footer className={`${positionClass} bottom-0 left-0 right-0 z-40 safe-area-inset-bottom ${className}`}>
      {children}
    </footer>
  );
}

// ========================================
// Safe Area Bottom Navigation
// ========================================
interface NavItem {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
}

interface SafeAreaBottomNavProps {
  items: NavItem[];
  className?: string;
}

export function SafeAreaBottomNav({ items, className = '' }: SafeAreaBottomNavProps) {
  return (
    <nav className={`fixed bottom-0 left-0 right-0 bg-white border-t safe-area-inset-bottom z-50 ${className}`}>
      <div className="flex justify-around items-center py-2">
        {items.map((item, index) => (
          <button
            key={index}
            onClick={item.onClick}
            className={`flex flex-col items-center gap-1 px-4 py-2 transition-colors ${
              item.active ? 'text-primary' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="w-6 h-6">
              {item.icon}
            </div>
            <span className="text-xs font-medium">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

// ========================================
// Safe Area Container
// ========================================
interface SafeAreaContainerProps {
  children: ReactNode;
  className?: string;
  applyTop?: boolean;
  applyBottom?: boolean;
  applyHorizontal?: boolean;
}

export function SafeAreaContainer({ 
  children, 
  className = '',
  applyTop = true,
  applyBottom = true,
  applyHorizontal = true
}: SafeAreaContainerProps) {
  const safeAreaClasses = [];
  
  if (applyTop) safeAreaClasses.push('safe-area-top');
  if (applyBottom) safeAreaClasses.push('safe-area-bottom');
  if (applyHorizontal) safeAreaClasses.push('safe-area-horizontal');
  
  return (
    <div className={`${safeAreaClasses.join(' ')} ${className}`}>
      {children}
    </div>
  );
}

// ========================================
// Safe Area Modal
// ========================================
interface SafeAreaModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  className?: string;
}

export function SafeAreaModal({ 
  isOpen, 
  onClose, 
  children, 
  title,
  className = '' 
}: SafeAreaModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] safe-area-container">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative h-full flex items-center justify-center p-4">
        <div className={`bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] flex flex-col ${className}`}>
          {/* Header */}
          {title && (
            <div className="px-6 py-4 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">{title}</h2>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
          )}
          
          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

// ========================================
// Safe Area Full Screen
// ========================================
interface SafeAreaFullScreenProps {
  children: ReactNode;
  className?: string;
}

export function SafeAreaFullScreen({ children, className = '' }: SafeAreaFullScreenProps) {
  return (
    <div className={`min-h-screen safe-area-container ${className}`}>
      {children}
    </div>
  );
}

// ========================================
// Safe Area ScrollView (with header/footer awareness)
// ========================================
interface SafeAreaScrollViewProps {
  children: ReactNode;
  className?: string;
  hasHeader?: boolean;
  hasFooter?: boolean;
  headerHeight?: number;
  footerHeight?: number;
}

export function SafeAreaScrollView({ 
  children, 
  className = '',
  hasHeader = false,
  hasFooter = false,
  headerHeight = 64,
  footerHeight = 64
}: SafeAreaScrollViewProps) {
  const { insets } = useSafeArea();
  
  const paddingTop = hasHeader ? headerHeight + insets.top : insets.top;
  const paddingBottom = hasFooter ? footerHeight + insets.bottom : insets.bottom;
  
  return (
    <div 
      className={`overflow-y-auto safe-area-horizontal ${className}`}
      style={{
        paddingTop: `${paddingTop}px`,
        paddingBottom: `${paddingBottom}px`,
      }}
    >
      {children}
    </div>
  );
}

// ========================================
// Safe Area Debug Overlay (for development)
// ========================================
export function SafeAreaDebugOverlay() {
  const { insets, statusBarHeight, isMobileApp, isInitialized } = useSafeArea();

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed top-2 right-2 bg-black/90 text-white p-3 rounded-lg text-xs font-mono z-[9999] shadow-xl">
      <div className="font-bold mb-2 text-primary">Safe Area Debug</div>
      <div className="space-y-1">
        <div>Initialized: {isInitialized ? '✅' : '⏳'}</div>
        <div>Mobile App: {isMobileApp ? '✅' : '❌'}</div>
        <div className="border-t border-white/20 my-2" />
        <div>Top: {insets.top}px</div>
        <div>Right: {insets.right}px</div>
        <div>Bottom: {insets.bottom}px</div>
        <div>Left: {insets.left}px</div>
        <div className="border-t border-white/20 my-2" />
        <div>Status Bar: {statusBarHeight}px</div>
      </div>
      
      {/* Visual indicators */}
      <div className="mt-3 text-[10px] opacity-70">
        <div className="text-blue-400">🔵 Top = Status bar + notch</div>
        <div className="text-green-400">🟢 Bottom = Home indicator</div>
      </div>
    </div>
  );
}

// ========================================
// Safe Area Action Button (floating button with safe area)
// ========================================
interface SafeAreaActionButtonProps {
  onClick: () => void;
  children: ReactNode;
  className?: string;
  position?: 'bottom-right' | 'bottom-left' | 'bottom-center';
}

export function SafeAreaActionButton({ 
  onClick, 
  children, 
  className = '',
  position = 'bottom-right'
}: SafeAreaActionButtonProps) {
  const positionClasses = {
    'bottom-right': 'right-4',
    'bottom-left': 'left-4',
    'bottom-center': 'left-1/2 -translate-x-1/2',
  };

  return (
    <button
      onClick={onClick}
      className={`fixed bottom-4 ${positionClasses[position]} z-50 safe-area-mb ${className}`}
    >
      {children}
    </button>
  );
}

// ========================================
// Safe Area Status Bar
// ========================================
interface SafeAreaStatusBarProps {
  backgroundColor?: string;
  className?: string;
}

export function SafeAreaStatusBar({ 
  backgroundColor = 'bg-primary',
  className = '' 
}: SafeAreaStatusBarProps) {
  const { statusBarHeight } = useSafeArea();

  if (statusBarHeight === 0) return null;

  return (
    <div 
      className={`w-full ${backgroundColor} ${className}`}
      style={{ height: `${statusBarHeight}px` }}
    />
  );
}

// ========================================
// Export all components
// ========================================
export const SafeArea = {
  Header: SafeAreaHeader,
  Footer: SafeAreaFooter,
  BottomNav: SafeAreaBottomNav,
  Container: SafeAreaContainer,
  Modal: SafeAreaModal,
  FullScreen: SafeAreaFullScreen,
  ScrollView: SafeAreaScrollView,
  DebugOverlay: SafeAreaDebugOverlay,
  ActionButton: SafeAreaActionButton,
  StatusBar: SafeAreaStatusBar,
};