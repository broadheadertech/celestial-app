import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Eye,
  Package,
  CheckCircle,
  XCircle,
  X
} from 'lucide-react';

interface ActionItem {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'success' | 'danger' | 'info' | 'warning';
  show: boolean;
}

interface BottomSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  actions: ActionItem[];
}

export function BottomSheetModal({ isOpen, onClose, title, actions }: BottomSheetModalProps) {
  const [mounted, setMounted] = React.useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

  if (!mounted || !isOpen) return null;

  const getVariantClasses = (variant: string = 'default') => {
    const variants = {
      default: 'text-white hover:bg-white/10',
      success: 'text-green-400 hover:bg-green-500/10',
      danger: 'text-red-400 hover:bg-red-500/10',
      info: 'text-blue-400 hover:bg-blue-500/10',
      warning: 'text-yellow-400 hover:bg-yellow-500/10',
    };
    return variants[variant as keyof typeof variants] || variants.default;
  };

  const visibleActions = actions.filter(action => action.show);

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998] animate-fadeIn"
        onClick={onClose}
      />

      {/* Bottom Sheet */}
      <div className="fixed inset-x-0 bottom-0 z-[9999] animate-slideUp">
        <div className="bg-secondary/98 backdrop-blur-md border-t border-white/20 rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col">
          {/* Handle Bar */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-12 h-1.5 bg-white/20 rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/10 active:scale-95 transition-all touch-manipulation"
            >
              <X className="w-5 h-5 text-white/70" />
            </button>
          </div>

          {/* Actions */}
          <div className="overflow-y-auto overscroll-contain">
            <div className="p-4 space-y-2">
              {visibleActions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => {
                    action.onClick();
                    onClose();
                  }}
                  className={`w-full flex items-center gap-4 px-4 py-4 rounded-xl transition-all active:scale-[0.98] ${getVariantClasses(action.variant)}`}
                >
                  <div className="flex-shrink-0">{action.icon}</div>
                  <span className="text-base font-medium flex-1 text-left">
                    {action.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Safe Area Bottom Padding */}
          <div className="h-safe-bottom" />
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }

        .animate-slideUp {
          animation: slideUp 0.3s cubic-bezier(0.32, 0.72, 0, 1);
        }

        .h-safe-bottom {
          height: env(safe-area-inset-bottom, 16px);
        }
      `}</style>
    </>,
    document.body
  );
}

// Example usage component
export default function BottomSheetExample() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [selectedAction, setSelectedAction] = React.useState<string>('');

  const handleAction = (actionName: string) => {
    setSelectedAction(actionName);
    // Your action logic here
  };

  const actions: ActionItem[] = [
    {
      icon: <Eye className="w-5 h-5" />,
      label: 'View Details',
      onClick: () => handleAction('view'),
      variant: 'info',
      show: true,
    },
    {
      icon: <CheckCircle className="w-5 h-5" />,
      label: 'Confirm Order',
      onClick: () => handleAction('confirm'),
      variant: 'success',
      show: true,
    },
    {
      icon: <Package className="w-5 h-5" />,
      label: 'Start Processing',
      onClick: () => handleAction('process'),
      variant: 'default',
      show: true,
    },
    {
      icon: <Package className="w-5 h-5" />,
      label: 'Ready for Pickup',
      onClick: () => handleAction('ready'),
      variant: 'warning',
      show: false, // This will be hidden
    },
    {
      icon: <XCircle className="w-5 h-5" />,
      label: 'Cancel Order',
      onClick: () => handleAction('cancel'),
      variant: 'danger',
      show: true,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6 flex items-center justify-center">
      <div className="max-w-md w-full space-y-4">
        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6">
          <h2 className="text-2xl font-bold text-white mb-2">
            Bottom Sheet Modal Demo
          </h2>
          <p className="text-white/70 mb-6">
            Click the button below to open the bottom sheet modal with actions
          </p>
          <button
            onClick={() => setIsOpen(true)}
            className="w-full px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl active:scale-95 transition-all"
          >
            Open Actions Menu
          </button>

          {selectedAction && (
            <div className="mt-4 p-4 bg-green-500/20 border border-green-500/30 rounded-lg">
              <p className="text-green-400 text-sm">
                Selected action: <strong>{selectedAction}</strong>
              </p>
            </div>
          )}
        </div>

        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-3">Features:</h3>
          <ul className="space-y-2 text-white/70 text-sm">
            <li>✓ Smooth slide-up animation</li>
            <li>✓ Backdrop with blur effect</li>
            <li>✓ Touch-friendly interactions</li>
            <li>✓ Safe area support</li>
            <li>✓ Auto-close on action</li>
            <li>✓ Conditional action visibility</li>
            <li>✓ Variant-based styling</li>
          </ul>
        </div>
      </div>

      <BottomSheetModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Order Actions"
        actions={actions}
      />
    </div>
  );
}