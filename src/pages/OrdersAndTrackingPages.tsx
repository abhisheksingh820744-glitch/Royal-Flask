import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  CheckCircle2,
  Clock,
  MessageCircle,
  Package,
  Search,
  Truck,
  XCircle,
} from 'lucide-react';
import { doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useStore } from '../context/StoreContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  buildOrderWhatsAppMessage,
  buildWhatsAppUrl,
  formatFirestoreDate,
  formatINR,
} from '../lib/formatters';
import { SeoHead } from '../components/SeoHead';
import { SmartImage } from '../components/SmartImage';
import type { Order, OrderStatus } from '../types/ecommerce';

const TRACKING_STAGES: OrderStatus[] = [
  'Pending',
  'Confirmed',
  'Processing',
  'Shipped',
  'Out for Delivery',
  'Delivered',
];

export function MyOrdersPage() {
  const { user, orders } = useStore();

  if (!user) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-16 text-center">
        <SeoHead title="My Orders – ROYAL FLASK" description="Sign in to view your ROYAL FLASK order history." />
        <h1 className="font-display text-3xl font-bold text-[#0B1D3A] dark:text-white">My Orders</h1>
        <p className="text-sm text-slate-500 mt-2">Sign in to inspect your order history and tracking status.</p>
        <Link
          to="/login"
          className="inline-block mt-6 px-6 py-3 text-sm font-semibold bg-[#0B1D3A] dark:bg-[#2449B5] text-white rounded-lg"
        >
          Sign In
        </Link>
      </main>
    );
  }

  const myOrders = [...orders].filter((o) => o.userId === user.uid);

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <SeoHead title="My Orders – ROYAL FLASK" description="View and track all your ROYAL FLASK orders." />
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#0B1D3A] dark:text-white">My Orders</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            View GST breakdowns, track shipments, or contact support via WhatsApp.
          </p>
        </div>
        <Link
          to="/track-order"
          className="px-4 py-2 text-xs font-semibold border border-slate-300 dark:border-slate-700 rounded-lg"
        >
          Lookup by Order ID
        </Link>
      </div>

      {myOrders.length === 0 ? (
        <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center bg-white dark:bg-[#0D1526]">
          <Package className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">No orders placed yet</h2>
          <p className="text-sm text-slate-500 mt-1">Once you complete a checkout, your order appears here.</p>
          <Link
            to="/shop"
            className="inline-block mt-5 px-5 py-2.5 text-xs font-semibold text-white bg-[#0B1D3A] dark:bg-[#2449B5] rounded-lg"
          >
            Explore Store
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {myOrders.map((order) => (
            <div
              key={order.id}
              className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1526] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-mono-tabular font-semibold text-[#0B1D3A] dark:text-white">
                    {order.orderNumber}
                  </span>
                  <span>·</span>
                  <span>{formatFirestoreDate(order.createdAt)}</span>
                  <span>·</span>
                  <span>{order.paymentMethod} ({order.paymentStatus})</span>
                </div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {order.items.map((i) => `${i.name} × ${i.quantity}`).join(', ')}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Status: <span className="font-semibold text-[#2449B5] dark:text-blue-400">{order.status}</span>
                </p>
              </div>

              <div className="flex items-center gap-4 shrink-0">
                <span className="text-base font-mono-tabular font-bold text-[#0B1D3A] dark:text-white">
                  {formatINR(order.totalAmount)}
                </span>
                <Link
                  to={`/orders/${order.id}`}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#0B1D3A] dark:bg-[#2449B5] rounded-lg whitespace-nowrap"
                >
                  Track &amp; Details
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

export function OrderTrackingPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const { orders, user, settings, notifyToast } = useStore();
  const [fetched, setFetched] = useState<Order | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const order = orders.find((o) => o.id === orderId) || fetched;

  useEffect(() => {
    if (!order && orderId) {
      getDoc(doc(db, 'orders', orderId))
        .then((snap) => {
          if (snap.exists()) setFetched({ id: snap.id, ...(snap.data() as Omit<Order, 'id'>) });
        })
        .catch(() => {});
    }
  }, [order, orderId]);

  if (!order) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h1 className="font-display text-3xl font-bold">Order Details</h1>
        <p className="text-sm text-slate-500 mt-2">Fetching order status or order not accessible.</p>
        <Link to="/orders" className="inline-block mt-5 text-sm text-[#2449B5] underline">
          Back to My Orders
        </Link>
      </main>
    );
  }

  const isTerminalCancel = ['Cancelled', 'Returned', 'Refunded'].includes(order.status);
  const currentStageIndex = TRACKING_STAGES.indexOf(order.status);
  const canCancel = Boolean(user && order.userId === user.uid && ['Pending', 'Confirmed'].includes(order.status));
  const waUrl = buildWhatsAppUrl(settings.whatsappNumber, buildOrderWhatsAppMessage(order));

  const handleCancelOrder = async () => {
    if (!canCancel) return;
    setCancelling(true);
    try {
      await updateDoc(doc(db, 'orders', order.id), {
        status: 'Cancelled',
        statusHistory: [
          ...order.statusHistory,
          {
            status: 'Cancelled',
            note: 'Cancelled by customer prior to dispatch',
            timestampIso: new Date().toISOString(),
          },
        ],
        updatedAt: serverTimestamp(),
      });
      notifyToast('Order cancelled.', 'info');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `orders/${order.id}`);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <SeoHead title={`Track ${order.orderNumber} – ROYAL FLASK`} description="Real-time order tracking and itemized GST receipt." />

      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <p className="text-xs text-slate-500">Order Tracking</p>
          <h1 className="font-display text-3xl font-bold text-[#0B1D3A] dark:text-white mt-0.5">
            #{order.orderNumber}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Placed on {formatFirestoreDate(order.createdAt)} · {order.shippingMethod} Shipping
            {order.trackingNumber ? ` · AWB: ${order.trackingNumber}` : ''}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 inline-flex items-center gap-2 text-xs font-semibold border border-emerald-600/35 text-emerald-700 dark:text-emerald-400 rounded-lg"
          >
            <MessageCircle className="w-4 h-4" />
            <span>WhatsApp Support</span>
          </a>
          {canCancel && (
            <button
              type="button"
              disabled={cancelling}
              onClick={handleCancelOrder}
              className="px-4 py-2.5 text-xs font-semibold border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 rounded-lg"
            >
              {cancelling ? 'Cancelling...' : 'Cancel Order'}
            </button>
          )}
        </div>
      </div>

      {/* Status Timeline */}
      <section className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1526]">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-6">
          Fulfillment Progress
        </h2>

        {isTerminalCancel ? (
          <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
            <XCircle className="w-6 h-6" />
            <div>
              <p className="font-semibold">Order {order.status}</p>
              <p className="text-xs text-slate-500">Contact WhatsApp support if you need assistance.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {TRACKING_STAGES.map((stage, idx) => {
              const reached = idx <= currentStageIndex;
              return (
                <div key={stage} className="flex flex-col items-start">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${
                      reached
                        ? 'bg-[#2449B5] text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                    }`}
                  >
                    {idx === 5 ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : idx >= 3 ? (
                      <Truck className="w-4 h-4" />
                    ) : (
                      <Clock className="w-4 h-4" />
                    )}
                  </div>
                  <span
                    className={`text-xs font-semibold ${
                      reached ? 'text-[#0B1D3A] dark:text-white' : 'text-slate-400'
                    }`}
                  >
                    {stage}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
          {order.statusHistory.map((step, i) => (
            <div key={i} className="flex items-center justify-between text-xs gap-4">
              <div>
                <span className="font-semibold text-slate-900 dark:text-white">{step.status}</span>
                <span className="text-slate-500 dark:text-slate-400"> — {step.note}</span>
              </div>
              <span className="font-mono-tabular text-slate-400 shrink-0">
                {new Date(step.timestampIso).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Items & Invoice Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1526] space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Items</h2>
          {order.items.map((item, idx) => (
            <div key={idx} className="flex items-center gap-4 pb-3 border-b border-slate-100 dark:border-slate-800 last:border-b-0">
              <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-100 shrink-0">
                <SmartImage src={item.image} alt={item.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{item.name}</p>
                <p className="text-xs text-slate-500">
                  {item.variantLabel} · SKU {item.sku} · Qty {item.quantity}
                </p>
              </div>
              <span className="font-mono-tabular text-sm font-semibold">
                {formatINR(item.sellingPrice * item.quantity)}
              </span>
            </div>
          ))}
        </div>

        <div className="lg:col-span-5 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1526] space-y-4 text-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Billing &amp; Shipping</h2>
          <div>
            <p className="font-semibold text-slate-900 dark:text-white">{order.shippingAddress.fullName}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {order.shippingAddress.line1}, {order.shippingAddress.city}, {order.shippingAddress.state} –{' '}
              {order.shippingAddress.pincode}
            </p>
          </div>
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Subtotal</span>
              <span className="font-mono-tabular">{formatINR(order.subtotal)}</span>
            </div>
            {order.discountTotal > 0 && (
              <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
                <span>Coupon ({order.couponCode})</span>
                <span className="font-mono-tabular">-{formatINR(order.discountTotal)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500">Included GST</span>
              <span className="font-mono-tabular">{formatINR(order.gstTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Shipping</span>
              <span className="font-mono-tabular">
                {order.shippingCharge === 0 ? 'FREE' : formatINR(order.shippingCharge)}
              </span>
            </div>
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between text-base font-bold text-[#0B1D3A] dark:text-white">
              <span>Grand Total</span>
              <span className="font-mono-tabular">{formatINR(order.totalAmount)}</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export function TrackOrderLookupPage() {
  const { orders } = useStore();
  const [orderNum, setOrderNum] = useState('');
  const navigate = useNavigate();
  const [notFound, setNotFound] = useState(false);

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    const q = orderNum.trim().toUpperCase();
    const match = orders.find((o) => o.orderNumber.toUpperCase() === q || o.id === orderNum.trim());
    if (match) {
      navigate(`/orders/${match.id}`);
    } else {
      setNotFound(true);
    }
  };

  return (
    <main className="max-w-lg mx-auto px-4 py-16">
      <SeoHead title="Track Order – ROYAL FLASK" description="Enter your ROYAL FLASK Order ID to inspect delivery progress." />
      <div className="p-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1526] space-y-5">
        <h1 className="font-display text-3xl font-bold text-[#0B1D3A] dark:text-white">Track Your Order</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Enter your ROYAL FLASK Order Number (e.g. RF-20261114-1234) while signed in.
        </p>
        <form onSubmit={handleLookup} className="space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              required
              value={orderNum}
              onChange={(e) => {
                setOrderNum(e.target.value);
                setNotFound(false);
              }}
              placeholder="RF-YYYYMMDD-XXXX"
              className="w-full pl-10 pr-4 py-3 text-sm font-mono-tabular rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#060911]"
            />
          </div>
          {notFound && (
            <p className="text-xs text-rose-600 dark:text-rose-400">
              No matching order found in your signed-in account. Please verify your Order ID or sign in first.
            </p>
          )}
          <button
            type="submit"
            className="w-full py-3 text-sm font-semibold text-white bg-[#0B1D3A] dark:bg-[#2449B5] rounded-lg"
          >
            Check Status
          </button>
        </form>
      </div>
    </main>
  );
}
