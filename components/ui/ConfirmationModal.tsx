'use client';

import { ReactNode } from 'react';
import {
  CheckCircle,
  AlertTriangle,
  Info,
  XCircle,
  X
} from 'lucide-react';
import Button from '@/components/ui/Button';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title: string;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
  children?: ReactNode;
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type = 'info',
  confirmText = 'OK',
  cancelText = 'Cancel',
  showCancel = false,
  children
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-6 h-6 text-success" />;
      case 'error':
        return <XCircle className="w-6 h-6 text-error" />;
      case 'warning':
        return <AlertTriangle className="w-6 h-6 text-warning" />;
      default:
        return <Info className="w-6 h-6 text-info" />;
    }
  };

  const getButtonColor = () => {
    switch (type) {
      case 'success':
        return 'bg-success hover:bg-success/90';
      case 'error':
        return 'bg-error hover:bg-error/90';
      case 'warning':
        return 'bg-warning hover:bg-warning/90';
      default:
        return 'bg-info hover:bg-info/90';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[10000] flex items-center justify-center p-4">
      <div className="bg-secondary border border-white/10 rounded-xl p-6 w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            {getIcon()}
            <h3 className="text-lg font-semibold text-white">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4 text-white/60 hover:text-white" />
          </button>
        </div>

        {/* Message */}
        <div className="mb-6">
          <p className="text-white/80 leading-relaxed">{message}</p>
          {children && (
            <div className="mt-4">
              {children}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex space-x-3">
          {showCancel && (
            <Button
              onClick={onClose}
              className="flex-1 bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-colors"
            >
              {cancelText}
            </Button>
          )}
          <Button
            onClick={() => {
              onConfirm?.();
              onClose();
            }}
            className={`${showCancel ? 'flex-1' : 'w-full'} ${getButtonColor()} transition-colors`}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}