import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  MapPin,
  MessageCircle,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Tag,
  Trash2,
} from 'lucide-react';
import {
  doc,
  getDoc,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { sendEmailVerification } from 'firebase/auth';
import { useStore } from '../context/StoreContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  buildCartWhatsAppMessage,
  buildOrderWhatsAppMessage,
  buildWhatsAppUrl,
  computeCartTotals,
  formatINR,
  INDIAN_STATES,
  isValidIndianPhone,
  isValidIndianPin,
  sanitizeText,
} from '../lib/formatters';
import { SeoHead } from '../components/SeoHead';
import { SmartImage } from '../components/SmartImage';
import type { Address, Coupon, Order, PaymentMethod } from '../types/ecommerce';

export function CartPage() {
  const { cart, updateCartQuantity, removeFromCart, settings } = useStore();
  const totals = computeCartTotals(
    cart,
    settings.freeShippingThreshold,
    settings.standardShippingFee,
    'Standard',
    settings.expressShippingFee,
  );

  const waUrl = buildWhatsAppUrl(
    settings.whatsappNumber,
    buildCartWhatsAppMessage(cart, totals.totalAmount),
  );

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <SeoHead title="Shopping Bag – ROYAL FLASK" description="Review your ROYAL FLASK shopping bag and proceed to checkout." />
      <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#0B1D3A] dark:text-white mb-8">
        Shopping Bag
      </h1>

      {cart.length === 0 ? (
        <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-14 text-center bg-white dark:bg-[#0D1526]">
          <ShoppingBag className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Your shopping bag is empty</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Add flasks, cookware, lunch boxes, or tableware to begin checkout.
          </p>
          <Link
            to="/shop"
            className="inline-block mt-6 px-6 py-3 text-sm font-semibold text-white bg-[#0B1D3A] dark:bg-[#2449B5] rounded-lg"
          >
            Browse Catalog
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 space-y-4">
            {cart.map((item) => (
              <div
                key={item.id}
                className="flex gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1526]"
              >
                <Link to={`/product/${item.slug}`} className="w-24 h-24 rounded-lg overflow-hidden bg-slate-100 shrink-0">
                  <SmartImage src={item.image} alt={item.name} className="w-full h-full object-cover" />
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <Link
                        to={`/product/${item.slug}`}
                        className="text-base font-semibold text-slate-900 dark:text-white hover:text-[#2449B5]"
                      >
                        {item.name}
                      </Link>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {item.variantLabel} · SKU {item.sku} · GST {item.gstPercent}%
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.id)}
                      aria-label={`Remove ${item.name}`}
                      className="text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <div className="inline-flex items-center border border-slate-300 dark:border-slate-700 rounded-lg">
                      <button
                        type="button"
                        onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                        className="p-2"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-3 text-sm font-mono-tabular font-semibold">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                        className="p-2"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="text-right">
                      <span className="text-base font-mono-tabular font-bold text-[#0B1D3A] dark:text-white">
                        {formatINR(item.sellingPrice * item.quantity)}
                      </span>
                      {item.mrp > item.sellingPrice && (
                        <p className="text-xs font-mono-tabular line-through text-slate-400">
                          {formatINR(item.mrp * item.quantity)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <aside className="lg:col-span-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1526] p-6 space-y-4">
            <h2 className="font-display text-2xl font-bold text-[#0B1D3A] dark:text-white">Order Summary</h2>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Subtotal</span>
                <span className="font-mono-tabular font-semibold">{formatINR(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Included GST</span>
                <span className="font-mono-tabular">{formatINR(totals.gstIncluded)}</span>
              </div>
              <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
                <span>Product Savings</span>
                <span className="font-mono-tabular">-{formatINR(totals.productSavings)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Standard Shipping</span>
                <span className="font-mono-tabular">
                  {totals.shippingCharge === 0 ? 'FREE' : formatINR(totals.shippingCharge)}
                </span>
              </div>
            </div>
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-between text-lg font-bold text-[#0B1D3A] dark:text-white">
              <span>Payable Total</span>
              <span className="font-mono-tabular">{formatINR(totals.totalAmount)}</span>
            </div>

            <Link
              to="/checkout"
              className="block w-full py-3.5 px-4 text-center text-sm font-semibold text-white bg-[#0B1D3A] hover:bg-[#2449B5] dark:bg-[#2449B5] rounded-lg transition-colors"
            >
              Proceed to Checkout
            </Link>
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-4 inline-flex items-center justify-center gap-2 text-xs font-semibold border border-emerald-600/35 text-emerald-700 dark:text-emerald-400 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Share Cart Summary on WhatsApp</span>
            </a>
          </aside>
        </div>
      )}
    </main>
  );
}

export function CheckoutPage() {
  const {
    user,
    cart,
    addresses,
    coupons,
    settings,
    clearCart,
    notifyToast,
  } = useStore();
  const navigate = useNavigate();

  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [customerName, setCustomerName] = useState(user?.displayName || '');
  const [customerPhone, setCustomerPhone] = useState('');
  const [line1, setLine1] = useState('');
  const [line2, setLine2] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('Maharashtra');
  const [pincode, setPincode] = useState('');
  const [addressLabel, setAddressLabel] = useState<'Home' | 'Office' | 'Other'>('Home');

  const [shippingMethod, setShippingMethod] = useState<'Standard' | 'Express'>('Standard');
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [gatewayMode, setGatewayMode] = useState<'TEST_MODE' | 'LIVE'>('TEST_MODE');
  const [adminSdkConfigured, setAdminSdkConfigured] = useState<boolean>(false);
  const [testModalData, setTestModalData] = useState<{
    razorpayOrderId: string;
    notice: string;
    amountInr: number;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch('/api/payments/config')
      .then((r) => r.json())
      .then((d) => {
        if (d.mode === 'LIVE') setGatewayMode('LIVE');
        setAdminSdkConfigured(Boolean(d.adminSdkConfigured));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (addresses.length > 0 && !selectedAddressId) {
      const def = addresses.find((a) => a.isDefault) || addresses[0];
      setSelectedAddressId(def.id);
      setCustomerName(def.fullName);
      setCustomerPhone(def.phone);
      setLine1(def.line1);
      setLine2(def.line2 || '');
      setCity(def.city);
      setStateName(def.state);
      setPincode(def.pincode);
      setAddressLabel(def.label);
    }
  }, [addresses, selectedAddressId]);

  const handleSelectSavedAddress = (addr: Address) => {
    setSelectedAddressId(addr.id);
    setCustomerName(addr.fullName);
    setCustomerPhone(addr.phone);
    setLine1(addr.line1);
    setLine2(addr.line2 || '');
    setCity(addr.city);
    setStateName(addr.state);
    setPincode(addr.pincode);
    setAddressLabel(addr.label);
  };

  const baseTotals = computeCartTotals(
    cart,
    settings.freeShippingThreshold,
    settings.standardShippingFee,
    shippingMethod,
    settings.expressShippingFee,
    0,
  );

  const couponDiscount = (() => {
    if (!appliedCoupon) return 0;
    if (baseTotals.subtotal < appliedCoupon.minOrderAmount) return 0;
    const raw =
      appliedCoupon.type === 'PERCENT'
        ? Math.round((baseTotals.subtotal * appliedCoupon.value) / 100)
        : appliedCoupon.value;
    return Math.min(raw, appliedCoupon.maxDiscount || raw);
  })();

  const totals = computeCartTotals(
    cart,
    settings.freeShippingThreshold,
    settings.standardShippingFee,
    shippingMethod,
    settings.expressShippingFee,
    couponDiscount,
  );

  const handleApplyCoupon = () => {
    const code = couponInput.trim().toUpperCase();
    const match = coupons.find((c) => c.active && c.code.toUpperCase() === code);
    if (!match) {
      notifyToast('Invalid or inactive coupon code.', 'error');
      return;
    }
    if (baseTotals.subtotal < match.minOrderAmount) {
      notifyToast(`Minimum order of ${formatINR(match.minOrderAmount)} required for ${match.code}.`, 'error');
      return;
    }
    setAppliedCoupon(match);
    notifyToast(`Coupon ${match.code} applied!`, 'success');
  };

  const isUserVerified = Boolean(user && (user.emailVerified || user.phoneNumber));

  const loadRazorpayScript = (): Promise<boolean> =>
    new Promise((resolve) => {
      if ((window as unknown as { Razorpay?: unknown }).Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });

  const placeOrderViaServer = async (razorpayData?: {
    razorpay_order_id?: string;
    razorpay_payment_id?: string;
    razorpay_signature?: string;
  }) => {
    if (!user) return;
    const idToken = await user.getIdToken();
    const res = await fetch('/api/orders/place', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        shippingAddress: {
          fullName: sanitizeText(customerName, 120),
          phone: sanitizeText(customerPhone, 16),
          line1: sanitizeText(line1, 200),
          line2: sanitizeText(line2, 200),
          city: sanitizeText(city, 80),
          state: sanitizeText(stateName, 80),
          pincode: pincode.trim(),
          label: addressLabel,
        },
        shippingMethod,
        paymentMethod,
        couponCode: appliedCoupon?.code || '',
        items: cart.map((c) => ({
          productId: c.productId,
          variantId: c.variantId,
          quantity: c.quantity,
        })),
        ...razorpayData,
      }),
    });
    const data = (await res.json()) as { ok?: boolean; orderId?: string; orderNumber?: string; error?: string };
    if (!res.ok || !data.ok || !data.orderId) {
      throw new Error(data.error || 'Could not place verified order.');
    }
    await clearCart();
    notifyToast(`Order ${data.orderNumber} confirmed!`, 'success');
    navigate(`/order-confirmation/${data.orderId}`);
  };

  // Client COD-only fallback when server Firebase Admin SDK credentials are not yet configured.
  // Enforces strictly paymentMethod: 'COD', paymentMode: 'COD', paymentStatus: 'Pending' and NO products writes.
  const placeCodOrderFallback = async () => {
    if (!user) return;
    const orderId = `ord_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const orderNumber = `RF-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
    const paymentId = `pay_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const notifId = `ntf_${Date.now()}`;

    const batch = writeBatch(db);

    batch.set(doc(db, 'orders', orderId), {
      orderNumber,
      userId: user.uid,
      customerName: sanitizeText(customerName, 120),
      customerEmail: user.email || '',
      customerPhone: sanitizeText(customerPhone, 20),
      shippingAddress: {
        fullName: sanitizeText(customerName, 120),
        phone: sanitizeText(customerPhone, 16),
        line1: sanitizeText(line1, 200),
        line2: sanitizeText(line2, 200),
        city: sanitizeText(city, 80),
        state: sanitizeText(stateName, 80),
        pincode: pincode.trim(),
        label: addressLabel,
      },
      shippingMethod,
      items: cart.map((c) => ({
        productId: c.productId,
        variantId: c.variantId,
        variantLabel: c.variantLabel,
        name: c.name,
        slug: c.slug,
        sku: c.sku,
        image: c.image,
        sellingPrice: c.sellingPrice,
        mrp: c.mrp,
        gstPercent: c.gstPercent,
        quantity: c.quantity,
      })),
      subtotal: totals.subtotal,
      discountTotal: totals.couponDiscount,
      couponCode: appliedCoupon?.code || '',
      gstTotal: totals.gstIncluded,
      shippingCharge: totals.shippingCharge,
      totalAmount: totals.totalAmount,
      paymentMethod: 'COD',
      paymentStatus: 'Pending',
      paymentMode: 'COD',
      razorpayOrderId: '',
      razorpayPaymentId: '',
      status: 'Pending',
      trackingNumber: '',
      statusHistory: [
        {
          status: 'Pending',
          note: 'Cash on Delivery order placed (Payment Pending)',
          timestampIso: new Date().toISOString(),
        },
      ],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    batch.set(doc(db, 'payments', paymentId), {
      orderId,
      orderNumber,
      userId: user.uid,
      amount: totals.totalAmount,
      currency: 'INR',
      method: 'COD',
      mode: 'COD',
      status: 'Pending',
      gatewayRef: `COD-${orderNumber}`,
      createdAt: serverTimestamp(),
    });

    batch.set(doc(db, 'users', user.uid, 'notifications', notifId), {
      userId: user.uid,
      title: `Order ${orderNumber} Placed`,
      message: `Your COD order for ${formatINR(totals.totalAmount)} has been received (Payment Pending).`,
      type: 'order',
      orderId,
      read: false,
      createdAt: serverTimestamp(),
    });

    try {
      await batch.commit();
      await clearCart();
      notifyToast(`Order ${orderNumber} confirmed (COD Pending)!`, 'success');
      navigate(`/order-confirmation/${orderId}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `orders/${orderId}`);
    }
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      notifyToast('Please sign in to place your order.', 'error');
      navigate('/login');
      return;
    }
    if (!isUserVerified) {
      notifyToast('Please verify your email or use Google Sign-In before placing an order.', 'error');
      return;
    }
    if (!isValidIndianPhone(customerPhone)) {
      notifyToast('Please enter a valid 10-digit Indian mobile number.', 'error');
      return;
    }
    if (!isValidIndianPin(pincode)) {
      notifyToast('Please enter a valid 6-digit Indian PIN code.', 'error');
      return;
    }
    if (!line1.trim() || !city.trim() || !customerName.trim()) {
      notifyToast('Please complete all required delivery address fields.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      if (paymentMethod === 'COD') {
        if (adminSdkConfigured) {
          await placeOrderViaServer();
        } else {
          await placeCodOrderFallback();
        }
        return;
      }

      if (!adminSdkConfigured) {
        notifyToast(
          'Online payments require server Firebase Admin credentials. Please choose Cash on Delivery (COD).',
          'error',
        );
        return;
      }

      const idToken = await user.getIdToken();
      const res = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          amountInr: totals.totalAmount,
          receipt: `RF_${Date.now()}`,
          paymentMethod,
          shippingMethod,
          couponCode: appliedCoupon?.code || '',
          items: cart.map((c) => ({
            productId: c.productId,
            variantId: c.variantId,
            quantity: c.quantity,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not initiate payment order.');
      }

      if (data.mode === 'TEST_MODE') {
        setTestModalData({
          razorpayOrderId: data.razorpayOrderId,
          notice: data.notice,
          amountInr: data.amountInr ?? totals.totalAmount,
        });
      } else {
        const loaded = await loadRazorpayScript();
        if (!loaded) {
          throw new Error('Unable to load Razorpay Checkout SDK.');
        }
        const RazorpayCtor = (window as unknown as {
          Razorpay: new (opts: Record<string, unknown>) => { open: () => void };
        }).Razorpay;
        const rzp = new RazorpayCtor({
          key: data.keyId,
          amount: data.amountPaise,
          currency: data.currency || 'INR',
          name: 'ROYAL FLASK',
          description: 'ROYAL FLASK Order Payment',
          order_id: data.razorpayOrderId,
          prefill: {
            name: customerName,
            email: user.email || '',
            contact: customerPhone,
          },
          handler: async (response: {
            razorpay_order_id: string;
            razorpay_payment_id: string;
            razorpay_signature: string;
          }) => {
            setSubmitting(true);
            try {
              await placeOrderViaServer(response);
            } catch (err) {
              notifyToast(err instanceof Error ? err.message : 'Payment verification failed.', 'error');
            } finally {
              setSubmitting(false);
            }
          },
        });
        rzp.open();
      }
    } catch (err) {
      notifyToast(err instanceof Error ? err.message : 'Checkout failed.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmTestPayment = async () => {
    if (!testModalData) return;
    setSubmitting(true);
    try {
      const verifyRes = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razorpay_order_id: testModalData.razorpayOrderId,
        }),
      });
      const vData = await verifyRes.json();
      if (!verifyRes.ok || !vData.verified) {
        throw new Error(vData.error || 'Test payment verification failed.');
      }
      setTestModalData(null);
      await placeOrderViaServer({
        razorpay_order_id: vData.razorpayOrderId,
        razorpay_payment_id: vData.razorpayPaymentId,
      });
    } catch (err) {
      notifyToast(err instanceof Error ? err.message : 'Payment error', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (cart.length === 0) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h1 className="font-display text-3xl font-bold text-[#0B1D3A] dark:text-white">Checkout</h1>
        <p className="text-sm text-slate-500 mt-2">Your shopping bag is currently empty.</p>
        <Link
          to="/shop"
          className="inline-block mt-6 px-6 py-3 text-sm font-semibold bg-[#0B1D3A] dark:bg-[#2449B5] text-white rounded-lg"
        >
          Shop Products
        </Link>
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <SeoHead title="Checkout – ROYAL FLASK" description="Secure Indian checkout with UPI, Cards, Net Banking, and Cash on Delivery." />

      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800 mb-8">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#0B1D3A] dark:text-white">
            Checkout &amp; Delivery
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Payment Gateway Mode: <span className="font-semibold">{gatewayMode === 'LIVE' ? 'Live Razorpay' : 'Test Mode (No live gateway credentials configured)'}</span>
          </p>
        </div>
        {!user && (
          <Link
            to="/login"
            className="px-4 py-2 text-xs font-semibold text-white bg-[#2449B5] rounded-lg"
          >
            Sign In to Place Order
          </Link>
        )}
      </div>

      {user && !isUserVerified && (
        <div className="mb-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-800 dark:text-amber-300">
          <span>Please verify your email address before completing checkout.</span>
          <button
            type="button"
            onClick={() => sendEmailVerification(user).then(() => notifyToast('Verification email sent.', 'success'))}
            className="px-3 py-1.5 font-semibold bg-amber-700 text-white rounded-md"
          >
            Resend Verification Email
          </button>
        </div>
      )}

      <form onSubmit={handleCheckoutSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 space-y-8">
          {/* Saved Addresses */}
          {addresses.length > 0 && (
            <section className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1526]">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#2449B5]" />
                <span>Saved Delivery Addresses</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {addresses.map((addr) => (
                  <button
                    key={addr.id}
                    type="button"
                    onClick={() => handleSelectSavedAddress(addr)}
                    className={`p-3.5 text-left rounded-xl border transition-colors ${
                      selectedAddressId === addr.id
                        ? 'border-[#2449B5] bg-blue-50/50 dark:bg-blue-950/30'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <p className="text-xs font-semibold text-[#2449B5] dark:text-blue-400">{addr.label}</p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">{addr.fullName}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                      {addr.line1}, {addr.city}, {addr.state} – {addr.pincode}
                    </p>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Delivery Details Form */}
          <section className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1526] space-y-4">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Delivery Address</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#060911]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Mobile Number *</label>
                <input
                  type="tel"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="9876543210"
                  className="w-full px-3 py-2.5 text-sm font-mono-tabular rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#060911]"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  House / Flat / Street Address *
                </label>
                <input
                  type="text"
                  required
                  value={line1}
                  onChange={(e) => setLine1(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#060911]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Apartment / Landmark</label>
                <input
                  type="text"
                  value={line2}
                  onChange={(e) => setLine2(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#060911]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">PIN Code (6 digits) *</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                  placeholder="400001"
                  className="w-full px-3 py-2.5 text-sm font-mono-tabular rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#060911]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">City *</label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#060911]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">State *</label>
                <select
                  value={stateName}
                  onChange={(e) => setStateName(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#060911]"
                >
                  {INDIAN_STATES.map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* Shipping Method */}
          <section className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1526] space-y-3">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Shipping Method</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setShippingMethod('Standard')}
                className={`p-4 text-left rounded-xl border ${
                  shippingMethod === 'Standard'
                    ? 'border-[#2449B5] bg-blue-50/50 dark:bg-blue-950/30'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex justify-between text-sm font-semibold">
                  <span>Standard Delivery (4–6 days)</span>
                  <span className="font-mono-tabular">
                    {baseTotals.subtotal >= settings.freeShippingThreshold ? 'FREE' : formatINR(settings.standardShippingFee)}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">Free above {formatINR(settings.freeShippingThreshold)}</p>
              </button>

              <button
                type="button"
                onClick={() => setShippingMethod('Express')}
                className={`p-4 text-left rounded-xl border ${
                  shippingMethod === 'Express'
                    ? 'border-[#2449B5] bg-blue-50/50 dark:bg-blue-950/30'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex justify-between text-sm font-semibold">
                  <span>Express Air (1–3 days)</span>
                  <span className="font-mono-tabular">{formatINR(settings.expressShippingFee)}</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">Priority metro dispatch</p>
              </button>
            </div>
          </section>

          {/* Payment Options */}
          <section className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1526] space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#2449B5]" />
                <span>Payment Method</span>
              </h2>
              {gatewayMode === 'TEST_MODE' && (
                <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                  Online Methods in Test Mode
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(
                [
                  { id: 'UPI', title: 'UPI (GPay / PhonePe / BHIM)', desc: 'Instant Razorpay UPI' },
                  { id: 'CARD', title: 'Credit / Debit Card', desc: 'Visa, Mastercard, RuPay' },
                  { id: 'NETBANKING', title: 'Net Banking', desc: 'HDFC, ICICI, SBI, Axis & more' },
                  { id: 'COD', title: 'Cash on Delivery (COD)', desc: 'Pay at doorstep across India' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setPaymentMethod(opt.id)}
                  className={`p-3.5 text-left rounded-xl border transition-colors ${
                    paymentMethod === opt.id
                      ? 'border-[#2449B5] bg-blue-50/50 dark:bg-blue-950/30'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{opt.title}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* Order Summary Sidebar */}
        <aside className="lg:col-span-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1526] p-6 space-y-5 lg:sticky lg:top-24">
          <h2 className="font-display text-2xl font-bold text-[#0B1D3A] dark:text-white">Order Summary</h2>

          <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
            {cart.map((item) => (
              <div key={item.id} className="flex justify-between gap-3 text-xs">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900 dark:text-white truncate">{item.name}</p>
                  <p className="text-slate-500">{item.variantLabel} × {item.quantity}</p>
                </div>
                <span className="font-mono-tabular font-semibold shrink-0">
                  {formatINR(item.sellingPrice * item.quantity)}
                </span>
              </div>
            ))}
          </div>

          {/* Coupon Input */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Tag className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                  placeholder="Coupon (e.g. ROYAL10)"
                  className="w-full pl-8 pr-3 py-2 text-xs uppercase rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#060911]"
                />
              </div>
              <button
                type="button"
                onClick={handleApplyCoupon}
                className="px-3.5 py-2 text-xs font-semibold bg-slate-900 dark:bg-[#2449B5] text-white rounded-lg"
              >
                Apply
              </button>
            </div>
            {appliedCoupon && (
              <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1.5">
                Applied {appliedCoupon.code}: -{formatINR(totals.couponDiscount)}
              </p>
            )}
          </div>

          <div className="space-y-2 text-sm pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">Subtotal</span>
              <span className="font-mono-tabular">{formatINR(totals.subtotal)}</span>
            </div>
            {totals.couponDiscount > 0 && (
              <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
                <span>Coupon Discount</span>
                <span className="font-mono-tabular">-{formatINR(totals.couponDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">Included GST</span>
              <span className="font-mono-tabular">{formatINR(totals.gstIncluded)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">Shipping ({shippingMethod})</span>
              <span className="font-mono-tabular">
                {totals.shippingCharge === 0 ? 'FREE' : formatINR(totals.shippingCharge)}
              </span>
            </div>
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between text-lg font-bold text-[#0B1D3A] dark:text-white">
              <span>Payable Amount</span>
              <span className="font-mono-tabular">{formatINR(totals.totalAmount)}</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || !user}
            className="w-full py-3.5 px-4 text-sm font-semibold text-white bg-[#0B1D3A] hover:bg-[#2449B5] dark:bg-[#2449B5] rounded-lg disabled:opacity-50 transition-colors"
          >
            {submitting
              ? 'Processing...'
              : paymentMethod === 'COD'
                ? `Place COD Order (${formatINR(totals.totalAmount)})`
                : `Pay ${formatINR(totals.totalAmount)} (${gatewayMode === 'TEST_MODE' ? 'Test Mode' : 'Razorpay'})`}
          </button>

          <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span>Server-side order validation &amp; GST invoice generation.</span>
          </p>
        </aside>
      </form>

      {/* Clearly Labeled Test Mode Confirmation Modal */}
      {testModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="max-w-md w-full bg-white dark:bg-[#0D1526] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Razorpay Test Mode Checkout
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                  {testModalData.notice}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#060911] border border-slate-200 dark:border-slate-800 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Test Order Reference</span>
                <span className="font-mono-tabular font-semibold">{testModalData.razorpayOrderId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Method</span>
                <span className="font-semibold">{paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount</span>
                <span className="font-mono-tabular font-bold">{formatINR(testModalData.amountInr)}</span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setTestModalData(null)}
                className="flex-1 py-2.5 text-xs font-semibold border border-slate-300 dark:border-slate-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleConfirmTestPayment}
                className="flex-1 py-2.5 text-xs font-semibold text-white bg-[#2449B5] hover:bg-blue-700 rounded-lg"
              >
                {submitting ? 'Authorizing...' : 'Authorize Test Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export function OrderConfirmationPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const { orders, settings } = useStore();
  const [fetchedOrder, setFetchedOrder] = useState<Order | null>(null);

  const order = orders.find((o) => o.id === orderId) || fetchedOrder;

  useEffect(() => {
    if (!order && orderId) {
      getDoc(doc(db, 'orders', orderId))
        .then((snap) => {
          if (snap.exists()) {
            setFetchedOrder({ id: snap.id, ...(snap.data() as Omit<Order, 'id'>) });
          }
        })
        .catch(() => {});
    }
  }, [order, orderId]);

  if (!order) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h1 className="font-display text-3xl font-bold">Loading Order Receipt...</h1>
        <Link to="/orders" className="inline-block mt-5 text-sm text-[#2449B5] underline">
          View My Orders
        </Link>
      </main>
    );
  }

  const waUrl = buildWhatsAppUrl(settings.whatsappNumber, buildOrderWhatsAppMessage(order));

  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <SeoHead title={`Order ${order.orderNumber} Confirmed – ROYAL FLASK`} description="Your ROYAL FLASK order confirmation and GST summary." />
      <div className="bg-white dark:bg-[#0D1526] border border-slate-200 dark:border-slate-800 rounded-2xl p-8 space-y-6">
        <div className="flex items-start gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
          <CheckCircle2 className="w-8 h-8 text-emerald-600 shrink-0 mt-1" />
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Order Received
            </p>
            <h1 className="font-display text-3xl font-bold text-[#0B1D3A] dark:text-white mt-1">
              Order #{order.orderNumber}
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Status: <span className="font-semibold">{order.status}</span> · Payment:{' '}
              <span className="font-semibold">{order.paymentMethod} ({order.paymentStatus})</span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Delivery Address</h2>
            <p className="font-semibold text-slate-900 dark:text-white">{order.shippingAddress.fullName}</p>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              {order.shippingAddress.line1}, {order.shippingAddress.city}, {order.shippingAddress.state} –{' '}
              {order.shippingAddress.pincode}
            </p>
            <p className="text-slate-600 dark:text-slate-400 mt-0.5 font-mono-tabular">
              Phone: {order.shippingAddress.phone}
            </p>
          </div>

          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Payment &amp; GST</h2>
            <p className="text-slate-700 dark:text-slate-300">
              Total Paid: <span className="font-mono-tabular font-bold">{formatINR(order.totalAmount)}</span>
            </p>
            <p className="text-slate-500 text-xs mt-1">
              Included GST: <span className="font-mono-tabular">{formatINR(order.gstTotal)}</span>
            </p>
            {order.paymentMode === 'TEST_MODE' && (
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                Authorized in Razorpay Test Mode ({order.razorpayOrderId})
              </p>
            )}
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
          {order.items.map((item, idx) => (
            <div key={idx} className="flex justify-between text-sm">
              <span>
                {item.name} ({item.variantLabel}) × {item.quantity}
              </span>
              <span className="font-mono-tabular font-semibold">{formatINR(item.sellingPrice * item.quantity)}</span>
            </div>
          ))}
        </div>

        <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-wrap gap-3">
          <Link
            to={`/orders/${order.id}`}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-[#0B1D3A] dark:bg-[#2449B5] rounded-lg"
          >
            Track Order
          </Link>
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-2.5 inline-flex items-center gap-2 text-sm font-semibold border border-emerald-600/35 text-emerald-700 dark:text-emerald-400 rounded-lg"
          >
            <MessageCircle className="w-4 h-4" />
            <span>WhatsApp Order Enquiry</span>
          </a>
          <Link
            to="/shop"
            className="px-5 py-2.5 text-sm font-medium border border-slate-300 dark:border-slate-700 rounded-lg"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    </main>
  );
}
