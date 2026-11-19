export type ThemeMode = 'light' | 'dark';

export type OrderStatus =
  | 'Pending'
  | 'Confirmed'
  | 'Processing'
  | 'Shipped'
  | 'Out for Delivery'
  | 'Delivered'
  | 'Cancelled'
  | 'Returned'
  | 'Refunded';

export type PaymentMethod = 'COD' | 'UPI' | 'CARD' | 'NETBANKING';
export type PaymentStatus = 'Pending' | 'Test-Authorized' | 'Paid' | 'Failed' | 'Refunded';
export type PaymentMode = 'COD' | 'TEST_MODE' | 'LIVE';

export interface ProductVariant {
  id: string;
  label: string;
  colorHex?: string;
  priceDelta: number;
  stockQty: number;
}

export interface ProductSpec {
  key: string;
  value: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  active: boolean;
  sortOrder: number;
  subcategories: string[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  sku: string;
  categoryId: string;
  categoryName: string;
  subcategory: string;
  description: string;
  images: string[];
  sellingPrice: number;
  mrp: number;
  discountPercent: number;
  gstPercent: number;
  hsnCode: string;
  stockQty: number;
  variants: ProductVariant[];
  dimensions: string;
  weight: string;
  specifications: ProductSpec[];
  status: 'active' | 'draft' | 'archived';
  featured: boolean;
  trending: boolean;
  bestseller: boolean;
  newArrival: boolean;
  isDemoData: boolean;
  ratingAvg: number;
  reviewCount: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface CartItem {
  id: string;
  userId?: string;
  productId: string;
  variantId: string;
  variantLabel: string;
  name: string;
  slug: string;
  sku: string;
  image: string;
  sellingPrice: number;
  mrp: number;
  gstPercent: number;
  quantity: number;
  updatedAt?: unknown;
}

export interface WishlistItem {
  id: string;
  userId?: string;
  productId: string;
  name: string;
  slug: string;
  image: string;
  sellingPrice: number;
  mrp: number;
  addedAt?: unknown;
}

export interface Address {
  id: string;
  userId: string;
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  label: 'Home' | 'Office' | 'Other';
  isDefault: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface OrderStatusStep {
  status: OrderStatus;
  note: string;
  timestampIso: string;
}

export interface OrderItem {
  productId: string;
  variantId: string;
  variantLabel: string;
  name: string;
  slug: string;
  sku: string;
  image: string;
  sellingPrice: number;
  mrp: number;
  gstPercent: number;
  quantity: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: {
    fullName: string;
    phone: string;
    line1: string;
    line2?: string;
    landmark?: string;
    city: string;
    state: string;
    pincode: string;
    label: string;
  };
  shippingMethod: 'Standard' | 'Express';
  items: OrderItem[];
  subtotal: number;
  discountTotal: number;
  couponCode: string;
  gstTotal: number;
  shippingCharge: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentMode: PaymentMode;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  status: OrderStatus;
  trackingNumber?: string;
  statusHistory: OrderStatusStep[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface PaymentRecord {
  id: string;
  orderId: string;
  orderNumber: string;
  userId: string;
  amount: number;
  currency: 'INR';
  method: PaymentMethod;
  mode: PaymentMode;
  status: PaymentStatus;
  gatewayRef: string;
  createdAt?: unknown;
}

export interface Coupon {
  id: string;
  code: string;
  type: 'PERCENT' | 'FLAT';
  value: number;
  minOrderAmount: number;
  maxDiscount: number;
  description: string;
  active: boolean;
  usageCount: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Banner {
  id: string;
  title: string;
  subtitle: string;
  ctaText: string;
  ctaLink: string;
  image: string;
  active: boolean;
  sortOrder: number;
  updatedAt?: unknown;
}

export interface Review {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  verifiedPurchase?: boolean;
  verifiedOrderId?: string;
  status: 'approved' | 'pending' | 'rejected' | 'hidden';
  createdAt?: unknown;
}

export interface StoreSettings {
  storeName: string;
  supportEmail: string;
  whatsappNumber: string;
  whatsappGreeting: string;
  freeShippingThreshold: number;
  standardShippingFee: number;
  expressShippingFee: number;
  announcementText: string;
  updatedAt?: unknown;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  phone?: string;
  photoURL?: string;
  defaultAddressId?: string;
  themePreference?: ThemeMode;
  emailAlerts?: boolean;
  whatsappAlerts?: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'order' | 'promo' | 'system';
  orderId?: string;
  read: boolean;
  createdAt?: unknown;
}

export interface SupportTicket {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  status: 'open' | 'in_progress' | 'resolved';
  createdAt?: unknown;
}
