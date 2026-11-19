import { Link } from 'react-router-dom';
import { MessageCircle, Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { buildCartWhatsAppMessage, buildWhatsAppUrl, computeCartTotals, formatINR } from '../lib/formatters';
import { SmartImage } from './SmartImage';

export function CartDrawer() {
  const {
    cart,
    cartDrawerOpen,
    setCartDrawerOpen,
    updateCartQuantity,
    removeFromCart,
    settings,
  } = useStore();

  if (!cartDrawerOpen) return null;

  const totals = computeCartTotals(
    cart,
    settings.freeShippingThreshold,
    settings.standardShippingFee,
    'Standard',
    settings.expressShippingFee,
  );

  const remainingForFree = Math.max(0, settings.freeShippingThreshold - totals.subtotal);
  const whatsappCartUrl = buildWhatsAppUrl(
    settings.whatsappNumber,
    buildCartWhatsAppMessage(cart, totals.totalAmount),
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs"
        onClick={() => setCartDrawerOpen(false)}
      />
      <aside className="relative w-full max-w-md bg-white dark:bg-[#0D1526] h-full flex flex-col border-l border-slate-200 dark:border-slate-800 shadow-2xl">
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-5 h-5 text-[#2449B5] dark:text-blue-400" />
            <h2 className="font-display text-xl font-bold text-[#0B1D3A] dark:text-white">
              Shopping Bag
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setCartDrawerOpen(false)}
            aria-label="Close bag"
            className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {cart.length > 0 && (
          <div className="px-6 py-3 bg-slate-50 dark:bg-[#131E36] border-b border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300">
            {remainingForFree === 0
              ? 'Complimentary standard pan-India delivery unlocked.'
              : `Add ${formatINR(remainingForFree)} more for complimentary standard shipping.`}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12">
              <ShoppingBag className="w-10 h-10 text-slate-300 dark:text-slate-700 mb-3" />
              <p className="text-base font-semibold text-slate-900 dark:text-white">Your bag is empty</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
                Discover vacuum insulated flasks, cast iron cookware, and refined dining ware.
              </p>
              <Link
                to="/shop"
                onClick={() => setCartDrawerOpen(false)}
                className="mt-5 px-5 py-2.5 text-xs font-semibold bg-[#0B1D3A] dark:bg-[#2449B5] text-white rounded-lg"
              >
                Browse Store
              </Link>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.id}
                className="flex gap-4 pb-4 border-b border-slate-200 dark:border-slate-800/80 last:border-b-0"
              >
                <Link
                  to={`/product/${item.slug}`}
                  onClick={() => setCartDrawerOpen(false)}
                  className="w-20 h-20 rounded-lg overflow-hidden bg-slate-100 dark:bg-[#131E36] shrink-0"
                >
                  <SmartImage src={item.image} alt={item.name} className="w-full h-full object-cover" />
                </Link>
                <div className="flex-1 min-w-0">
                  <Link
                    to={`/product/${item.slug}`}
                    onClick={() => setCartDrawerOpen(false)}
                    className="text-sm font-semibold text-slate-900 dark:text-white line-clamp-1 hover:text-[#2449B5]"
                  >
                    {item.name}
                  </Link>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {item.variantLabel} · GST {item.gstPercent}% incl.
                  </p>
                  <div className="mt-2.5 flex items-center justify-between">
                    <div className="inline-flex items-center border border-slate-200 dark:border-slate-700 rounded-md">
                      <button
                        type="button"
                        onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                        aria-label="Decrease quantity"
                        className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="px-2.5 text-xs font-mono-tabular font-semibold text-slate-900 dark:text-white">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                        aria-label="Increase quantity"
                        className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-sm font-mono-tabular font-semibold text-[#0B1D3A] dark:text-white">
                        {formatINR(item.sellingPrice * item.quantity)}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.id)}
                        aria-label={`Remove ${item.name}`}
                        className="text-slate-400 hover:text-rose-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B1322] space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-400">Subtotal (incl. GST)</span>
              <span className="font-mono-tabular font-semibold text-slate-900 dark:text-white">
                {formatINR(totals.subtotal)}
              </span>
            </div>
            {totals.productSavings > 0 && (
              <div className="flex justify-between text-xs text-emerald-700 dark:text-emerald-400">
                <span>MRP Savings</span>
                <span className="font-mono-tabular">-{formatINR(totals.productSavings)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-400">Estimated Shipping</span>
              <span className="font-mono-tabular text-slate-900 dark:text-white">
                {totals.shippingCharge === 0 ? 'FREE' : formatINR(totals.shippingCharge)}
              </span>
            </div>
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between text-base font-bold text-[#0B1D3A] dark:text-white">
              <span>Payable Total</span>
              <span className="font-mono-tabular">{formatINR(totals.totalAmount)}</span>
            </div>

            <div className="grid grid-cols-1 gap-2 pt-2">
              <Link
                to="/checkout"
                onClick={() => setCartDrawerOpen(false)}
                className="w-full py-3 px-4 text-center text-sm font-semibold text-white bg-[#0B1D3A] hover:bg-[#2449B5] dark:bg-[#2449B5] dark:hover:bg-blue-600 rounded-lg transition-colors"
              >
                Proceed to Checkout
              </Link>
              <div className="grid grid-cols-2 gap-2">
                <Link
                  to="/cart"
                  onClick={() => setCartDrawerOpen(false)}
                  className="py-2 px-3 text-center text-xs font-medium border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-white dark:hover:bg-slate-800"
                >
                  Full Bag View
                </Link>
                <a
                  href={whatsappCartUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2 px-3 inline-flex items-center justify-center gap-1.5 text-xs font-medium border border-emerald-600/30 text-emerald-700 dark:text-emerald-400 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Share via WhatsApp</span>
                </a>
              </div>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
