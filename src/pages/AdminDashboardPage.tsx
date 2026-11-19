import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  BarChart3,
  Check,
  CreditCard,
  Database,
  FolderTree,
  Image as ImageIcon,
  Layers,
  MessageCircle,
  Package,
  Plus,
  Settings,
  ShieldAlert,
  ShoppingCart,
  Star,
  Tag,
  Trash2,
  Upload,
  Users,
} from 'lucide-react';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { useStore } from '../context/StoreContext';
import { db, handleFirestoreError, OperationType, storage } from '../lib/firebase';
import { formatFirestoreDate, formatINR, slugify } from '../lib/formatters';
import { IMG_KADAI, IMG_VACUUM_FLASK } from '../data/seedCatalog';
import { SeoHead } from '../components/SeoHead';
import { SmartImage } from '../components/SmartImage';
import type {
  Banner,
  Category,
  Coupon,
  Order,
  OrderStatus,
  PaymentRecord,
  Product,
  Review,
  UserProfile,
} from '../types/ecommerce';

type AdminTab =
  | 'overview'
  | 'products'
  | 'categories'
  | 'inventory'
  | 'orders'
  | 'customers'
  | 'coupons'
  | 'banners'
  | 'reviews'
  | 'payments'
  | 'settings'
  | 'whatsapp';

const ORDER_STATUSES: OrderStatus[] = [
  'Pending',
  'Confirmed',
  'Processing',
  'Shipped',
  'Out for Delivery',
  'Delivered',
  'Cancelled',
  'Returned',
  'Refunded',
];

export function AdminDashboardPage() {
  const {
    user,
    isAdmin,
    signOut,
    categories,
    products,
    banners,
    coupons,
    settings,
    orders,
    usingDemoFallback,
    seedDemoCatalogToFirestore,
    notifyToast,
  } = useStore();

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [customers, setCustomers] = useState<UserProfile[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [gatewayMode, setGatewayMode] = useState<'TEST_MODE' | 'LIVE'>('TEST_MODE');

  // Product Form State
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [pName, setPName] = useState('');
  const [pSku, setPSku] = useState('');
  const [pCatId, setPCatId] = useState('');
  const [pSubcat, setPSubcat] = useState('');
  const [pDesc, setPDesc] = useState('');
  const [pImage, setPImage] = useState(IMG_VACUUM_FLASK);
  const [pSelling, setPSelling] = useState(1499);
  const [pMrp, setPMrp] = useState(1999);
  const [pGst, setPGst] = useState(18);
  const [pHsn, setPHsn] = useState('96170011');
  const [pStock, setPStock] = useState(25);
  const [pDims, setPDims] = useState('28 cm x 8 cm');
  const [pWeight, setPWeight] = useState('420 g');
  const [pStatus, setPStatus] = useState<'active' | 'draft' | 'archived'>('active');
  const [pFeatured, setPFeatured] = useState(true);
  const [pTrending, setPTrending] = useState(false);
  const [pBestseller, setPBestseller] = useState(false);
  const [pNew, setPNew] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Category Form State
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [cName, setCName] = useState('');
  const [cDesc, setCDesc] = useState('');
  const [cImage, setCImage] = useState(IMG_KADAI);
  const [cSubs, setCSubs] = useState('');
  const [cActive, setCActive] = useState(true);

  // Coupon Form State
  const [cpCode, setCpCode] = useState('');
  const [cpType, setCpType] = useState<'PERCENT' | 'FLAT'>('PERCENT');
  const [cpVal, setCpVal] = useState(10);
  const [cpMin, setCpMin] = useState(999);
  const [cpMax, setCpMax] = useState(500);
  const [cpDesc, setCpDesc] = useState('');

  // Banner Form State
  const [bTitle, setBTitle] = useState('');
  const [bSub, setBSub] = useState('');
  const [bCta, setBCta] = useState('Shop Now');
  const [bLink, setBLink] = useState('/shop');
  const [bImg, setBImg] = useState(IMG_VACUUM_FLASK);

  // Settings & WhatsApp Form State
  const [sStoreName, setSStoreName] = useState(settings.storeName);
  const [sEmail, setSEmail] = useState(settings.supportEmail);
  const [sFreeShip, setSFreeShip] = useState(settings.freeShippingThreshold);
  const [sStdFee, setSStdFee] = useState(settings.standardShippingFee);
  const [sExpFee, setSExpFee] = useState(settings.expressShippingFee);
  const [sAnnounce, setSAnnounce] = useState(settings.announcementText);
  const [wPhone, setWPhone] = useState(settings.whatsappNumber);
  const [wGreeting, setWGreeting] = useState(settings.whatsappGreeting);

  // Order Tracking Filter
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('ALL');
  const [trackingDrafts, setTrackingDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    setSStoreName(settings.storeName);
    setSEmail(settings.supportEmail);
    setSFreeShip(settings.freeShippingThreshold);
    setSStdFee(settings.standardShippingFee);
    setSExpFee(settings.expressShippingFee);
    setSAnnounce(settings.announcementText);
    setWPhone(settings.whatsappNumber);
    setWGreeting(settings.whatsappGreeting);
  }, [settings]);

  useEffect(() => {
    if (!isAdmin) return;

    fetch('/api/payments/config')
      .then((r) => r.json())
      .then((d) => setGatewayMode(d.mode === 'LIVE' ? 'LIVE' : 'TEST_MODE'))
      .catch(() => {});

    const unsubUsers = onSnapshot(
      collection(db, 'users'),
      (snap) => setCustomers(snap.docs.map((d) => d.data() as UserProfile)),
      (err) => console.warn('Admin users:', err.message),
    );
    const unsubPayments = onSnapshot(
      collection(db, 'payments'),
      (snap) => setPayments(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<PaymentRecord, 'id'>) }))),
      (err) => console.warn('Admin payments:', err.message),
    );
    const unsubReviews = onSnapshot(
      collection(db, 'reviews'),
      (snap) => setReviews(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Review, 'id'>) }))),
      (err) => console.warn('Admin reviews:', err.message),
    );

    return () => {
      unsubUsers();
      unsubPayments();
      unsubReviews();
    };
  }, [isAdmin]);

  const metrics = useMemo(() => {
    const validOrders = orders.filter((o) => o.status !== 'Cancelled' && o.status !== 'Refunded');
    const totalSales = validOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const pendingOrders = orders.filter((o) => ['Pending', 'Confirmed', 'Processing', 'Shipped'].includes(o.status)).length;
    const completedOrders = orders.filter((o) => o.status === 'Delivered').length;
    const lowStockProducts = products.filter((p) => p.stockQty <= 10);
    return {
      totalSales,
      totalOrders: orders.length,
      totalProducts: products.length,
      totalCustomers: customers.length,
      pendingOrders,
      completedOrders,
      lowStockProducts,
    };
  }, [orders, products, customers]);

  if (!user || !isAdmin) {
    return (
      <main className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
        <SeoHead title="Restricted Admin Area – ROYAL FLASK" description="Protected admin panel." />
        <ShieldAlert className="w-10 h-10 text-rose-600 mx-auto" />
        <h1 className="font-display text-3xl font-bold text-[#0B1D3A] dark:text-white">
          Admin Access Required
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          This dashboard is protected by server-verified Firebase Auth &amp; Firestore security rules. Please sign in
          with the designated Super Admin account.
        </p>
        {user && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Currently signed in as: <span className="font-semibold">{user.email || user.phoneNumber || user.uid}</span>
          </p>
        )}
        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          {user ? (
            <button
              type="button"
              onClick={() => signOut()}
              className="px-6 py-3 text-sm font-semibold text-white bg-[#0B1D3A] dark:bg-[#2449B5] rounded-lg"
            >
              Sign Out &amp; Switch Account
            </button>
          ) : (
            <Link
              to="/login"
              className="inline-block px-6 py-3 text-sm font-semibold text-white bg-[#0B1D3A] dark:bg-[#2449B5] rounded-lg"
            >
              Sign In
            </Link>
          )}
        </div>
      </main>
    );
  }

  const handleImageFileUpload = async (file: File, folder: 'products' | 'categories' | 'banners', onDone: (url: string) => void) => {
    setUploadingImage(true);
    try {
      const storageRef = ref(storage, `${folder}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      onDone(url);
      notifyToast('Image uploaded to Firebase Storage.', 'success');
    } catch (err) {
      notifyToast(
        err instanceof Error
          ? `Storage upload failed (${err.message}). Ensure Firebase Storage is enabled in Console or paste an image URL.`
          : 'Upload failed.',
        'error',
      );
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const cat = categories.find((c) => c.id === pCatId) || categories[0];
    if (!cat) return;
    const id = editingProductId || `prod_${Date.now()}`;
    const existingProd = editingProductId ? products.find((p) => p.id === editingProductId) : undefined;
    const discount = pMrp > pSelling ? Math.round(((pMrp - pSelling) / pMrp) * 100) : 0;
    const payload = {
      name: pName.trim(),
      slug: slugify(pName) || id,
      sku: pSku.trim() || `RF-${Date.now().toString().slice(-5)}`,
      categoryId: cat.id,
      categoryName: cat.name,
      subcategory: pSubcat.trim() || cat.subcategories[0] || 'General',
      description: pDesc.trim() || 'Premium Home & Kitchen product from ROYAL FLASK.',
      images: [pImage.trim() || IMG_VACUUM_FLASK],
      sellingPrice: Number(pSelling),
      mrp: Number(pMrp),
      discountPercent: Math.max(0, Math.min(99, discount)),
      gstPercent: Number(pGst),
      hsnCode: pHsn.trim() || '96170011',
      stockQty: Number(pStock),
      variants: [{ id: 'default', label: 'Standard', priceDelta: 0, stockQty: Number(pStock) }],
      dimensions: pDims.trim() || 'Standard',
      weight: pWeight.trim() || '500 g',
      specifications: [{ key: 'Brand', value: 'ROYAL FLASK' }],
      status: pStatus,
      featured: pFeatured,
      trending: pTrending,
      bestseller: pBestseller,
      newArrival: pNew,
      isDemoData: false,
      ratingAvg: existingProd?.ratingAvg ?? 0,
      reviewCount: existingProd?.reviewCount ?? 0,
      updatedAt: serverTimestamp(),
      ...(editingProductId ? {} : { createdAt: serverTimestamp() }),
    };

    try {
      if (editingProductId) {
        await setDoc(doc(db, 'products', id), {
          ...payload,
          createdAt: existingProd?.createdAt || serverTimestamp(),
        });
        notifyToast('Product updated.', 'success');
      } else {
        await setDoc(doc(db, 'products', id), payload);
        notifyToast('Product created.', 'success');
      }
      setEditingProductId(null);
      setPName('');
      setPSku('');
      setPDesc('');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `products/${id}`);
    }
  };

  const handleEditProduct = (p: Product) => {
    setEditingProductId(p.id);
    setPName(p.name);
    setPSku(p.sku);
    setPCatId(p.categoryId);
    setPSubcat(p.subcategory);
    setPDesc(p.description);
    setPImage(p.images[0] || IMG_VACUUM_FLASK);
    setPSelling(p.sellingPrice);
    setPMrp(p.mrp);
    setPGst(p.gstPercent);
    setPHsn(p.hsnCode);
    setPStock(p.stockQty);
    setPDims(p.dimensions);
    setPWeight(p.weight);
    setPStatus(p.status);
    setPFeatured(p.featured);
    setPTrending(p.trending);
    setPBestseller(p.bestseller);
    setPNew(p.newArrival);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = editingCatId || `cat_${slugify(cName).replace(/-/g, '_')}`;
    const subs = cSubs
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 30);

    try {
      const existingCat = categories.find((c) => c.id === id);
      await setDoc(doc(db, 'categories', id), {
        name: cName.trim(),
        slug: slugify(cName),
        description: cDesc.trim() || `${cName.trim()} collection`,
        image: cImage.trim() || IMG_KADAI,
        active: cActive,
        sortOrder: existingCat?.sortOrder ?? categories.length + 1,
        subcategories: subs,
        createdAt: existingCat?.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setEditingCatId(null);
      setCName('');
      setCDesc('');
      setCSubs('');
      notifyToast('Category saved.', 'success');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `categories/${id}`);
    }
  };

  const handleUpdateOrderStatus = async (order: Order, nextStatus: OrderStatus) => {
    const tracking = trackingDrafts[order.id] ?? order.trackingNumber ?? '';
    try {
      await updateDoc(doc(db, 'orders', order.id), {
        status: nextStatus,
        trackingNumber: tracking,
        statusHistory: [
          ...order.statusHistory,
          {
            status: nextStatus,
            note: tracking ? `Updated by Admin (AWB: ${tracking})` : 'Status updated by Admin',
            timestampIso: new Date().toISOString(),
          },
        ],
        updatedAt: serverTimestamp(),
      });
      await setDoc(doc(db, 'users', order.userId, 'notifications', `ntf_${Date.now()}`), {
        userId: order.userId,
        title: `Order ${order.orderNumber}: ${nextStatus}`,
        message: tracking
          ? `Your order status is now ${nextStatus}. Tracking: ${tracking}`
          : `Your order status has been updated to ${nextStatus}.`,
        type: 'order',
        orderId: order.id,
        read: false,
        createdAt: serverTimestamp(),
      });
      notifyToast(`Order ${order.orderNumber} updated to ${nextStatus}.`, 'success');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `orders/${order.id}`);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await setDoc(doc(db, 'settings', 'store'), {
        storeName: sStoreName.trim() || 'ROYAL FLASK',
        supportEmail: sEmail.trim() || 'care@royalflask.in',
        whatsappNumber: wPhone.replace(/\D/g, '') || '919800000000',
        whatsappGreeting: wGreeting.trim(),
        freeShippingThreshold: Number(sFreeShip),
        standardShippingFee: Number(sStdFee),
        expressShippingFee: Number(sExpFee),
        announcementText: sAnnounce.trim(),
        updatedAt: serverTimestamp(),
      });
      notifyToast('Store & WhatsApp settings saved.', 'success');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'settings/store');
    }
  };

  const navItems: { id: AdminTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'overview', label: 'Overview & Reports', icon: BarChart3 },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'categories', label: 'Categories', icon: FolderTree },
    { id: 'inventory', label: 'Inventory', icon: Layers },
    { id: 'orders', label: 'Orders', icon: ShoppingCart },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'coupons', label: 'Coupons', icon: Tag },
    { id: 'banners', label: 'Banners', icon: ImageIcon },
    { id: 'reviews', label: 'Reviews', icon: Star },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'settings', label: 'Website Settings', icon: Settings },
    { id: 'whatsapp', label: 'WhatsApp Settings', icon: MessageCircle },
  ];

  const filteredOrders =
    orderStatusFilter === 'ALL' ? orders : orders.filter((o) => o.status === orderStatusFilter);

  return (
    <div className="min-h-[85vh] bg-slate-50 dark:bg-[#060911]">
      <SeoHead title="Admin Console – ROYAL FLASK" description="Store administration and analytics." />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Sidebar */}
        <aside className="lg:col-span-3 bg-white dark:bg-[#0D1526] border border-slate-200 dark:border-slate-800 rounded-xl p-3 space-y-1">
          <div className="px-3 py-2.5 border-b border-slate-200 dark:border-slate-800 mb-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Admin Console</p>
            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{user.email}</p>
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                  active
                    ? 'bg-[#0B1D3A] dark:bg-[#2449B5] text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </aside>

        {/* Main Panel */}
        <section className="lg:col-span-9 space-y-6">
          {/* Header Action Bar */}
          <div className="bg-white dark:bg-[#0D1526] border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl font-bold text-[#0B1D3A] dark:text-white">
                {navItems.find((n) => n.id === activeTab)?.label}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Payment Gateway: {gatewayMode === 'LIVE' ? 'Live Razorpay' : 'Test Mode'} ·{' '}
                {usingDemoFallback ? 'Demo catalog not yet published to Firestore' : 'Live Firestore catalog'}
              </p>
            </div>
            <button
              type="button"
              onClick={seedDemoCatalogToFirestore}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#2449B5] hover:bg-blue-700 rounded-lg"
            >
              <Database className="w-3.5 h-3.5" />
              <span>Seed / Reset 13 Categories &amp; Demo Catalog</span>
            </button>
          </div>

          {/* 1. OVERVIEW & ANALYTICS */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Total Sales', val: formatINR(metrics.totalSales) },
                  { label: 'Total Orders', val: String(metrics.totalOrders) },
                  { label: 'Total Products', val: String(metrics.totalProducts) },
                  { label: 'Total Customers', val: String(metrics.totalCustomers) },
                  { label: 'Pending Orders', val: String(metrics.pendingOrders) },
                  { label: 'Completed Orders', val: String(metrics.completedOrders) },
                  { label: 'Low Stock Alerts', val: String(metrics.lowStockProducts.length) },
                  { label: 'Active Coupons', val: String(coupons.filter((c) => c.active).length) },
                ].map((kpi) => (
                  <div
                    key={kpi.label}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1526]"
                  >
                    <p className="text-xs text-slate-500 dark:text-slate-400">{kpi.label}</p>
                    <p className="mt-1 text-2xl font-bold font-mono-tabular text-[#0B1D3A] dark:text-white">
                      {kpi.val}
                    </p>
                  </div>
                ))}
              </div>

              {metrics.lowStockProducts.length > 0 && (
                <div className="p-5 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
                  <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-semibold text-sm mb-3">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Low Stock Alert (≤ 10 units)</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    {metrics.lowStockProducts.map((p) => (
                      <div key={p.id} className="flex justify-between">
                        <span>{p.name} ({p.sku})</span>
                        <span className="font-mono-tabular font-semibold">{p.stockQty} left</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Category Catalog Breakdown */}
              <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1526]">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
                  Catalog Distribution by Category
                </h2>
                <div className="space-y-2.5 text-xs">
                  {categories.map((cat) => {
                    const count = products.filter((p) => p.categoryId === cat.id).length;
                    const pct = products.length > 0 ? Math.round((count / products.length) * 100) : 0;
                    return (
                      <div key={cat.id} className="grid grid-cols-12 items-center gap-3">
                        <span className="col-span-5 truncate font-medium">{cat.name}</span>
                        <div className="col-span-5 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div className="h-full bg-[#2449B5]" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="col-span-2 text-right font-mono-tabular text-slate-500">
                          {count} SKUs
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* 2. PRODUCT MANAGEMENT */}
          {activeTab === 'products' && (
            <div className="space-y-6">
              <form
                onSubmit={handleSaveProduct}
                className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1526] space-y-4"
              >
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                  {editingProductId ? 'Edit Product' : 'Add New Product'}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                  <input
                    type="text"
                    required
                    value={pName}
                    onChange={(e) => setPName(e.target.value)}
                    placeholder="Product Name"
                    className="sm:col-span-2 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#060911]"
                  />
                  <input
                    type="text"
                    required
                    value={pSku}
                    onChange={(e) => setPSku(e.target.value)}
                    placeholder="SKU (e.g. RF-FLK-750)"
                    className="px-3 py-2 font-mono-tabular rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#060911]"
                  />
                  <select
                    value={pCatId || categories[0]?.id || ''}
                    onChange={(e) => setPCatId(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#060911]"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={pSubcat}
                    onChange={(e) => setPSubcat(e.target.value)}
                    placeholder="Subcategory"
                    className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#060911]"
                  />
                  <select
                    value={pStatus}
                    onChange={(e) => setPStatus(e.target.value as 'active' | 'draft' | 'archived')}
                    className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#060911]"
                  >
                    <option value="active">Active</option>
                    <option value="draft">Draft</option>
                    <option value="archived">Archived</option>
                  </select>
                  <input
                    type="number"
                    required
                    value={pSelling}
                    onChange={(e) => setPSelling(Number(e.target.value))}
                    placeholder="Selling Price (₹)"
                    className="px-3 py-2 font-mono-tabular rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#060911]"
                  />
                  <input
                    type="number"
                    required
                    value={pMrp}
                    onChange={(e) => setPMrp(Number(e.target.value))}
                    placeholder="MRP (₹)"
                    className="px-3 py-2 font-mono-tabular rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#060911]"
                  />
                  <input
                    type="number"
                    required
                    value={pStock}
                    onChange={(e) => setPStock(Number(e.target.value))}
                    placeholder="Stock Qty"
                    className="px-3 py-2 font-mono-tabular rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#060911]"
                  />
                  <input
                    type="number"
                    value={pGst}
                    onChange={(e) => setPGst(Number(e.target.value))}
                    placeholder="GST %"
                    className="px-3 py-2 font-mono-tabular rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#060911]"
                  />
                  <input
                    type="text"
                    value={pHsn}
                    onChange={(e) => setPHsn(e.target.value)}
                    placeholder="HSN Code"
                    className="px-3 py-2 font-mono-tabular rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#060911]"
                  />
                  <input
                    type="text"
                    value={pDims}
                    onChange={(e) => setPDims(e.target.value)}
                    placeholder="Dimensions"
                    className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#060911]"
                  />
                  <input
                    type="text"
                    value={pWeight}
                    onChange={(e) => setPWeight(e.target.value)}
                    placeholder="Weight"
                    className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#060911]"
                  />
                  <div className="sm:col-span-2 flex gap-2">
                    <input
                      type="text"
                      value={pImage}
                      onChange={(e) => setPImage(e.target.value)}
                      placeholder="Image URL"
                      className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#060911]"
                    />
                    <label className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-slate-300 dark:border-slate-700 rounded-lg cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{uploadingImage ? 'Uploading...' : 'Upload'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleImageFileUpload(f, 'products', setPImage);
                        }}
                      />
                    </label>
                  </div>
                  <textarea
                    rows={2}
                    value={pDesc}
                    onChange={(e) => setPDesc(e.target.value)}
                    placeholder="Product Description"
                    className="sm:col-span-3 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#060911]"
                  />
                </div>
                <div className="flex flex-wrap gap-4 text-xs">
                  <label className="flex items-center gap-1.5"><input type="checkbox" checked={pFeatured} onChange={(e) => setPFeatured(e.target.checked)} /> Featured</label>
                  <label className="flex items-center gap-1.5"><input type="checkbox" checked={pTrending} onChange={(e) => setPTrending(e.target.checked)} /> Trending</label>
                  <label className="flex items-center gap-1.5"><input type="checkbox" checked={pBestseller} onChange={(e) => setPBestseller(e.target.checked)} /> Bestseller</label>
                  <label className="flex items-center gap-1.5"><input type="checkbox" checked={pNew} onChange={(e) => setPNew(e.target.checked)} /> New Arrival</label>
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="px-5 py-2 text-xs font-semibold text-white bg-[#0B1D3A] dark:bg-[#2449B5] rounded-lg">
                    {editingProductId ? 'Update Product' : 'Create Product'}
                  </button>
                  {editingProductId && (
                    <button
                      type="button"
                      onClick={() => setEditingProductId(null)}
                      className="px-4 py-2 text-xs border rounded-lg"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>
              </form>

              <div className="bg-white dark:bg-[#0D1526] border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-[#131E36] text-slate-500">
                    <tr>
                      <th className="p-3">Product</th>
                      <th className="p-3">SKU</th>
                      <th className="p-3">Category</th>
                      <th className="p-3 text-right">Price</th>
                      <th className="p-3 text-right">Stock</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {products.map((p) => (
                      <tr key={p.id}>
                        <td className="p-3 font-medium flex items-center gap-2.5">
                          <SmartImage src={p.images[0]} alt={p.name} className="w-9 h-9 rounded object-cover shrink-0" />
                          <span className="line-clamp-1">{p.name}</span>
                        </td>
                        <td className="p-3 font-mono-tabular">{p.sku}</td>
                        <td className="p-3">{p.categoryName}</td>
                        <td className="p-3 text-right font-mono-tabular">{formatINR(p.sellingPrice)}</td>
                        <td className="p-3 text-right font-mono-tabular">{p.stockQty}</td>
                        <td className="p-3 capitalize">{p.status}</td>
                        <td className="p-3 text-right space-x-2 whitespace-nowrap">
                          <button type="button" onClick={() => handleEditProduct(p)} className="text-[#2449B5] dark:text-blue-400 font-medium">Edit</button>
                          <button
                            type="button"
                            onClick={() => deleteDoc(doc(db, 'products', p.id)).then(() => notifyToast('Deleted product', 'info'))}
                            className="text-rose-600"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 3. CATEGORY MANAGEMENT */}
          {activeTab === 'categories' && (
            <div className="space-y-6">
              <form
                onSubmit={handleSaveCategory}
                className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1526] grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm"
              >
                <input
                  type="text"
                  required
                  value={cName}
                  onChange={(e) => setCName(e.target.value)}
                  placeholder="Category Name"
                  className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#060911]"
                />
                <input
                  type="text"
                  value={cSubs}
                  onChange={(e) => setCSubs(e.target.value)}
                  placeholder="Subcategories (comma-separated)"
                  className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#060911]"
                />
                <input
                  type="text"
                  value={cImage}
                  onChange={(e) => setCImage(e.target.value)}
                  placeholder="Category Image URL"
                  className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#060911]"
                />
                <input
                  type="text"
                  value={cDesc}
                  onChange={(e) => setCDesc(e.target.value)}
                  placeholder="Description"
                  className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#060911]"
                />
                <div className="sm:col-span-2 flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs">
                    <input type="checkbox" checked={cActive} onChange={(e) => setCActive(e.target.checked)} /> Active
                  </label>
                  <button type="submit" className="px-5 py-2 text-xs font-semibold text-white bg-[#2449B5] rounded-lg">
                    {editingCatId ? 'Update Category' : 'Add Category'}
                  </button>
                </div>
              </form>

              <div className="bg-white dark:bg-[#0D1526] border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-200 dark:divide-slate-800">
                {categories.map((cat) => (
                  <div key={cat.id} className="p-4 flex items-center justify-between gap-4 text-xs">
                    <div>
                      <p className="font-semibold text-sm text-slate-900 dark:text-white">
                        {cat.name} <span className="text-slate-400 font-normal">({cat.active ? 'Active' : 'Inactive'})</span>
                      </p>
                      <p className="text-slate-500 mt-0.5">{cat.subcategories.join(' · ')}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          updateDoc(doc(db, 'categories', cat.id), {
                            active: !cat.active,
                            updatedAt: serverTimestamp(),
                          })
                        }
                        className="px-2.5 py-1 border border-slate-300 dark:border-slate-700 rounded"
                      >
                        {cat.active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCatId(cat.id);
                          setCName(cat.name);
                          setCDesc(cat.description);
                          setCImage(cat.image);
                          setCSubs(cat.subcategories.join(', '));
                          setCActive(cat.active);
                        }}
                        className="text-[#2449B5] dark:text-blue-400 font-medium"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteDoc(doc(db, 'categories', cat.id))}
                        className="text-rose-600"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. INVENTORY MANAGEMENT */}
          {activeTab === 'inventory' && (
            <div className="bg-white dark:bg-[#0D1526] border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-200 dark:divide-slate-800">
              {products.map((p) => (
                <div key={p.id} className="p-4 flex flex-wrap items-center justify-between gap-4 text-xs">
                  <div>
                    <p className="font-semibold text-sm text-slate-900 dark:text-white">{p.name}</p>
                    <p className="text-slate-500 font-mono-tabular">SKU: {p.sku}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`font-mono-tabular font-semibold ${p.stockQty <= 10 ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {p.stockQty} units
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        updateDoc(doc(db, 'products', p.id), {
                          stockQty: p.stockQty + 10,
                          updatedAt: serverTimestamp(),
                        }).then(() => notifyToast(`Added 10 stock to ${p.sku}`, 'success'))
                      }
                      className="px-3 py-1.5 bg-[#0B1D3A] dark:bg-[#2449B5] text-white rounded-md"
                    >
                      +10 Stock
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 5. ORDER MANAGEMENT */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {(['ALL', ...ORDER_STATUSES] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setOrderStatusFilter(st)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border ${
                      orderStatusFilter === st
                        ? 'bg-[#0B1D3A] dark:bg-[#2449B5] text-white border-[#0B1D3A]'
                        : 'bg-white dark:bg-[#0D1526] border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              {filteredOrders.length === 0 ? (
                <div className="p-10 text-center bg-white dark:bg-[#0D1526] border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-500">
                  No orders in this filter.
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredOrders.map((order) => (
                    <div
                      key={order.id}
                      className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1526] space-y-3 text-xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="font-mono-tabular font-bold text-sm text-[#0B1D3A] dark:text-white">
                            {order.orderNumber}
                          </span>
                          <span className="text-slate-500 ml-2">
                            {order.customerName} ({order.customerPhone}) · {formatFirestoreDate(order.createdAt)}
                          </span>
                        </div>
                        <span className="font-mono-tabular font-bold text-sm">{formatINR(order.totalAmount)}</span>
                      </div>

                      <p className="text-slate-600 dark:text-slate-400">
                        Ship to: {order.shippingAddress.line1}, {order.shippingAddress.city}, {order.shippingAddress.state} – {order.shippingAddress.pincode}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 pt-2">
                        <input
                          type="text"
                          value={trackingDrafts[order.id] ?? order.trackingNumber ?? ''}
                          onChange={(e) => setTrackingDrafts((d) => ({ ...d, [order.id]: e.target.value }))}
                          placeholder="AWB Tracking #"
                          className="px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#060911] font-mono-tabular"
                        />
                        <select
                          value={order.status}
                          onChange={(e) => handleUpdateOrderStatus(order, e.target.value as OrderStatus)}
                          className="px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#060911] font-semibold"
                        >
                          {ORDER_STATUSES.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 6. CUSTOMERS */}
          {activeTab === 'customers' && (
            <div className="bg-white dark:bg-[#0D1526] border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-[#131E36] text-slate-500">
                  <tr>
                    <th className="p-3">Customer</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Phone</th>
                    <th className="p-3 text-right">Orders</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {customers.map((c) => {
                    const count = orders.filter((o) => o.userId === c.uid).length;
                    return (
                      <tr key={c.uid}>
                        <td className="p-3 font-medium">{c.displayName}</td>
                        <td className="p-3">{c.email}</td>
                        <td className="p-3 font-mono-tabular">{c.phone || '—'}</td>
                        <td className="p-3 text-right font-mono-tabular">{count}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* 7. COUPONS */}
          {activeTab === 'coupons' && (
            <div className="space-y-6">
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const code = cpCode.trim().toUpperCase();
                  if (!code) return;
                  const id = `coupon_${code.toLowerCase()}`;
                  await setDoc(doc(db, 'coupons', id), {
                    code,
                    type: cpType,
                    value: Number(cpVal),
                    minOrderAmount: Number(cpMin),
                    maxDiscount: Number(cpMax),
                    description: cpDesc.trim() || `${code} discount`,
                    active: true,
                    usageCount: 0,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                  });
                  setCpCode('');
                  setCpDesc('');
                  notifyToast(`Coupon ${code} created.`, 'success');
                }}
                className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1526] grid grid-cols-2 sm:grid-cols-6 gap-3 text-xs"
              >
                <input type="text" required value={cpCode} onChange={(e) => setCpCode(e.target.value)} placeholder="CODE" className="px-3 py-2 uppercase rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#060911]" />
                <select value={cpType} onChange={(e) => setCpType(e.target.value as 'PERCENT' | 'FLAT')} className="px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#060911]">
                  <option value="PERCENT">Percent %</option>
                  <option value="FLAT">Flat ₹</option>
                </select>
                <input type="number" value={cpVal} onChange={(e) => setCpVal(Number(e.target.value))} placeholder="Value" className="px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#060911]" />
                <input type="number" value={cpMin} onChange={(e) => setCpMin(Number(e.target.value))} placeholder="Min Order ₹" className="px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#060911]" />
                <input type="number" value={cpMax} onChange={(e) => setCpMax(Number(e.target.value))} placeholder="Max Disc ₹" className="px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#060911]" />
                <button type="submit" className="px-4 py-2 font-semibold text-white bg-[#2449B5] rounded-lg">Add Coupon</button>
              </form>

              <div className="bg-white dark:bg-[#0D1526] border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-200 dark:divide-slate-800">
                {coupons.map((cp) => (
                  <div key={cp.id} className="p-4 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-mono-tabular font-bold text-sm">{cp.code}</p>
                      <p className="text-slate-500">{cp.description}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => updateDoc(doc(db, 'coupons', cp.id), { active: !cp.active, updatedAt: serverTimestamp() })}
                        className="px-2.5 py-1 border rounded"
                      >
                        {cp.active ? 'Active' : 'Paused'}
                      </button>
                      <button type="button" onClick={() => deleteDoc(doc(db, 'coupons', cp.id))} className="text-rose-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 8. BANNERS */}
          {activeTab === 'banners' && (
            <div className="space-y-6">
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const id = `banner_${Date.now()}`;
                  await setDoc(doc(db, 'banners', id), {
                    title: bTitle.trim(),
                    subtitle: bSub.trim(),
                    ctaText: bCta.trim() || 'Shop Now',
                    ctaLink: bLink.trim() || '/shop',
                    image: bImg.trim() || IMG_VACUUM_FLASK,
                    active: true,
                    sortOrder: banners.length + 1,
                    updatedAt: serverTimestamp(),
                  });
                  setBTitle('');
                  setBSub('');
                  notifyToast('Homepage banner added.', 'success');
                }}
                className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1526] grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs"
              >
                <input type="text" required value={bTitle} onChange={(e) => setBTitle(e.target.value)} placeholder="Banner Headline" className="px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#060911]" />
                <input type="text" required value={bSub} onChange={(e) => setBSub(e.target.value)} placeholder="Subtitle" className="px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#060911]" />
                <input type="text" value={bCta} onChange={(e) => setBCta(e.target.value)} placeholder="CTA Text" className="px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#060911]" />
                <input type="text" value={bLink} onChange={(e) => setBLink(e.target.value)} placeholder="CTA Link (/shop)" className="px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#060911]" />
                <input type="text" value={bImg} onChange={(e) => setBImg(e.target.value)} placeholder="Image URL" className="sm:col-span-2 px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#060911]" />
                <button type="submit" className="sm:col-span-2 py-2.5 font-semibold text-white bg-[#2449B5] rounded-lg">Save Banner</button>
              </form>

              <div className="space-y-3">
                {banners.map((b) => (
                  <div key={b.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1526] flex items-center justify-between gap-4 text-xs">
                    <div className="flex items-center gap-3">
                      <SmartImage src={b.image} alt={b.title} className="w-16 h-10 rounded object-cover" />
                      <div>
                        <p className="font-semibold text-sm">{b.title}</p>
                        <p className="text-slate-500 line-clamp-1">{b.subtitle}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => updateDoc(doc(db, 'banners', b.id), { active: !b.active, updatedAt: serverTimestamp() })}
                      className="px-3 py-1 border rounded"
                    >
                      {b.active ? 'Active' : 'Hidden'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 9. REVIEWS */}
          {activeTab === 'reviews' && (
            <div className="bg-white dark:bg-[#0D1526] border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-200 dark:divide-slate-800">
              {reviews.length === 0 ? (
                <p className="p-8 text-center text-sm text-slate-500">No customer reviews submitted yet.</p>
              ) : (
                reviews.map((r) => (
                  <div key={r.id} className="p-4 flex items-center justify-between gap-4 text-xs">
                    <div>
                      <p className="font-semibold">
                        {r.userName} · {r.rating}/5 Stars ·{' '}
                        <span className="uppercase text-[11px]">{r.status}</span>
                        {r.verifiedPurchase && ' · Verified Purchase'}
                      </p>
                      <p className="text-slate-600 dark:text-slate-300 mt-1">{r.comment}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {r.status !== 'approved' && (
                        <button
                          type="button"
                          onClick={() =>
                            updateDoc(doc(db, 'reviews', r.id), { status: 'approved' }).then(() =>
                              notifyToast('Review approved.', 'success'),
                            )
                          }
                          className="px-2.5 py-1 border border-emerald-600/40 text-emerald-700 dark:text-emerald-400 rounded"
                        >
                          Approve
                        </button>
                      )}
                      {r.status !== 'rejected' && (
                        <button
                          type="button"
                          onClick={() =>
                            updateDoc(doc(db, 'reviews', r.id), { status: 'rejected' }).then(() =>
                              notifyToast('Review rejected.', 'info'),
                            )
                          }
                          className="px-2.5 py-1 border border-amber-600/40 text-amber-700 dark:text-amber-400 rounded"
                        >
                          Reject
                        </button>
                      )}
                      {r.status === 'approved' && (
                        <button
                          type="button"
                          onClick={() =>
                            updateDoc(doc(db, 'reviews', r.id), { status: 'hidden' }).then(() =>
                              notifyToast('Review hidden.', 'info'),
                            )
                          }
                          className="px-2.5 py-1 border rounded"
                        >
                          Hide
                        </button>
                      )}
                      <button type="button" onClick={() => deleteDoc(doc(db, 'reviews', r.id))} className="text-rose-600">
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* 10. PAYMENTS */}
          {activeTab === 'payments' && (
            <div className="bg-white dark:bg-[#0D1526] border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-[#131E36] text-slate-500">
                  <tr>
                    <th className="p-3">Order #</th>
                    <th className="p-3">Method</th>
                    <th className="p-3">Mode</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Gateway Ref</th>
                    <th className="p-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td className="p-3 font-mono-tabular font-semibold">{p.orderNumber}</td>
                      <td className="p-3">{p.method}</td>
                      <td className="p-3">{p.mode}</td>
                      <td className="p-3">{p.status}</td>
                      <td className="p-3 font-mono-tabular">{p.gatewayRef}</td>
                      <td className="p-3 text-right font-mono-tabular font-semibold">{formatINR(p.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 11. WEBSITE SETTINGS & 12. WHATSAPP SETTINGS */}
          {(activeTab === 'settings' || activeTab === 'whatsapp') && (
            <form
              onSubmit={handleSaveSettings}
              className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1526] space-y-4 text-sm"
            >
              {activeTab === 'settings' ? (
                <>
                  <h2 className="font-semibold text-base">Website &amp; Shipping Settings</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Store Name</label>
                      <input type="text" value={sStoreName} onChange={(e) => setSStoreName(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#060911]" />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Support Email</label>
                      <input type="email" value={sEmail} onChange={(e) => setSEmail(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#060911]" />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Free Shipping Threshold (₹)</label>
                      <input type="number" value={sFreeShip} onChange={(e) => setSFreeShip(Number(e.target.value))} className="w-full px-3 py-2 font-mono-tabular rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#060911]" />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Standard Shipping Fee (₹)</label>
                      <input type="number" value={sStdFee} onChange={(e) => setSStdFee(Number(e.target.value))} className="w-full px-3 py-2 font-mono-tabular rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#060911]" />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Express Shipping Fee (₹)</label>
                      <input type="number" value={sExpFee} onChange={(e) => setSExpFee(Number(e.target.value))} className="w-full px-3 py-2 font-mono-tabular rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#060911]" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs text-slate-500 mb-1">Top Announcement Text</label>
                      <input type="text" value={sAnnounce} onChange={(e) => setSAnnounce(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#060911]" />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <h2 className="font-semibold text-base">WhatsApp Business Integration Settings</h2>
                  <p className="text-xs text-slate-500">
                    All floating support buttons, product enquiries, cart share, and order enquiries route to this configured WhatsApp Business number via click-to-chat URLs.
                  </p>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">WhatsApp Business Number (Country Code + Digits, e.g. 919876543210)</label>
                      <input type="text" required value={wPhone} onChange={(e) => setWPhone(e.target.value)} className="w-full px-3 py-2 font-mono-tabular rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#060911]" />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Default Greeting Message</label>
                      <textarea rows={3} value={wGreeting} onChange={(e) => setWGreeting(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#060911]" />
                    </div>
                  </div>
                </>
              )}

              <button type="submit" className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-[#2449B5] rounded-lg">
                <Check className="w-4 h-4" />
                <span>Save Configuration</span>
              </button>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
