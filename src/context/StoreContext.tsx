import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  isVerifiedSuperAdmin,
  OperationType,
  testFirestoreConnection,
} from '../lib/firebase';
import {
  DEFAULT_STORE_SETTINGS,
  SEED_BANNERS,
  SEED_CATEGORIES,
  SEED_COUPONS,
  SEED_PRODUCTS,
} from '../data/seedCatalog';
import type {
  Address,
  Banner,
  CartItem,
  Category,
  Coupon,
  NotificationItem,
  Order,
  Product,
  ProductVariant,
  Review,
  StoreSettings,
  ThemeMode,
  UserProfile,
  WishlistItem,
} from '../types/ecommerce';

interface ToastMessage {
  id: string;
  text: string;
  tone: 'info' | 'success' | 'error';
}

interface StoreContextValue {
  theme: ThemeMode;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
  user: User | null;
  authReady: boolean;
  userProfile: UserProfile | null;
  isAdmin: boolean;
  categories: Category[];
  products: Product[];
  banners: Banner[];
  coupons: Coupon[];
  settings: StoreSettings;
  usingDemoFallback: boolean;
  catalogLoading: boolean;
  cart: CartItem[];
  cartCount: number;
  cartDrawerOpen: boolean;
  setCartDrawerOpen: (open: boolean) => void;
  wishlist: WishlistItem[];
  addresses: Address[];
  orders: Order[];
  notifications: NotificationItem[];
  unreadNotifications: number;
  recentlyViewedIds: string[];
  trackProductView: (productId: string) => void;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  addToCart: (product: Product, variant?: ProductVariant, quantity?: number) => Promise<void>;
  updateCartQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeFromCart: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  toggleWishlist: (product: Product) => Promise<void>;
  isInWishlist: (productId: string) => boolean;
  reviews: Review[];
  getProductRatingStats: (productId: string) => {
    average: number;
    count: number;
    breakdown: Record<1 | 2 | 3 | 4 | 5, number>;
  };
  hasVerifiedPurchase: (productId: string) => boolean;
  seedDemoCatalogToFirestore: () => Promise<void>;
  notifyToast: (text: string, tone?: 'info' | 'success' | 'error') => void;
  toasts: ToastMessage[];
  dismissToast: (id: string) => void;
}

const StoreContext = createContext<StoreContextValue | undefined>(undefined);

const LS_CART_KEY = 'rf_guest_cart';
const LS_WISHLIST_KEY = 'rf_guest_wishlist';
const LS_RECENT_KEY = 'rf_recently_viewed';
const LS_THEME_KEY = 'rf_theme';

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    try {
      return localStorage.getItem(LS_THEME_KEY) === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  const [firestoreCategories, setFirestoreCategories] = useState<Category[]>([]);
  const [firestoreProducts, setFirestoreProducts] = useState<Product[]>([]);
  const [firestoreBanners, setFirestoreBanners] = useState<Banner[]>([]);
  const [firestoreCoupons, setFirestoreCoupons] = useState<Coupon[]>([]);
  const [firestoreReviews, setFirestoreReviews] = useState<Review[]>([]);
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_STORE_SETTINGS);
  const [catalogLoading, setCatalogLoading] = useState(true);

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const raw = localStorage.getItem(LS_CART_KEY);
      return raw ? (JSON.parse(raw) as CartItem[]) : [];
    } catch {
      return [];
    }
  });
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);

  const [wishlist, setWishlist] = useState<WishlistItem[]>(() => {
    try {
      const raw = localStorage.getItem(LS_WISHLIST_KEY);
      return raw ? (JSON.parse(raw) as WishlistItem[]) : [];
    } catch {
      return [];
    }
  });

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [recentlyViewedIds, setRecentlyViewedIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(LS_RECENT_KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });

  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const notifyToast = (text: string, tone: 'info' | 'success' | 'error' = 'info') => {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, text, tone }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3600);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const setTheme = (mode: ThemeMode) => {
    setThemeState(mode);
    try {
      localStorage.setItem(LS_THEME_KEY, mode);
    } catch {}
    if (mode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    if (user) {
      updateDoc(doc(db, 'users', user.uid), {
        themePreference: mode,
        updatedAt: serverTimestamp(),
      }).catch(() => {});
    }
  };

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const isAdmin = useMemo(() => isVerifiedSuperAdmin(user), [user]);

  // Boot connection test & role-aware catalog listeners (filtered for public/customers, full for Super Admin)
  useEffect(() => {
    testFirestoreConnection();
    if (!authReady) return;

    const catsQuery = isAdmin
      ? collection(db, 'categories')
      : query(collection(db, 'categories'), where('active', '==', true));

    const unsubCats = onSnapshot(
      catsQuery,
      (snap) => {
        const rows = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<Category, 'id'>) }))
          .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
        setFirestoreCategories(rows);
        setCatalogLoading(false);
      },
      (err) => {
        console.warn('Categories listener notice:', err.message);
        setCatalogLoading(false);
      },
    );

    const prodsQuery = isAdmin
      ? collection(db, 'products')
      : query(collection(db, 'products'), where('status', '==', 'active'));

    const unsubProds = onSnapshot(
      prodsQuery,
      (snap) => {
        setFirestoreProducts(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Product, 'id'>) })));
      },
      (err) => console.warn('Products listener notice:', err.message),
    );

    const bannersQuery = isAdmin
      ? collection(db, 'banners')
      : query(collection(db, 'banners'), where('active', '==', true));

    const unsubBanners = onSnapshot(
      bannersQuery,
      (snap) => {
        const rows = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<Banner, 'id'>) }))
          .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
        setFirestoreBanners(rows);
      },
      (err) => console.warn('Banners listener notice:', err.message),
    );

    const couponsQuery = isAdmin
      ? collection(db, 'coupons')
      : query(collection(db, 'coupons'), where('active', '==', true));

    const unsubCoupons = onSnapshot(
      couponsQuery,
      (snap) => {
        setFirestoreCoupons(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Coupon, 'id'>) })));
      },
      (err) => console.warn('Coupons listener notice:', err.message),
    );

    const unsubSettings = onSnapshot(
      doc(db, 'settings', 'store'),
      (snap) => {
        if (snap.exists()) {
          setSettings(snap.data() as StoreSettings);
        }
      },
      (err) => console.warn('Settings listener notice:', err.message),
    );

    const reviewsQuery = isAdmin
      ? collection(db, 'reviews')
      : query(collection(db, 'reviews'), where('status', '==', 'approved'));

    const unsubReviews = onSnapshot(
      reviewsQuery,
      (snap) => {
        setFirestoreReviews(
          snap.docs
            .map((d) => ({ id: d.id, ...(d.data() as Omit<Review, 'id'>) }))
            .filter((r) => r.status === 'approved'),
        );
      },
      (err) => console.warn('Reviews listener notice:', err.message),
    );

    return () => {
      unsubCats();
      unsubProds();
      unsubBanners();
      unsubCoupons();
      unsubSettings();
      unsubReviews();
    };
  }, [authReady, isAdmin]);

  // Auth State & User Profile Sync (NO /admins/{uid} lookup)
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);

      if (!currentUser) {
        setUserProfile(null);
        setAddresses([]);
        setOrders([]);
        setNotifications([]);
        try {
          const rawCart = localStorage.getItem(LS_CART_KEY);
          setCart(rawCart ? (JSON.parse(rawCart) as CartItem[]) : []);
          const rawWish = localStorage.getItem(LS_WISHLIST_KEY);
          setWishlist(rawWish ? (JSON.parse(rawWish) as WishlistItem[]) : []);
        } catch {}
        return;
      }

      // Ensure user document exists
      const userRef = doc(db, 'users', currentUser.uid);
      try {
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          const newProfile: Record<string, unknown> = {
            uid: currentUser.uid,
            displayName: currentUser.displayName || currentUser.phoneNumber || 'ROYAL FLASK Customer',
            email: currentUser.email || '',
            phone: currentUser.phoneNumber || '',
            photoURL: currentUser.photoURL || '',
            themePreference: theme,
            emailAlerts: true,
            whatsappAlerts: true,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };
          await setDoc(userRef, newProfile);
        }
      } catch (err) {
        console.warn('Profile bootstrap notice:', err);
      }
    });

    return () => unsubAuth();
  }, []);

  // Private User Collection Listeners (only when authenticated)
  useEffect(() => {
    if (!authReady || !user) return;

    const uid = user.uid;

    const unsubProfile = onSnapshot(
      doc(db, 'users', uid),
      (snap) => {
        if (snap.exists()) {
          setUserProfile(snap.data() as UserProfile);
        }
      },
      (err) => handleFirestoreError(err, OperationType.GET, `users/${uid}`),
    );

    const unsubCart = onSnapshot(
      collection(db, 'users', uid, 'cart'),
      (snap) => {
        setCart(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<CartItem, 'id'>) })));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, `users/${uid}/cart`),
    );

    const unsubWishlist = onSnapshot(
      collection(db, 'users', uid, 'wishlist'),
      (snap) => {
        setWishlist(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<WishlistItem, 'id'>) })));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, `users/${uid}/wishlist`),
    );

    const unsubAddresses = onSnapshot(
      collection(db, 'users', uid, 'addresses'),
      (snap) => {
        setAddresses(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Address, 'id'>) })));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, `users/${uid}/addresses`),
    );

    const unsubNotifs = onSnapshot(
      collection(db, 'users', uid, 'notifications'),
      (snap) => {
        const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<NotificationItem, 'id'>) }));
        setNotifications(items);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, `users/${uid}/notifications`),
    );

    // Customers must filter by userId in query to satisfy firestore.rules list check
    let unsubOrders = () => {};
    if (isAdmin) {
      unsubOrders = onSnapshot(
        query(collection(db, 'orders')),
        (snap) => {
          setOrders(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Order, 'id'>) })));
        },
        (err) => console.warn('Admin orders listener:', err.message),
      );
    } else {
      unsubOrders = onSnapshot(
        query(collection(db, 'orders'), where('userId', '==', uid)),
        (snap) => {
          setOrders(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Order, 'id'>) })));
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'orders'),
      );
    }

    return () => {
      unsubProfile();
      unsubCart();
      unsubWishlist();
      unsubAddresses();
      unsubNotifs();
      unsubOrders();
    };
  }, [authReady, user, isAdmin]);

  // Catalog fallbacks (clearly flagged as demo catalog preview until seeded into Firestore)
  const usingDemoFallback = firestoreProducts.length === 0 && firestoreCategories.length === 0;

  const categories: Category[] = useMemo(() => {
    if (firestoreCategories.length > 0) return firestoreCategories;
    return SEED_CATEGORIES.map((c) => ({ ...c }));
  }, [firestoreCategories]);

  const products: Product[] = useMemo(() => {
    if (firestoreProducts.length > 0) return firestoreProducts;
    return SEED_PRODUCTS.map((p) => ({ ...p }));
  }, [firestoreProducts]);

  const banners: Banner[] = useMemo(() => {
    const activeRemote = firestoreBanners.filter((b) => b.active);
    if (activeRemote.length >= 4) return firestoreBanners;
    return SEED_BANNERS.map((b) => ({ ...b }));
  }, [firestoreBanners]);

  const coupons: Coupon[] = useMemo(() => {
    if (firestoreCoupons.length > 0) return firestoreCoupons;
    return SEED_COUPONS.map((c) => ({ ...c }));
  }, [firestoreCoupons]);

  // Manual-only Super Admin catalog seeding executed strictly on the authenticated backend
  const seedDemoCatalogToFirestore = async () => {
    if (!user || !isAdmin) {
      notifyToast('Verified Super Admin privileges required to seed catalog.', 'error');
      return;
    }
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/admin/seed-catalog', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ confirmSeed: true }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; message?: string };
      if (!res.ok || !data.ok) {
        notifyToast(data.error || 'Server-side catalog seeding failed.', 'error');
        return;
      }
      notifyToast(data.message || 'Published 13 categories, demo products, coupons & settings via server.', 'success');
    } catch (err) {
      notifyToast(err instanceof Error ? err.message : 'Unable to reach catalog seed endpoint.', 'error');
    }
  };

  const signInWithGoogle = async () => {
    const cred = await signInWithPopup(auth, googleProvider);
    // Merge guest cart items into Firestore cart
    const guestCartRaw = localStorage.getItem(LS_CART_KEY);
    if (guestCartRaw) {
      try {
        const guestItems = JSON.parse(guestCartRaw) as CartItem[];
        for (const item of guestItems) {
          await setDoc(doc(db, 'users', cred.user.uid, 'cart', item.id), {
            userId: cred.user.uid,
            productId: item.productId,
            variantId: item.variantId,
            variantLabel: item.variantLabel || 'Standard',
            name: item.name,
            slug: item.slug,
            sku: item.sku,
            image: item.image,
            sellingPrice: item.sellingPrice,
            mrp: item.mrp,
            gstPercent: item.gstPercent,
            quantity: item.quantity,
            updatedAt: serverTimestamp(),
          });
        }
        localStorage.removeItem(LS_CART_KEY);
      } catch {}
    }
    notifyToast(`Signed in as ${cred.user.displayName || cred.user.email}`, 'success');
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    notifyToast('Signed out successfully.', 'info');
  };

  const addToCart = async (product: Product, variant?: ProductVariant, quantity = 1) => {
    const activeVariant = variant || product.variants[0] || { id: 'default', label: 'Standard', priceDelta: 0, stockQty: product.stockQty };
    const unitPrice = Math.max(0, product.sellingPrice + (activeVariant.priceDelta || 0));
    const itemId = `${product.id}_${activeVariant.id}`.replace(/[^a-zA-Z0-9_-]/g, '_');

    const existing = cart.find((i) => i.id === itemId);
    const nextQty = Math.min(50, (existing?.quantity || 0) + quantity);

    if (user) {
      const path = `users/${user.uid}/cart/${itemId}`;
      try {
        await setDoc(doc(db, 'users', user.uid, 'cart', itemId), {
          userId: user.uid,
          productId: product.id,
          variantId: activeVariant.id,
          variantLabel: activeVariant.label,
          name: product.name,
          slug: product.slug,
          sku: product.sku,
          image: product.images[0] || '',
          sellingPrice: unitPrice,
          mrp: product.mrp + (activeVariant.priceDelta || 0),
          gstPercent: product.gstPercent || 18,
          quantity: nextQty,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    } else {
      const nextCart = existing
        ? cart.map((c) => (c.id === itemId ? { ...c, quantity: nextQty } : c))
        : [
            ...cart,
            {
              id: itemId,
              productId: product.id,
              variantId: activeVariant.id,
              variantLabel: activeVariant.label,
              name: product.name,
              slug: product.slug,
              sku: product.sku,
              image: product.images[0] || '',
              sellingPrice: unitPrice,
              mrp: product.mrp + (activeVariant.priceDelta || 0),
              gstPercent: product.gstPercent || 18,
              quantity: nextQty,
            },
          ];
      setCart(nextCart);
      localStorage.setItem(LS_CART_KEY, JSON.stringify(nextCart));
    }

    notifyToast(`Added ${product.name} to bag`, 'success');
    setCartDrawerOpen(true);
  };

  const updateCartQuantity = async (itemId: string, quantity: number) => {
    if (quantity < 1) {
      await removeFromCart(itemId);
      return;
    }
    const clamped = Math.min(50, quantity);
    if (user) {
      try {
        await updateDoc(doc(db, 'users', user.uid, 'cart', itemId), {
          quantity: clamped,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}/cart/${itemId}`);
      }
    } else {
      const next = cart.map((c) => (c.id === itemId ? { ...c, quantity: clamped } : c));
      setCart(next);
      localStorage.setItem(LS_CART_KEY, JSON.stringify(next));
    }
  };

  const removeFromCart = async (itemId: string) => {
    if (user) {
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'cart', itemId));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/cart/${itemId}`);
      }
    } else {
      const next = cart.filter((c) => c.id !== itemId);
      setCart(next);
      localStorage.setItem(LS_CART_KEY, JSON.stringify(next));
    }
  };

  const clearCart = async () => {
    if (user) {
      const batch = writeBatch(db);
      for (const item of cart) {
        batch.delete(doc(db, 'users', user.uid, 'cart', item.id));
      }
      await batch.commit();
    } else {
      setCart([]);
      localStorage.removeItem(LS_CART_KEY);
    }
  };

  const isInWishlist = (productId: string) => wishlist.some((w) => w.productId === productId);

  const toggleWishlist = async (product: Product) => {
    const exists = isInWishlist(product.id);
    if (user) {
      const ref = doc(db, 'users', user.uid, 'wishlist', product.id);
      try {
        if (exists) {
          await deleteDoc(ref);
          notifyToast('Removed from wishlist', 'info');
        } else {
          await setDoc(ref, {
            userId: user.uid,
            productId: product.id,
            name: product.name,
            slug: product.slug,
            image: product.images[0] || '',
            sellingPrice: product.sellingPrice,
            mrp: product.mrp,
            addedAt: serverTimestamp(),
          });
          notifyToast('Saved to wishlist', 'success');
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/wishlist/${product.id}`);
      }
    } else {
      const next = exists
        ? wishlist.filter((w) => w.productId !== product.id)
        : [
            ...wishlist,
            {
              id: product.id,
              productId: product.id,
              name: product.name,
              slug: product.slug,
              image: product.images[0] || '',
              sellingPrice: product.sellingPrice,
              mrp: product.mrp,
            },
          ];
      setWishlist(next);
      localStorage.setItem(LS_WISHLIST_KEY, JSON.stringify(next));
      notifyToast(exists ? 'Removed from wishlist' : 'Saved to wishlist', 'info');
    }
  };

  const trackProductView = (productId: string) => {
    setRecentlyViewedIds((prev) => {
      const next = [productId, ...prev.filter((id) => id !== productId)].slice(0, 8);
      try {
        localStorage.setItem(LS_RECENT_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const cartCount = useMemo(() => cart.reduce((acc, item) => acc + item.quantity, 0), [cart]);
  const unreadNotifications = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const getProductRatingStats = (productId: string) => {
    const prodReviews = firestoreReviews.filter((r) => r.productId === productId && r.status === 'approved');
    const breakdown: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    if (prodReviews.length === 0) {
      return { average: 0, count: 0, breakdown };
    }
    let total = 0;
    for (const r of prodReviews) {
      const clamped = Math.min(5, Math.max(1, Math.round(r.rating))) as 1 | 2 | 3 | 4 | 5;
      breakdown[clamped] += 1;
      total += r.rating;
    }
    return {
      average: Number((total / prodReviews.length).toFixed(1)),
      count: prodReviews.length,
      breakdown,
    };
  };

  const hasVerifiedPurchase = (productId: string) => {
    if (!user) return false;
    return orders.some(
      (o) =>
        o.userId === user.uid &&
        !['Cancelled', 'Refunded'].includes(o.status) &&
        o.items.some((item) => item.productId === productId),
    );
  };

  const value: StoreContextValue = {
    theme,
    toggleTheme,
    setTheme,
    user,
    authReady,
    userProfile,
    isAdmin,
    categories,
    products,
    banners,
    coupons,
    settings,
    usingDemoFallback,
    catalogLoading,
    cart,
    cartCount,
    cartDrawerOpen,
    setCartDrawerOpen,
    wishlist,
    addresses,
    orders,
    notifications,
    unreadNotifications,
    recentlyViewedIds,
    trackProductView,
    signInWithGoogle,
    signOut,
    addToCart,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    toggleWishlist,
    isInWishlist,
    reviews: firestoreReviews,
    getProductRatingStats,
    hasVerifiedPurchase,
    seedDemoCatalogToFirestore,
    notifyToast,
    toasts,
    dismissToast,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
