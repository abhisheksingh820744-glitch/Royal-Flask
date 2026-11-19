import type { CartItem, Order, Product } from '../types/ecommerce';

export function formatINR(amount: number): string {
  const value = Number.isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function isValidIndianPin(pin: string): boolean {
  return /^[1-9][0-9]{5}$/.test(pin.trim());
}

export function isValidIndianPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 12;
}

export function sanitizeText(value: string, maxLength = 500): string {
  return value.replace(/[<>]/g, '').trim().slice(0, maxLength);
}

export function formatFirestoreDate(val: unknown): string {
  if (!val) return 'Just now';
  if (typeof val === 'string') {
    const d = new Date(val);
    return Number.isNaN(d.getTime()) ? val : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  if (typeof val === 'object' && val !== null && 'toDate' in val && typeof (val as { toDate: () => Date }).toDate === 'function') {
    return (val as { toDate: () => Date }).toDate().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }
  if (typeof val === 'object' && val !== null && 'seconds' in val) {
    return new Date((val as { seconds: number }).seconds * 1000).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }
  return 'Recent';
}

export function computeCartTotals(
  items: CartItem[],
  freeShippingThreshold: number,
  standardShippingFee: number,
  shippingMethod: 'Standard' | 'Express',
  expressShippingFee: number,
  couponDiscount = 0,
) {
  let subtotal = 0;
  let mrpTotal = 0;
  let gstIncluded = 0;

  for (const item of items) {
    const lineTotal = item.sellingPrice * item.quantity;
    subtotal += lineTotal;
    mrpTotal += item.mrp * item.quantity;
    const rate = item.gstPercent || 18;
    gstIncluded += lineTotal - lineTotal / (1 + rate / 100);
  }

  const productSavings = Math.max(0, mrpTotal - subtotal);
  const netMerchandise = Math.max(0, subtotal - couponDiscount);
  const shippingCharge =
    items.length === 0
      ? 0
      : shippingMethod === 'Express'
        ? expressShippingFee
        : netMerchandise >= freeShippingThreshold
          ? 0
          : standardShippingFee;

  const totalAmount = Math.max(0, Math.round(netMerchandise + shippingCharge));

  return {
    subtotal: Math.round(subtotal),
    mrpTotal: Math.round(mrpTotal),
    productSavings: Math.round(productSavings),
    couponDiscount: Math.round(couponDiscount),
    gstIncluded: Math.round(gstIncluded),
    shippingCharge: Math.round(shippingCharge),
    totalAmount,
  };
}

export function buildWhatsAppUrl(phoneNumber: string, message: string): string {
  const digits = phoneNumber.replace(/\D/g, '') || '919800000000';
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function buildProductEnquiryMessage(product: Product, variantLabel?: string): string {
  const url = `${window.location.origin}/product/${product.slug}`;
  return [
    `Hello ROYAL FLASK Team,`,
    `I would like to enquire about:`,
    `Product: ${product.name}`,
    `SKU: ${product.sku}`,
    variantLabel ? `Variant: ${variantLabel}` : null,
    `Price: ${formatINR(product.sellingPrice)}`,
    `Link: ${url}`,
  ]
    .filter(Boolean)
    .join('\n');
}

export function buildShareProductMessage(product: Product): string {
  const url = `${window.location.origin}/product/${product.slug}`;
  return `Check out ${product.name} from ROYAL FLASK (${formatINR(product.sellingPrice)}): ${url}`;
}

export function buildCartWhatsAppMessage(items: CartItem[], totalAmount: number): string {
  const lines = items.map(
    (item, idx) =>
      `${idx + 1}. ${item.name} (${item.variantLabel || 'Standard'}) x ${item.quantity} — ${formatINR(item.sellingPrice * item.quantity)}`,
  );
  return [
    `Hello ROYAL FLASK, I would like assistance with my shopping bag:`,
    ...lines,
    `Estimated Total: ${formatINR(totalAmount)}`,
  ].join('\n');
}

export function buildOrderWhatsAppMessage(order: Order): string {
  return [
    `Hello ROYAL FLASK Support,`,
    `Order Enquiry for Order ID: ${order.orderNumber}`,
    `Current Status: ${order.status}`,
    `Order Total: ${formatINR(order.totalAmount)}`,
    `Please share an update on delivery.`,
  ].join('\n');
}

export const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Delhi',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jammu and Kashmir',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
];
