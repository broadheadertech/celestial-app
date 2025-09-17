import { type ClassValue, clsx } from 'clsx';

// Utility for merging class names (similar to clsx but with better TypeScript support)
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

// Format currency for Philippine Peso
export function formatCurrency(amount: number, currency = 'PHP'): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

// Format date for display
export function formatDate(timestamp: number, options?: Intl.DateTimeFormatOptions): string {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };

  return new Intl.DateTimeFormat('en-US', options || defaultOptions).format(new Date(timestamp));
}

// Format date with time
export function formatDateTime(timestamp: number): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(timestamp));
}

// Calculate discount percentage
export function calculateDiscountPercentage(originalPrice: number, currentPrice: number): number {
  if (originalPrice <= 0 || currentPrice >= originalPrice) return 0;
  return Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
}

// Generate unique ID for guest sessions
export function generateId(prefix = 'id'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Debounce function for search inputs
export function debounce<T extends (...args: unknown[]) => void>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

// Validate email format
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validate phone number (basic validation)
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^[\+]?[\s\-\(\)]?[0-9]{10,14}$/;
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
}

// Validate password strength
export function validatePassword(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Truncate text with ellipsis
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substr(0, maxLength) + '...';
}

// Convert timestamp to relative time (e.g., "2 hours ago")
export function getRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const minute = 60 * 1000;
  const hour = minute * 60;
  const day = hour * 24;
  const week = day * 7;
  const month = day * 30;
  const year = day * 365;

  if (diff < minute) {
    return 'Just now';
  } else if (diff < hour) {
    const minutes = Math.floor(diff / minute);
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
  } else if (diff < day) {
    const hours = Math.floor(diff / hour);
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  } else if (diff < week) {
    const days = Math.floor(diff / day);
    return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  } else if (diff < month) {
    const weeks = Math.floor(diff / week);
    return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
  } else if (diff < year) {
    const months = Math.floor(diff / month);
    return `${months} ${months === 1 ? 'month' : 'months'} ago`;
  } else {
    const years = Math.floor(diff / year);
    return `${years} ${years === 1 ? 'year' : 'years'} ago`;
  }
}

// Get stock status with color
export function getStockStatus(stock: number): {
  status: string;
  color: string;
  textColor: string;
} {
  if (stock === 0) {
    return {
      status: 'Out of Stock',
      color: 'bg-error',
      textColor: 'text-error',
    };
  } else if (stock <= 10) {
    return {
      status: 'Low Stock',
      color: 'bg-warning',
      textColor: 'text-warning',
    };
  } else {
    return {
      status: 'In Stock',
      color: 'bg-success',
      textColor: 'text-success',
    };
  }
}

// Get order status color
export function getOrderStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'pending':
      return 'text-warning';
    case 'confirmed':
      return 'text-info';
    case 'processing':
      return 'text-info';
    case 'shipped':
      return 'text-success';
    case 'delivered':
      return 'text-success';
    case 'cancelled':
      return 'text-error';
    default:
      return 'text-muted';
  }
}

// Sleep function for delays
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Local storage helpers with error handling
export const storage = {
  get: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.warn('Error accessing localStorage:', error);
      return null;
    }
  },

  set: (key: string, value: string): boolean => {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.warn('Error setting localStorage:', error);
      return false;
    }
  },

  remove: (key: string): boolean => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.warn('Error removing from localStorage:', error);
      return false;
    }
  },

  getJSON: <T>(key: string): T | null => {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.warn('Error parsing JSON from localStorage:', error);
      return null;
    }
  },

  setJSON: <T>(key: string, value: T): boolean => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.warn('Error setting JSON to localStorage:', error);
      return false;
    }
  },
};