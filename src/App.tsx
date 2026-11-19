import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { StoreProvider, useStore } from './context/StoreContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { CartDrawer } from './components/CartDrawer';
import { WhatsAppFloat } from './components/WhatsAppFloat';
import { HomePage } from './pages/HomePage';
import { CategoriesPage, ExplorePage, ShopPage } from './pages/ShopPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import {
  LoginPage,
  OnboardingPage,
  OtpVerificationPage,
  RegisterPage,
  SplashPage,
} from './pages/AuthPages';
import {
  CartPage,
  CheckoutPage,
  OrderConfirmationPage,
} from './pages/CartAndCheckoutPages';
import {
  MyOrdersPage,
  OrderTrackingPage,
  TrackOrderLookupPage,
} from './pages/OrdersAndTrackingPages';
import {
  AboutPage,
  AddressesPage,
  NotificationsPage,
  PolicyPage,
  ProfilePage,
  SettingsPage,
  SupportPage,
  WishlistPage,
} from './pages/CustomerAccountPages';
import { AdminDashboardPage } from './pages/AdminDashboardPage';

function ToastShelf() {
  const { toasts, dismissToast } = useStore();
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => dismissToast(t.id)}
          className={`text-left px-4 py-3 rounded-lg shadow-lg text-xs font-medium border transition-all ${
            t.tone === 'error'
              ? 'bg-rose-950 text-rose-100 border-rose-800'
              : t.tone === 'success'
                ? 'bg-[#0B1D3A] text-white border-[#1E40AF]'
                : 'bg-white dark:bg-[#0D1526] text-slate-900 dark:text-white border-slate-200 dark:border-slate-700'
          }`}
        >
          {t.text}
        </button>
      ))}
    </div>
  );
}

function AppShell() {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#060911] text-slate-900 dark:text-slate-100 transition-colors">
      <Navbar />
      <CartDrawer />
      <ToastShelf />

      <div className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/splash" element={<SplashPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/otp" element={<OtpVerificationPage />} />

          <Route path="/shop" element={<ShopPage />} />
          <Route path="/search" element={<ShopPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/category/:slug" element={<ShopPage />} />
          <Route path="/explore" element={<ExplorePage />} />
          <Route path="/product/:slug" element={<ProductDetailPage />} />

          <Route path="/wishlist" element={<WishlistPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/addresses" element={<AddressesPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/payment" element={<CheckoutPage />} />
          <Route path="/order-confirmation/:orderId" element={<OrderConfirmationPage />} />

          <Route path="/orders" element={<MyOrdersPage />} />
          <Route path="/orders/:orderId" element={<OrderTrackingPage />} />
          <Route path="/track-order" element={<TrackOrderLookupPage />} />

          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/support" element={<SupportPage />} />
          <Route path="/contact" element={<SupportPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/settings" element={<SettingsPage />} />

          <Route
            path="/privacy-policy"
            element={
              <PolicyPage
                title="Privacy Policy"
                sections={[
                  {
                    heading: 'Information We Collect',
                    body: 'ROYAL FLASK collects only the account, shipping address, and order details necessary to fulfill your purchases across India and communicate order status updates.',
                  },
                  {
                    heading: 'Data Protection & Storage',
                    body: 'Customer data is stored securely in Google Cloud Firestore with strict owner-only access rules. Payment credentials are never stored on our client application.',
                  },
                ]}
              />
            }
          />
          <Route
            path="/terms-and-conditions"
            element={
              <PolicyPage
                title="Terms & Conditions"
                sections={[
                  {
                    heading: 'Orders & Pricing',
                    body: 'All prices on royalflask.in are listed in Indian Rupees (INR ₹) inclusive of applicable GST unless stated otherwise.',
                  },
                  {
                    heading: 'Warranty & Usage',
                    body: 'ROYAL FLASK stainless steel vacuum products carry manufacturing defect coverage against thermal vacuum failure under normal household usage.',
                  },
                ]}
              />
            }
          />
          <Route
            path="/return-refund-policy"
            element={
              <PolicyPage
                title="Return & Refund Policy"
                sections={[
                  {
                    heading: '7-Day Return Window',
                    body: 'Unused items in original packaging with intact tags may be returned or exchanged within 7 days of delivery.',
                  },
                  {
                    heading: 'Refund Processing',
                    body: 'Approved refunds for prepaid UPI/Card/Net Banking orders are initiated to the original payment method within 5–7 business days.',
                  },
                ]}
              />
            }
          />
          <Route
            path="/shipping-policy"
            element={
              <PolicyPage
                title="Shipping Policy"
                sections={[
                  {
                    heading: 'Pan-India Dispatch',
                    body: 'Orders are dispatched from our fulfillment hub within 24–48 business hours. Standard delivery takes 4–6 days; Express delivery takes 1–3 days in serviceable metro PIN codes.',
                  },
                  {
                    heading: 'Free Shipping Threshold',
                    body: 'Complimentary standard shipping applies automatically to eligible orders above ₹999.',
                  },
                ]}
              />
            }
          />

          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="*" element={<HomePage />} />
        </Routes>
      </div>

      <Footer />
      <WhatsAppFloat />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <StoreProvider>
        <AppShell />
      </StoreProvider>
    </BrowserRouter>
  );
}
