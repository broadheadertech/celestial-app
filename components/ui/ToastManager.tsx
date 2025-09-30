'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import Toast, { ToastData } from './Toast';

interface ToastContextType {
  showToast: (toast: Omit<ToastData, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    // Return a safe fallback for SSR/static export
    return {
      showToast: () => {},
      removeToast: () => {},
    };
  }
  return context;
};

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider = ({ children }: ToastProviderProps) => {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const showToast = (toast: Omit<ToastData, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast = { ...toast, id };
    setToasts(prev => [...prev, newToast]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}

      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm w-full">
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            {...toast}
            onClose={removeToast}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

// Convenience hooks
export const useToastHelpers = () => {
  const { showToast } = useToast();

  return {
    success: (title: string, message?: string) =>
      showToast({ title, message, type: 'success' }),
    error: (title: string, message?: string) =>
      showToast({ title, message, type: 'error' }),
    warning: (title: string, message?: string) =>
      showToast({ title, message, type: 'warning' }),
    info: (title: string, message?: string) =>
      showToast({ title, message, type: 'info' }),
  };
};