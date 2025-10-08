"use client";

import { useState } from "react";
import { X, MessageSquare, Phone, User, FileText } from "lucide-react";
import Button from "@/components/ui/Button";
import { 
  openSMSApp, 
  formatPhoneNumber, 
  isValidPhoneNumber,
  type SMSMessageData 
} from "@/lib/sms";

interface SMSConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (sendSMS: boolean) => void;
  customerName: string;
  customerPhone?: string;
  smsMessage: string;
  actionLabel: string; // "Confirm Reservation" or "Mark as Ready"
  isLoading?: boolean;
}

export function SMSConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  customerName,
  customerPhone,
  smsMessage,
  actionLabel,
  isLoading = false,
}: SMSConfirmationModalProps) {
  const [sendSMS, setSendSMS] = useState(true); // Default checked
  const hasValidPhone = customerPhone && isValidPhoneNumber(customerPhone);

  if (!isOpen) return null;

  const handleConfirm = () => {
    // If SMS is enabled and phone is valid, open SMS app
    if (sendSMS && hasValidPhone && customerPhone) {
      openSMSApp(customerPhone, smsMessage);
    }
    
    // Call the confirmation callback
    onConfirm(sendSMS && !!hasValidPhone);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                {actionLabel}
              </h2>
              <p className="text-sm text-foreground/60">
                Review and send SMS notification
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-2 rounded-lg hover:bg-white/5 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Customer Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-background rounded-lg">
              <User className="w-5 h-5 text-primary flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-foreground/60">Customer Name</p>
                <p className="text-sm font-medium text-foreground">
                  {customerName}
                </p>
              </div>
            </div>

            {hasValidPhone ? (
              <div className="flex items-center gap-3 p-3 bg-background rounded-lg">
                <Phone className="w-5 h-5 text-green-500 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-foreground/60">Phone Number</p>
                  <p className="text-sm font-medium text-foreground">
                    {formatPhoneNumber(customerPhone)}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                <Phone className="w-5 h-5 text-orange-500 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-orange-500/80">No Phone Number</p>
                  <p className="text-xs text-foreground/60">
                    SMS notification is not available for this customer
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* SMS Message Preview */}
          {hasValidPhone && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-foreground/60">
                <FileText className="w-4 h-4" />
                <span>SMS Message Preview</span>
              </div>
              <div className="p-4 bg-background rounded-lg border border-border">
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                  {smsMessage}
                </p>
              </div>
              <p className="text-xs text-foreground/40">
                Character count: {smsMessage.length} characters
              </p>
            </div>
          )}

          {/* SMS Checkbox */}
          {hasValidPhone && (
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendSMS}
                  onChange={(e) => setSendSMS(e.target.checked)}
                  disabled={isLoading}
                  className="mt-1 w-4 h-4 rounded border-primary/50 text-primary focus:ring-2 focus:ring-primary/20 cursor-pointer disabled:opacity-50"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    Send SMS Notification
                  </p>
                  <p className="text-xs text-foreground/60 mt-1">
                    Opens your device&apos;s SMS app with the message pre-filled. 
                    You&apos;ll just need to tap &quot;Send&quot;.
                  </p>
                </div>
              </label>
            </div>
          )}

          {/* Info Message */}
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <p className="text-xs text-blue-400">
              <strong>Note:</strong> {sendSMS && hasValidPhone 
                ? "Your device's SMS app will open automatically after confirming. The message will be pre-filled — just tap Send." 
                : hasValidPhone
                ? "SMS notification is disabled. Only the push notification will be sent."
                : "Push notification will be sent to the customer's device."}
            </p>
          </div>

          {/* Push Notification Info */}
          <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
            <div className="flex items-start gap-2">
              <MessageSquare className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-medium text-purple-400 mb-1">
                  📱 Push Notification
                </p>
                <p className="text-xs text-purple-300/80">
                  {actionLabel.includes("Confirm") 
                    ? "A push notification will be automatically sent: \"✅ Your reservation has been confirmed!\""
                    : "A push notification will be automatically sent: \"📦 Your reservation is ready for pickup!\""}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 p-6 border-t border-border">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processing...
              </span>
            ) : (
              actionLabel
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
