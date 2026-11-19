import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  Heart,
  LogOut,
  MapPin,
  MessageCircle,
  Package,
  Plus,
  Settings as SettingsIcon,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import {
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { useStore } from '../context/StoreContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  buildWhatsAppUrl,
  formatFirestoreDate,
  formatINR,
  INDIAN_STATES,
  isValidIndianPhone,
  isValidIndianPin,
  sanitizeText,
} from '../lib/formatters';
import { SeoHead } from '../components/SeoHead';
import { SmartImage } from '../components/SmartImage';

export function WishlistPage() {
  const { wishlist, products, addToCart, toggleWishlist } = useStore();

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <SeoHead title="Wishlist – ROYAL FLASK" description="Your saved ROYAL FLASK products." />
      <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#0B1D3A] dark:text-white mb-8">
        Saved Wishlist
      </h1>

      {wishlist.length === 0 ? (
        <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center bg-white dark:bg-[#0D1526]">
          <Heart className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <p className="text-lg font-semibold">No saved items yet</p>
          <p className="text-sm text-slate-500 mt-1">Tap the heart icon on any product to save it for later.</p>
          <Link
            to="/shop"
            className="inline-block mt-6 px-6 py-3 text-xs font-semibold text-white bg-[#0B1D3A] dark:bg-[#2449B5] rounded-lg"
          >
            Browse Products
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {wishlist.map((item) => {
            const fullProd = products.find((p) => p.id === item.productId);
            return (
              <div
                key={item.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1526] overflow-hidden flex flex-col"
              >
                <Link to={`/product/${item.slug}`} className="aspect-[4/3] bg-slate-100 dark:bg-[#131E36]">
                  <SmartImage src={item.image} alt={item.name} className="w-full h-full object-cover" />
                </Link>
                <div className="p-4 flex-1 flex flex-col">
                  <Link to={`/product/${item.slug}`} className="font-semibold text-slate-900 dark:text-white line-clamp-1">
                    {item.name}
                  </Link>
                  <p className="mt-1 font-mono-tabular font-bold text-[#0B1D3A] dark:text-white">
                    {formatINR(item.sellingPrice)}
                  </p>
                  <div className="mt-4 flex gap-2">
                    {fullProd && (
                      <button
                        type="button"
                        onClick={() => addToCart(fullProd)}
                        className="flex-1 py-2 text-xs font-semibold text-white bg-[#0B1D3A] dark:bg-[#2449B5] rounded-lg"
                      >
                        Move to Bag
                      </button>
                    )}
                    {fullProd && (
                      <button
                        type="button"
                        onClick={() => toggleWishlist(fullProd)}
                        aria-label="Remove from wishlist"
                        className="p-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-500 hover:text-rose-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}

export function AddressesPage() {
  const { user, addresses, notifyToast } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [fullName, setFullName] = useState(user?.displayName || '');
  const [phone, setPhone] = useState('');
  const [line1, setLine1] = useState('');
  const [line2, setLine2] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('Maharashtra');
  const [pincode, setPincode] = useState('');
  const [label, setLabel] = useState<'Home' | 'Office' | 'Other'>('Home');

  if (!user) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h1 className="font-display text-3xl font-bold">Saved Addresses</h1>
        <p className="text-sm text-slate-500 mt-2">Sign in to manage your Indian delivery addresses.</p>
        <Link to="/login" className="inline-block mt-5 px-6 py-3 text-sm font-semibold bg-[#0B1D3A] text-white rounded-lg">
          Sign In
        </Link>
      </main>
    );
  }

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidIndianPhone(phone) || !isValidIndianPin(pincode)) {
      notifyToast('Enter a valid 10-digit mobile number and 6-digit PIN code.', 'error');
      return;
    }
    const addressId = `addr_${Date.now()}`;
    try {
      await setDoc(doc(db, 'users', user.uid, 'addresses', addressId), {
        userId: user.uid,
        fullName: sanitizeText(fullName, 120),
        phone: sanitizeText(phone, 16),
        line1: sanitizeText(line1, 200),
        line2: sanitizeText(line2, 200),
        city: sanitizeText(city, 80),
        state: stateName,
        pincode: pincode.trim(),
        label,
        isDefault: addresses.length === 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setShowForm(false);
      setLine1('');
      setLine2('');
      setCity('');
      setPincode('');
      notifyToast('Address saved.', 'success');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}/addresses/${addressId}`);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'addresses', id));
      notifyToast('Address deleted.', 'info');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/addresses/${id}`);
    }
  };

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <SeoHead title="Address Management – ROYAL FLASK" description="Manage your delivery addresses across India." />
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-[#0B1D3A] dark:text-white">Address Management</h1>
          <p className="text-sm text-slate-500 mt-1">Manage saved delivery locations for faster checkout.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((s) => !s)}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-[#0B1D3A] dark:bg-[#2449B5] rounded-lg"
        >
          <Plus className="w-4 h-4" />
          <span>Add Address</span>
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleAddAddress}
          className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1526] grid grid-cols-1 sm:grid-cols-2 gap-4"
        >
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Full Name"
            className="px-3 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#060911]"
          />
          <input
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Mobile Number"
            className="px-3 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#060911]"
          />
          <input
            type="text"
            required
            value={line1}
            onChange={(e) => setLine1(e.target.value)}
            placeholder="Flat / Street Address"
            className="sm:col-span-2 px-3 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#060911]"
          />
          <input
            type="text"
            required
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="City"
            className="px-3 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#060911]"
          />
          <select
            value={stateName}
            onChange={(e) => setStateName(e.target.value)}
            className="px-3 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#060911]"
          >
            {INDIAN_STATES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <input
            type="text"
            required
            maxLength={6}
            value={pincode}
            onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
            placeholder="6-Digit PIN Code"
            className="px-3 py-2.5 text-sm font-mono-tabular rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#060911]"
          />
          <select
            value={label}
            onChange={(e) => setLabel(e.target.value as 'Home' | 'Office' | 'Other')}
            className="px-3 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#060911]"
          >
            <option value="Home">Home</option>
            <option value="Office">Office</option>
            <option value="Other">Other</option>
          </select>
          <div className="sm:col-span-2 flex justify-end gap-3">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-xs border rounded-lg">
              Cancel
            </button>
            <button type="submit" className="px-5 py-2 text-xs font-semibold text-white bg-[#2449B5] rounded-lg">
              Save Address
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {addresses.map((addr) => (
          <div
            key={addr.id}
            className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1526] flex justify-between gap-4"
          >
            <div>
              <p className="text-xs font-semibold text-[#2449B5] dark:text-blue-400">{addr.label}</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white mt-1">{addr.fullName}</p>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                {addr.line1}, {addr.city}, {addr.state} – {addr.pincode}
              </p>
              <p className="text-xs font-mono-tabular text-slate-500 mt-1">Phone: {addr.phone}</p>
            </div>
            <button
              type="button"
              onClick={() => handleDelete(addr.id)}
              aria-label="Delete address"
              className="text-slate-400 hover:text-rose-600 self-start"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}

export function ProfilePage() {
  const { user, userProfile, isAdmin, signOut, notifyToast } = useStore();
  const [displayName, setDisplayName] = useState(userProfile?.displayName || user?.displayName || '');
  const [phone, setPhone] = useState(userProfile?.phone || '');
  const [saving, setSaving] = useState(false);

  if (!user) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h1 className="font-display text-3xl font-bold">My Account</h1>
        <p className="text-sm text-slate-500 mt-2">Sign in to access your profile, orders, and preferences.</p>
        <Link to="/login" className="inline-block mt-6 px-6 py-3 text-sm font-semibold bg-[#0B1D3A] text-white rounded-lg">
          Sign In
        </Link>
      </main>
    );
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: sanitizeText(displayName, 120) || 'ROYAL FLASK Customer',
        phone: sanitizeText(phone, 24),
        updatedAt: serverTimestamp(),
      });
      notifyToast('Profile updated.', 'success');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <SeoHead title="Account Profile – ROYAL FLASK" description="Manage your ROYAL FLASK account." />
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="font-display text-3xl font-bold text-[#0B1D3A] dark:text-white">
            {userProfile?.displayName || user.displayName || 'Customer Profile'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">{user.email || user.phoneNumber}</p>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <Link
              to="/admin"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#2449B5] rounded-lg"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Open Admin Panel</span>
            </Link>
          )}
          <button
            type="button"
            onClick={signOut}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold border border-slate-300 dark:border-slate-700 rounded-lg"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <form
          onSubmit={handleSave}
          className="lg:col-span-6 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1526] space-y-4"
        >
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Profile Details</h2>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Full Name</label>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#060911]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Phone Number</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#060911]"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 text-xs font-semibold text-white bg-[#0B1D3A] dark:bg-[#2449B5] rounded-lg"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>

        <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { to: '/orders', title: 'My Orders', desc: 'Track & manage shipments', icon: Package },
            { to: '/addresses', title: 'Saved Addresses', desc: 'Indian delivery locations', icon: MapPin },
            { to: '/wishlist', title: 'Wishlist', desc: 'Saved items for later', icon: Heart },
            { to: '/notifications', title: 'Notifications', desc: 'Order & account alerts', icon: Bell },
            { to: '/settings', title: 'Settings', desc: 'Theme & preferences', icon: SettingsIcon },
          ].map((tile) => {
            const Icon = tile.icon;
            return (
              <Link
                key={tile.to}
                to={tile.to}
                className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1526] hover:border-[#2449B5] transition-colors"
              >
                <Icon className="w-5 h-5 text-[#2449B5] dark:text-blue-400 mb-2" />
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{tile.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">{tile.desc}</p>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}

export function NotificationsPage() {
  const { user, notifications } = useStore();

  const markRead = async (id: string) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid, 'notifications', id), { read: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}/notifications/${id}`);
    }
  };

  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <SeoHead title="Notifications – ROYAL FLASK" description="Account and order notifications." />
      <h1 className="font-display text-3xl font-bold text-[#0B1D3A] dark:text-white mb-6">Notifications</h1>
      {notifications.length === 0 ? (
        <div className="p-10 text-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1526]">
          <Bell className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-sm text-slate-500">You have no notifications right now.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`p-4 rounded-xl border ${
                n.read
                  ? 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1526]'
                  : 'border-[#2449B5] bg-blue-50/40 dark:bg-blue-950/30'
              } flex items-start justify-between gap-4`}
            >
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{n.title}</p>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{n.message}</p>
                <p className="text-[11px] text-slate-400 mt-1">{formatFirestoreDate(n.createdAt)}</p>
              </div>
              {!n.read && (
                <button
                  type="button"
                  onClick={() => markRead(n.id)}
                  className="text-xs font-medium text-[#2449B5] dark:text-blue-400 whitespace-nowrap"
                >
                  Mark read
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

export function SettingsPage() {
  const { theme, setTheme } = useStore();

  return (
    <main className="max-w-3xl mx-auto px-4 py-12 space-y-6">
      <SeoHead title="Settings – ROYAL FLASK" description="Manage theme and storefront preferences." />
      <h1 className="font-display text-3xl font-bold text-[#0B1D3A] dark:text-white">Settings</h1>

      <section className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1526] space-y-4">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">Appearance</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Your selected theme is remembered across sessions.
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`px-5 py-2.5 text-sm font-semibold rounded-lg border ${
              theme === 'light'
                ? 'border-[#2449B5] bg-[#0B1D3A] text-white'
                : 'border-slate-300 dark:border-slate-700'
            }`}
          >
            Light Mode (Navy &amp; Porcelain)
          </button>
          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`px-5 py-2.5 text-sm font-semibold rounded-lg border ${
              theme === 'dark'
                ? 'border-blue-400 bg-[#2449B5] text-white'
                : 'border-slate-300 dark:border-slate-700'
            }`}
          >
            Dark Mode (Deep Black &amp; Navy)
          </button>
        </div>
      </section>
    </main>
  );
}

export function SupportPage() {
  const { user, settings, notifyToast } = useStore();
  const [name, setName] = useState(user?.displayName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ticketId = `tkt_${Date.now()}`;
    try {
      await setDoc(doc(db, 'supportTickets', ticketId), {
        userId: user?.uid || 'guest',
        name: sanitizeText(name, 120),
        email: sanitizeText(email, 160),
        phone: sanitizeText(phone, 24),
        subject: sanitizeText(subject, 180),
        message: sanitizeText(message, 2000),
        status: 'open',
        createdAt: serverTimestamp(),
      });
      setSubmitted(true);
      setSubject('');
      setMessage('');
      notifyToast('Support enquiry submitted.', 'success');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `supportTickets/${ticketId}`);
    }
  };

  const waUrl = buildWhatsAppUrl(
    settings.whatsappNumber,
    'Hello ROYAL FLASK Support, I need assistance with my order or a product.',
  );

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 lg:grid-cols-12 gap-10">
      <SeoHead title="Customer Support – ROYAL FLASK" description="Contact ROYAL FLASK customer care via WhatsApp or support ticket." />
      <div className="lg:col-span-5 space-y-6">
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#0B1D3A] dark:text-white">
          Customer Support
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          Reach our Indian customer experience desk for warranty claims, bulk corporate gifting, or delivery tracking.
        </p>

        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1526] space-y-3 text-sm">
          <p>
            <span className="text-slate-500">Email:</span>{' '}
            <span className="font-medium text-slate-900 dark:text-white">{settings.supportEmail}</span>
          </p>
          <p>
            <span className="text-slate-500">WhatsApp Business:</span>{' '}
            <span className="font-mono-tabular font-medium text-slate-900 dark:text-white">
              +{settings.whatsappNumber.replace(/\D/g, '')}
            </span>
          </p>
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 w-full py-2.5 px-4 inline-flex items-center justify-center gap-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Open WhatsApp Support</span>
          </a>
        </div>
      </div>

      <div className="lg:col-span-7 p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1526]">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Submit an Enquiry</h2>
        {submitted && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-xs text-emerald-700 dark:text-emerald-300">
            Your enquiry has been logged. Our support team will reply via email.
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your Name"
              className="px-3 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#060911]"
            />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email Address"
              className="px-3 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#060911]"
            />
          </div>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Mobile Number (optional)"
            className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#060911]"
          />
          <input
            type="text"
            required
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject (e.g., Order Status, Corporate Gifting)"
            className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#060911]"
          />
          <textarea
            rows={4}
            required
            minLength={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="How can we assist you?"
            className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#060911]"
          />
          <button
            type="submit"
            className="px-6 py-3 text-sm font-semibold text-white bg-[#0B1D3A] dark:bg-[#2449B5] rounded-lg"
          >
            Send Message
          </button>
        </form>
      </div>
    </main>
  );
}

export function AboutPage() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-14 space-y-8">
      <SeoHead
        title="About Us – ROYAL FLASK India"
        description="Discover ROYAL FLASK's commitment to 304 surgical-grade stainless steel hydration and modern Indian kitchenware."
      />
      <h1 className="font-display text-4xl sm:text-5xl font-bold text-[#0B1D3A] dark:text-white">
        Crafted for the Contemporary Indian Home
      </h1>
      <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed">
        ROYAL FLASK (royalflask.in) brings architectural clarity, thermal engineering, and durable materials to
        everyday Home &amp; Kitchen essentials across India. From copper-lined vacuum flasks built for peak summer
        commutes to pre-seasoned cast iron cookware and airtight borosilicate pantry storage, every product is
        designed to eliminate disposable plastics and elevate daily rituals.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4">
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1526]">
          <h2 className="font-semibold text-slate-900 dark:text-white">Food-Safe Metallurgy</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
            304 stainless steel interiors, pure copper accents, and lead-free high-fired stoneware.
          </p>
        </div>
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1526]">
          <h2 className="font-semibold text-slate-900 dark:text-white">Transparent GST Billing</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
            Clear HSN codes, MRP savings, and compliant INR invoices on every checkout.
          </p>
        </div>
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1526]">
          <h2 className="font-semibold text-slate-900 dark:text-white">Direct Care</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
            Pan-India delivery with dedicated WhatsApp Business concierge support.
          </p>
        </div>
      </div>
    </main>
  );
}

export function PolicyPage({
  title,
  sections,
}: {
  title: string;
  sections: { heading: string; body: string }[];
}) {
  return (
    <main className="max-w-3xl mx-auto px-4 py-14 space-y-6">
      <SeoHead title={`${title} – ROYAL FLASK`} description={`${title} for ROYAL FLASK India (royalflask.in).`} />
      <h1 className="font-display text-4xl font-bold text-[#0B1D3A] dark:text-white">{title}</h1>
      <div className="space-y-6 pt-2">
        {sections.map((s) => (
          <section key={s.heading} className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{s.heading}</h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{s.body}</p>
          </section>
        ))}
      </div>
    </main>
  );
}
