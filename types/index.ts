// Celestial Drakon Aquatics - Type Definitions
// Migrated from React Native app to Next.js

export interface User {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: "client" | "admin" | "super_admin";
  isActive?: boolean;
  // Facebook integration fields
  facebookId?: string;
  profilePicture?: string;
  loginMethod?: "email" | "facebook"; // Optional to support existing users
  createdAt: number;
  updatedAt: number;
}

export interface Category {
  _id: string;
  name: string;
  description?: string;
  image?: string;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Product {
  _id: string;
  name: string;
  description?: string;
  price: number;
  originalPrice?: number;
  categoryId: string;
  image: string;
  images?: string[];
  certificate?: string;
  sku?: string | number;
  stock: number;
  rating?: number;
  reviews?: number;
  badge?: string;
  productStatus?: string;
  lifespan?: string;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

// Product-specific data types
export interface FishData {
  productId: string;
  scientificName: string;
  weight?: number;
  size: number;
  temperature: number;
  age: number;
  phLevel: string;
  lifespan: string;
  origin: string;
  diet: string;
}

export interface TankData {
  productId: string;
  tankType: string;
  material: string;
  capacity: number;
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  weight?: number;
  thickness: number;
  lighting: number;
  filtation: number;
}

export interface CartItem {
  userId?: string;
  guestId?: string;
  productId: string;
  quantity: number;
  createdAt: number;
  updatedAt: number;
  // Populated product data
  product?: Product;
}

export interface OrderItem {
  productId: string;
  quantity: number;
  price: number;
}

export interface ShippingAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface Order {
  _id: string;
  userId: string;
  status: "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled";
  items: OrderItem[];
  totalAmount: number;
  shippingAddress: ShippingAddress;
  paymentMethod: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface GuestInfo {
  name: string;
  email: string;
  phone: string;
  completeAddress?: string;
  pickupSchedule?: {
    date: string; // ISO date string
    time: string; // Time string (e.g., "14:30")
  };
  notes?: string; // Instructions/notes for pickup
}

export interface ReservationItem {
  productId: string;
  quantity: number;
  reservedPrice: number; // Price at time of reservation
}

export interface Reservation {
  _id: string;
  reservationCode?: string; // Unique code for the reservation (e.g., "RES-001234")
  userId?: string; // Optional for guest users
  guestId?: string; // For guest users
  guestInfo?: GuestInfo; // Guest contact information
  // Multi-item structure
  items?: ReservationItem[];
  totalAmount?: number; // Total amount for all items
  totalQuantity?: number; // Total quantity of all items
  // Legacy single-item fields (for backward compatibility)
  productId?: string; // Legacy single product ID
  quantity?: number; // Legacy single quantity
  reservationDate: number;
  expiryDate: number;
  status: "pending" | "confirmed" | "ready_for_pickup" | "completed" | "expired" | "cancelled";
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Wishlist {
  userId: string;
  productId: string;
  createdAt: number;
}

export interface Notification {
  _id: string;
  title: string;
  message: string;
  type: "reservation" | "order" | "user" | "product" | "payment" | "alert" | "warning" | "success" | "system";
  isRead: boolean;
  priority: "low" | "medium" | "high" | "urgent";
  // Reference IDs for context
  relatedId?: string; // Can be orderId, reservationId, userId, etc.
  relatedType?: string; // Type of the related entity
  // Metadata for additional context
  metadata?: {
    customerName?: string;
    customerEmail?: string;
    productName?: string;
    amount?: number;
    status?: string;
  };
  createdAt: number;
  updatedAt: number;
}

// Auth related types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  password: string;
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  guestId?: string;
}

// UI Component types
export interface ButtonProps {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "xs" | "sm" | "md" | "lg";
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
}

export interface InputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "email" | "password" | "number" | "tel";
  required?: boolean;
  disabled?: boolean;
  error?: string;
  className?: string;
}

// Dashboard & Analytics types
export interface DashboardStats {
  totalRevenue: number;
  totalUsers: number;
  newUsersThisMonth: number;
  totalOrders: number;
  pendingOrders: number;
  totalReservations: number;
  pendingReservations: number;
  activeProducts: number;
  lowStockProducts: number;
}

export interface AnalyticsData {
  salesTrend: { date: string; revenue: number }[];
  topProducts: { productId: string; productName: string; sales: number }[];
  userGrowth: { date: string; users: number }[];
  orderStatus: { status: string; count: number }[];
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Filter and Sort types
export interface ProductFilters {
  categoryId?: string;
  isActive?: boolean;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  search?: string;
}

export interface ProductSort {
  field: "name" | "price" | "createdAt" | "rating" | "stock";
  direction: "asc" | "desc";
}

// Guest mode types
export interface GuestSession {
  guestId: string;
  createdAt: number;
  lastActivity: number;
  cartItems?: number;
  reservations?: number;
}