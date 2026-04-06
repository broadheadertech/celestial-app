/**
 * SMS Utility Module
 * Handles SMS link generation and message templates
 */

export interface SMSMessageData {
  customerName: string;
  reservationCode: string;
  productName: string;
  quantity: number;
  pickupLocation?: string;
  pickupDate?: string;
  pickupTime?: string;
  notes?: string;
}

/**
 * Generate SMS message for reservation confirmation
 */
export function getConfirmationSMSMessage(data: SMSMessageData): string {
  const { customerName, reservationCode, productName, quantity } = data;
  
  return `Hi ${customerName}! Your reservation ${reservationCode} for ${quantity}x ${productName} has been CONFIRMED. Thank you for choosing Dragon Cave Inventory!`;
}

/**
 * Generate SMS message for ready for pickup
 */
export function getReadyForPickupSMSMessage(data: SMSMessageData): string {
  const { 
    customerName, 
    reservationCode, 
    productName, 
    quantity, 
    pickupLocation,
    pickupDate,
    pickupTime,
    notes 
  } = data;
  
  let message = `Hi ${customerName}! Your reservation ${reservationCode} for ${quantity}x ${productName} is now READY FOR PICKUP!`;
  
  if (pickupLocation) {
    message += ` Location: ${pickupLocation}.`;
  }
  
  if (pickupDate && pickupTime) {
    message += ` Please pick up on ${pickupDate} at ${pickupTime}.`;
  }
  
  if (notes) {
    message += ` Note: ${notes}`;
  }
  
  message += ` - Dragon Cave Inventory`;
  
  return message;
}

/**
 * Detect if the device is iOS
 */
function isIOS(): boolean {
  if (typeof window === 'undefined') return false;
  
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

/**
 * Generate SMS link that opens device's SMS app
 * Handles both iOS (&body=) and Android (?body=) formats
 * 
 * @param phoneNumber - Phone number to send SMS to (include country code if needed)
 * @param message - Pre-filled message content
 * @returns SMS protocol link
 */
export function generateSMSLink(phoneNumber: string, message: string): string {
  // Remove any non-numeric characters except + for country code
  const cleanNumber = phoneNumber.replace(/[^\d+]/g, '');
  
  // Encode the message for URL
  const encodedMessage = encodeURIComponent(message);
  
  // iOS uses &body= while Android uses ?body=
  // Using &body= works for both, but some Android versions prefer ?body=
  // We'll use the iOS format as it's more universally supported
  const separator = isIOS() ? '&' : '?';
  
  return `sms:${cleanNumber}${separator}body=${encodedMessage}`;
}

/**
 * Open SMS app with pre-filled message
 * Works on web, Android, and iOS
 * 
 * @param phoneNumber - Phone number to send SMS to
 * @param message - Pre-filled message content
 */
export function openSMSApp(phoneNumber: string, message: string): void {
  const smsLink = generateSMSLink(phoneNumber, message);
  
  // Open SMS app
  if (typeof window !== 'undefined') {
    window.location.href = smsLink;
  }
}

/**
 * Validate phone number format
 * Accepts formats like: +639123456789, 09123456789, 9123456789
 */
export function isValidPhoneNumber(phone: string): boolean {
  if (!phone) return false;
  
  // Remove spaces, dashes, parentheses
  const cleaned = phone.replace(/[\s\-()]/g, '');
  
  // Check if it's a valid format
  // Philippines format: starts with +63 or 0, followed by 9-10 digits
  const phoneRegex = /^(\+63|0)?[0-9]{9,10}$/;
  
  return phoneRegex.test(cleaned);
}

/**
 * Format phone number for display
 * Converts: 09123456789 → +63 912 345 6789
 */
export function formatPhoneNumber(phone: string): string {
  if (!phone) return '';
  
  // Remove all non-numeric characters except +
  const cleaned = phone.replace(/[^\d+]/g, '');
  
  // If it starts with 0, replace with +63
  if (cleaned.startsWith('0')) {
    const withCountryCode = '+63' + cleaned.substring(1);
    // Format: +63 912 345 6789
    return withCountryCode.replace(/(\+63)(\d{3})(\d{3})(\d{4})/, '$1 $2 $3 $4');
  }
  
  // If it already has +63
  if (cleaned.startsWith('+63')) {
    return cleaned.replace(/(\+63)(\d{3})(\d{3})(\d{4})/, '$1 $2 $3 $4');
  }
  
  // If it's just the 10-digit number
  if (cleaned.length === 10) {
    return '+63 ' + cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3');
  }
  
  // Return as-is if format is unknown
  return phone;
}

/**
 * Check if SMS functionality is available
 * SMS links work on all modern browsers and devices
 */
export function isSMSAvailable(): boolean {
  return typeof window !== 'undefined';
}

/**
 * Get SMS message based on reservation status
 */
export function getSMSMessageForStatus(
  status: 'confirmed' | 'ready_for_pickup',
  data: SMSMessageData
): string {
  switch (status) {
    case 'confirmed':
      return getConfirmationSMSMessage(data);
    case 'ready_for_pickup':
      return getReadyForPickupSMSMessage(data);
    default:
      return '';
  }
}
