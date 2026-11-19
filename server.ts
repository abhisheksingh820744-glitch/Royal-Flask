import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import type { Request, Response } from 'express';
import { applicationDefault, cert, getApps, initializeApp, type ServiceAccount } from 'firebase-admin/app';
import { getAuth as getAdminAuth, type DecodedIdToken } from 'firebase-admin/auth';
import { FieldValue, getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import firebaseAppletConfig from './firebase-applet-config.json' with { type: 'json' };
import {
  DEFAULT_STORE_SETTINGS,
  SEED_BANNERS,
  SEED_CATEGORIES,
  SEED_COUPONS,
  SEED_PRODUCTS,
} from './src/data/seedCatalog.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';
const SUPER_ADMIN_EMAIL = 'abhisheksingh820744@gmail.com';
const FIRESTORE_DATABASE_ID =
  process.env.FIRESTORE_DATABASE_ID?.trim() || firebaseAppletConfig.firestoreDatabaseId;

function initFirebaseAdmin() {
  try {
    let app = getApps()[0];
    const saJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
    const hasGacFile = Boolean(
      process.env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS),
    );

    if (!app) {
      if (saJson) {
        const parsed = JSON.parse(saJson) as ServiceAccount;
        app = initializeApp({
          credential: cert(parsed),
          projectId: firebaseAppletConfig.projectId,
        });
      } else if (hasGacFile) {
        app = initializeApp({
          credential: applicationDefault(),
          projectId: firebaseAppletConfig.projectId,
        });
      } else {
        return { adminDb: null, adminAuth: null, configured: false };
      }
    }

    const adminDb = getAdminFirestore(app, FIRESTORE_DATABASE_ID);
    const adminAuth = getAdminAuth(app);
    return { adminDb, adminAuth, configured: true };
  } catch (err) {
    console.warn('Firebase Admin initialization notice:', err instanceof Error ? err.message : String(err));
    return { adminDb: null, adminAuth: null, configured: false };
  }
}

const { adminDb, adminAuth, configured: ADMIN_SDK_CONFIGURED } = initFirebaseAdmin();

function getRazorpayConfig() {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim() || '';
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim() || '';
  return {
    keyId,
    keySecret,
    isLiveConfigured: Boolean(keyId && keySecret),
  };
}

function isTimingSafeHexEqual(expectedHex: string, actualHex: string): boolean {
  if (!/^[a-f0-9]+$/i.test(expectedHex) || !/^[a-f0-9]+$/i.test(actualHex)) return false;
  const a = Buffer.from(expectedHex.toLowerCase(), 'utf8');
  const b = Buffer.from(actualHex.toLowerCase(), 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function isVerifiedSuperAdminToken(decoded: DecodedIdToken | null | undefined): boolean {
  if (!decoded || decoded.email_verified !== true || !decoded.email) return false;
  return decoded.email.trim().toLowerCase() === SUPER_ADMIN_EMAIL;
}

function isVerifiedUserToken(decoded: DecodedIdToken | null | undefined): boolean {
  if (!decoded) return false;
  return decoded.email_verified === true || decoded.firebase?.sign_in_provider === 'phone';
}

async function verifyBearerToken(req: Request): Promise<DecodedIdToken | null> {
  if (!adminAuth) return null;
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  const idToken = authHeader.slice(7).trim();
  if (!idToken) return null;
  return adminAuth.verifyIdToken(idToken);
}

function sanitizeServerText(val: unknown, maxLen: number): string {
  return String(val ?? '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .trim()
    .slice(0, maxLen);
}

interface VerifiedOrderItemInput {
  productId: string;
  variantId: string;
  quantity: number;
}

async function verifyLiveRazorpayOrderAndPayment(params: {
  keyId: string;
  keySecret: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  expectedAmountPaise?: number;
}) {
  const expectedSig = crypto
    .createHmac('sha256', params.keySecret)
    .update(`${params.razorpayOrderId}|${params.razorpayPaymentId}`)
    .digest('hex');

  if (!isTimingSafeHexEqual(expectedSig, params.razorpaySignature)) {
    return { ok: false as const, status: 400, error: 'Razorpay signature verification failed.' };
  }

  const authHeader = Buffer.from(`${params.keyId}:${params.keySecret}`).toString('base64');
  const [orderRes, payRes] = await Promise.all([
    fetch(`https://api.razorpay.com/v1/orders/${encodeURIComponent(params.razorpayOrderId)}`, {
      headers: { Authorization: `Basic ${authHeader}` },
    }),
    fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(params.razorpayPaymentId)}`, {
      headers: { Authorization: `Basic ${authHeader}` },
    }),
  ]);

  if (!orderRes.ok || !payRes.ok) {
    return { ok: false as const, status: 502, error: 'Unable to verify payment details with Razorpay.' };
  }

  const rzpOrder = (await orderRes.json()) as { id: string; amount: number; currency: string; status: string };
  const rzpPayment = (await payRes.json()) as {
    id: string;
    order_id: string;
    amount: number;
    currency: string;
    status: string;
  };

  if (rzpPayment.order_id !== params.razorpayOrderId) {
    return { ok: false as const, status: 400, error: 'Razorpay payment does not belong to order.' };
  }
  if (rzpOrder.currency !== 'INR' || rzpPayment.currency !== 'INR') {
    return { ok: false as const, status: 400, error: 'Invalid payment currency; INR required.' };
  }
  if (!['captured', 'authorized'].includes(rzpPayment.status)) {
    return { ok: false as const, status: 400, error: `Unexpected Razorpay payment status: ${rzpPayment.status}` };
  }
  if (
    typeof params.expectedAmountPaise === 'number' &&
    (rzpOrder.amount !== params.expectedAmountPaise || rzpPayment.amount !== params.expectedAmountPaise)
  ) {
    return { ok: false as const, status: 400, error: 'Payment amount mismatch against order total.' };
  }

  return { ok: true as const, rzpOrder, rzpPayment };
}

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);
  app.use(express.json({ limit: '1mb' }));

  // Health & Gateway Status (no credentials exposed)
  app.get('/api/health', (_req: Request, res: Response) => {
    const rz = getRazorpayConfig();
    res.json({
      ok: true,
      brand: 'ROYAL FLASK',
      paymentMode: rz.isLiveConfigured ? 'LIVE' : 'TEST_MODE',
      razorpayConfigured: rz.isLiveConfigured,
      adminSdkConfigured: ADMIN_SDK_CONFIGURED,
      databaseId: FIRESTORE_DATABASE_ID,
    });
  });

  app.get('/api/payments/config', (_req: Request, res: Response) => {
    const rz = getRazorpayConfig();
    res.json({
      gateway: 'razorpay',
      mode: rz.isLiveConfigured ? 'LIVE' : 'TEST_MODE',
      keyId: rz.isLiveConfigured ? rz.keyId : null,
      adminSdkConfigured: ADMIN_SDK_CONFIGURED,
      currency: 'INR',
      notice: rz.isLiveConfigured
        ? 'Live Razorpay gateway is configured.'
        : 'Razorpay credentials (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET) are not configured. Checkout operates in clearly labeled Test Mode.',
    });
  });

  // Server-side Razorpay Order Creation (recomputes authoritative total when Admin SDK is configured)
  app.post('/api/payments/create-order', async (req: Request, res: Response) => {
    try {
      const { amountInr, receipt, paymentMethod, items, shippingMethod, couponCode } = req.body as {
        amountInr?: number;
        receipt?: string;
        paymentMethod?: string;
        items?: VerifiedOrderItemInput[];
        shippingMethod?: 'Standard' | 'Express';
        couponCode?: string;
      };

      let authoritativeAmountInr = Number(amountInr || 0);

      if (ADMIN_SDK_CONFIGURED && adminDb) {
        const decoded = await verifyBearerToken(req).catch(() => null);
        if (!isVerifiedUserToken(decoded)) {
          return res.status(401).json({ error: 'Verified Firebase sign-in required.' });
        }
        if (Array.isArray(items) && items.length > 0) {
          const settingsSnap = await adminDb.doc('settings/store').get();
          const settingsData = settingsSnap.exists ? settingsSnap.data() : DEFAULT_STORE_SETTINGS;
          let subtotal = 0;
          for (const item of items) {
            const qty = Math.max(1, Math.min(50, Math.floor(Number(item.quantity || 0))));
            const prodSnap = await adminDb.doc(`products/${String(item.productId || '')}`).get();
            if (!prodSnap.exists || prodSnap.data()?.status !== 'active') {
              return res.status(400).json({ error: `Unavailable product: ${item.productId}` });
            }
            const pData = prodSnap.data()!;
            const variants = Array.isArray(pData.variants) ? pData.variants : [];
            const variant = variants.find((v: { id: string; priceDelta?: number }) => v.id === item.variantId);
            const unitPrice = Math.max(0, Number(pData.sellingPrice || 0) + Number(variant?.priceDelta || 0));
            subtotal += unitPrice * qty;
          }
          let discount = 0;
          const cleanCode = sanitizeServerText(couponCode, 32).toUpperCase();
          if (cleanCode) {
            const cpSnap = await adminDb.collection('coupons').where('code', '==', cleanCode).limit(1).get();
            if (!cpSnap.empty) {
              const cp = cpSnap.docs[0].data();
              if (cp.active === true && subtotal >= Number(cp.minOrderAmount || 0)) {
                const raw = cp.type === 'PERCENT' ? Math.round((subtotal * Number(cp.value || 0)) / 100) : Number(cp.value || 0);
                discount = Math.min(raw, Number(cp.maxDiscount || raw));
              }
            }
          }
          const discounted = Math.max(0, subtotal - discount);
          const freeThreshold = Number(settingsData?.freeShippingThreshold ?? 999);
          const stdFee = Number(settingsData?.standardShippingFee ?? 79);
          const expFee = Number(settingsData?.expressShippingFee ?? 149);
          const shipCharge = shippingMethod === 'Express' ? expFee : discounted >= freeThreshold || discounted === 0 ? 0 : stdFee;
          authoritativeAmountInr = Math.max(1, Math.round(discounted + shipCharge));
        }
      }

      if (!Number.isFinite(authoritativeAmountInr) || authoritativeAmountInr <= 0) {
        return res.status(400).json({ error: 'Valid positive order amount is required.' });
      }

      const amountPaise = Math.round(authoritativeAmountInr * 100);
      const safeReceipt = String(receipt || `RF-${Date.now()}`).slice(0, 40);
      const rz = getRazorpayConfig();

      if (!rz.isLiveConfigured) {
        return res.json({
          mode: 'TEST_MODE',
          keyConfigured: false,
          razorpayOrderId: `rf_test_order_${crypto.randomBytes(6).toString('hex')}`,
          amountPaise,
          amountInr: authoritativeAmountInr,
          currency: 'INR',
          receipt: safeReceipt,
          paymentMethod: paymentMethod || 'UPI',
          notice:
            'Test Mode active: No live Razorpay credentials configured. Payment will be recorded as Test-Authorized.',
        });
      }

      const authHeader = Buffer.from(`${rz.keyId}:${rz.keySecret}`).toString('base64');
      const rzpResponse = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${authHeader}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amountPaise,
          currency: 'INR',
          receipt: safeReceipt,
          notes: {
            brand: 'ROYAL FLASK',
            method: String(paymentMethod || 'ONLINE'),
          },
        }),
      });

      if (!rzpResponse.ok) {
        const errBody = await rzpResponse.text();
        return res.status(502).json({
          error: 'Razorpay order creation failed.',
          details: errBody.slice(0, 300),
        });
      }

      const orderData = (await rzpResponse.json()) as { id: string; amount: number; currency: string };
      return res.json({
        mode: 'LIVE',
        keyConfigured: true,
        keyId: rz.keyId,
        razorpayOrderId: orderData.id,
        amountPaise: orderData.amount,
        amountInr: authoritativeAmountInr,
        currency: orderData.currency,
        receipt: safeReceipt,
      });
    } catch (err) {
      return res.status(500).json({
        error: err instanceof Error ? err.message : 'Internal server error creating payment order.',
      });
    }
  });

  // Server-side Payment Verification (no TEST_MODE bypass when Live Razorpay keys exist)
  app.post('/api/payments/verify', async (req: Request, res: Response) => {
    try {
      const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        expectedAmountInr,
      } = req.body as {
        razorpay_order_id?: string;
        razorpay_payment_id?: string;
        razorpay_signature?: string;
        expectedAmountInr?: number;
      };

      const rz = getRazorpayConfig();

      if (!rz.isLiveConfigured) {
        if (!razorpay_order_id || !String(razorpay_order_id).startsWith('rf_test_order_')) {
          return res.status(400).json({ verified: false, error: 'Invalid test order reference.' });
        }
        return res.json({
          verified: true,
          mode: 'TEST_MODE',
          paymentStatus: 'Test-Authorized',
          razorpayOrderId: razorpay_order_id,
          razorpayPaymentId: razorpay_payment_id || `rf_test_pay_${crypto.randomBytes(6).toString('hex')}`,
        });
      }

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({ verified: false, error: 'Missing Razorpay signature parameters.' });
      }

      const expectedPaise =
        typeof expectedAmountInr === 'number' && Number.isFinite(expectedAmountInr) && expectedAmountInr > 0
          ? Math.round(expectedAmountInr * 100)
          : undefined;

      const verification = await verifyLiveRazorpayOrderAndPayment({
        keyId: rz.keyId,
        keySecret: rz.keySecret,
        razorpayOrderId: String(razorpay_order_id),
        razorpayPaymentId: String(razorpay_payment_id),
        razorpaySignature: String(razorpay_signature),
        expectedAmountPaise: expectedPaise,
      });

      if (!verification.ok) {
        return res.status(verification.status).json({ verified: false, error: verification.error });
      }

      return res.json({
        verified: true,
        mode: 'LIVE',
        paymentStatus: 'Paid',
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        amountPaise: verification.rzpPayment.amount,
        currency: verification.rzpPayment.currency,
      });
    } catch (err) {
      return res.status(500).json({
        verified: false,
        error: err instanceof Error ? err.message : 'Payment verification failed.',
      });
    }
  });

  // Server-Authoritative Atomic Order Creation & Inventory Deduction
  app.post('/api/orders/place', async (req: Request, res: Response) => {
    if (!ADMIN_SDK_CONFIGURED || !adminDb || !adminAuth) {
      return res.status(503).json({
        error:
          'Server Firebase Admin credentials (FIREBASE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS) are required for server-verified orders and atomic stock deduction.',
      });
    }

    try {
      const decoded = await verifyBearerToken(req).catch(() => null);
      if (!isVerifiedUserToken(decoded) || !decoded) {
        return res.status(401).json({ error: 'Verified Firebase authentication required.' });
      }

      const {
        shippingAddress,
        shippingMethod,
        paymentMethod,
        couponCode,
        items,
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
      } = req.body as {
        shippingAddress?: {
          fullName?: string;
          phone?: string;
          line1?: string;
          line2?: string;
          city?: string;
          state?: string;
          pincode?: string;
          label?: string;
        };
        shippingMethod?: 'Standard' | 'Express';
        paymentMethod?: 'COD' | 'UPI' | 'CARD' | 'NETBANKING';
        couponCode?: string;
        items?: VerifiedOrderItemInput[];
        razorpay_order_id?: string;
        razorpay_payment_id?: string;
        razorpay_signature?: string;
      };

      if (!Array.isArray(items) || items.length === 0 || items.length > 50) {
        return res.status(400).json({ error: 'Order must contain between 1 and 50 items.' });
      }

      const validMethod = ['COD', 'UPI', 'CARD', 'NETBANKING'].includes(String(paymentMethod))
        ? (paymentMethod as 'COD' | 'UPI' | 'CARD' | 'NETBANKING')
        : null;
      const validShipping = shippingMethod === 'Express' ? 'Express' : 'Standard';
      if (!validMethod) {
        return res.status(400).json({ error: 'Invalid payment method.' });
      }

      const cleanPhone = sanitizeServerText(shippingAddress?.phone, 16);
      const cleanPin = sanitizeServerText(shippingAddress?.pincode, 6);
      const cleanName = sanitizeServerText(shippingAddress?.fullName, 120);
      const cleanLine1 = sanitizeServerText(shippingAddress?.line1, 200);
      const cleanCity = sanitizeServerText(shippingAddress?.city, 80);
      const cleanState = sanitizeServerText(shippingAddress?.state, 80);

      if (!cleanName || !cleanLine1 || !cleanCity || !cleanState || !/^[1-9][0-9]{5}$/.test(cleanPin) || cleanPhone.length < 10) {
        return res.status(400).json({ error: 'Complete and valid Indian delivery address required.' });
      }

      const rz = getRazorpayConfig();
      const orderId = `ord_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
      const orderNumber = `RF-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
      const paymentId = `pay_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
      const notifId = `ntf_${Date.now()}`;

      // Aggregate requested quantity per productId so multi-variant items from same product check total stock safely
      const qtyPerProduct = new Map<string, number>();
      for (const item of items) {
        const pid = sanitizeServerText(item.productId, 128);
        const qty = Math.floor(Number(item.quantity));
        if (!pid || !/^[a-zA-Z0-9_\-]+$/.test(pid) || !Number.isFinite(qty) || qty < 1 || qty > 50) {
          return res.status(400).json({ error: 'Invalid cart item quantity or product ID.' });
        }
        qtyPerProduct.set(pid, (qtyPerProduct.get(pid) || 0) + qty);
      }

      const txResult = await adminDb.runTransaction(async (tx) => {
        const settingsRef = adminDb.doc('settings/store');
        const settingsSnap = await tx.get(settingsRef);
        const settingsData = settingsSnap.exists ? settingsSnap.data() : DEFAULT_STORE_SETTINGS;

        const productDocs = new Map<string, FirebaseFirestore.DocumentData>();
        for (const [pid, reqQty] of qtyPerProduct.entries()) {
          const prodRef = adminDb.doc(`products/${pid}`);
          const prodSnap = await tx.get(prodRef);
          if (!prodSnap.exists) {
            throw Object.assign(new Error(`Product not found: ${pid}`), { statusCode: 400 });
          }
          const prodData = prodSnap.data()!;
          if (prodData.status !== 'active') {
            throw Object.assign(new Error(`${prodData.name || pid} is currently unavailable.`), { statusCode: 400 });
          }
          const currentStock = Number(prodData.stockQty || 0);
          if (currentStock < reqQty) {
            throw Object.assign(
              new Error(`Insufficient stock for ${prodData.name || pid} (available: ${currentStock}).`),
              { statusCode: 409 },
            );
          }
          productDocs.set(pid, prodData);
        }

        let subtotal = 0;
        let gstTotal = 0;
        const verifiedItems = items.map((rawItem) => {
          const pid = sanitizeServerText(rawItem.productId, 128);
          const vid = sanitizeServerText(rawItem.variantId || 'default', 80);
          const qty = Math.floor(Number(rawItem.quantity));
          const pData = productDocs.get(pid)!;
          const variants = Array.isArray(pData.variants) ? pData.variants : [];
          const variant = variants.find((v: { id: string; label?: string; priceDelta?: number }) => v.id === vid);
          const sellingPrice = Math.max(0, Number(pData.sellingPrice || 0) + Number(variant?.priceDelta || 0));
          const mrp = Math.max(sellingPrice, Number(pData.mrp || 0) + Number(variant?.priceDelta || 0));
          const gstPercent = Number(pData.gstPercent || 18);
          const lineTotal = sellingPrice * qty;
          subtotal += lineTotal;
          gstTotal += Math.round(lineTotal - lineTotal / (1 + gstPercent / 100));

          return {
            productId: pid,
            variantId: vid,
            variantLabel: sanitizeServerText(variant?.label || 'Standard', 120),
            name: sanitizeServerText(pData.name, 160),
            slug: sanitizeServerText(pData.slug, 180),
            sku: sanitizeServerText(pData.sku, 64),
            image: sanitizeServerText(Array.isArray(pData.images) ? pData.images[0] : '', 500),
            sellingPrice,
            mrp,
            gstPercent,
            quantity: qty,
          };
        });

        let couponDiscount = 0;
        let appliedCouponRef: FirebaseFirestore.DocumentReference | null = null;
        let cleanAppliedCode = '';
        const requestedCode = sanitizeServerText(couponCode, 32).toUpperCase();
        if (requestedCode) {
          const cpQuery = adminDb.collection('coupons').where('code', '==', requestedCode).limit(1);
          const cpSnap = await tx.get(cpQuery);
          if (!cpSnap.empty) {
            const cpDoc = cpSnap.docs[0];
            const cp = cpDoc.data();
            if (cp.active === true && subtotal >= Number(cp.minOrderAmount || 0)) {
              const rawDisc =
                cp.type === 'PERCENT' ? Math.round((subtotal * Number(cp.value || 0)) / 100) : Number(cp.value || 0);
              couponDiscount = Math.min(rawDisc, Number(cp.maxDiscount || rawDisc));
              appliedCouponRef = cpDoc.ref;
              cleanAppliedCode = String(cp.code || requestedCode);
            }
          }
        }

        const discountedSubtotal = Math.max(0, subtotal - couponDiscount);
        const freeShipThreshold = Number(settingsData?.freeShippingThreshold ?? 999);
        const stdFee = Number(settingsData?.standardShippingFee ?? 79);
        const expFee = Number(settingsData?.expressShippingFee ?? 149);
        const shippingCharge =
          validShipping === 'Express' ? expFee : discountedSubtotal >= freeShipThreshold || discountedSubtotal === 0 ? 0 : stdFee;
        const totalAmount = Math.round(discountedSubtotal + shippingCharge);
        const expectedAmountPaise = Math.round(totalAmount * 100);

        let paymentStatus: 'Pending' | 'Test-Authorized' | 'Paid' = 'Pending';
        let paymentMode: 'COD' | 'TEST_MODE' | 'LIVE' = 'COD';
        let finalRzpOrderId = '';
        let finalRzpPaymentId = '';

        if (validMethod === 'COD') {
          paymentStatus = 'Pending';
          paymentMode = 'COD';
        } else if (!rz.isLiveConfigured) {
          if (!razorpay_order_id || !String(razorpay_order_id).startsWith('rf_test_order_')) {
            throw Object.assign(new Error('Invalid Razorpay Test Mode reference.'), { statusCode: 400 });
          }
          paymentStatus = 'Test-Authorized';
          paymentMode = 'TEST_MODE';
          finalRzpOrderId = String(razorpay_order_id);
          finalRzpPaymentId = razorpay_payment_id
            ? String(razorpay_payment_id)
            : `rf_test_pay_${crypto.randomBytes(6).toString('hex')}`;
        } else {
          if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            throw Object.assign(new Error('Missing Razorpay payment signature fields.'), { statusCode: 400 });
          }
          const verification = await verifyLiveRazorpayOrderAndPayment({
            keyId: rz.keyId,
            keySecret: rz.keySecret,
            razorpayOrderId: String(razorpay_order_id),
            razorpayPaymentId: String(razorpay_payment_id),
            razorpaySignature: String(razorpay_signature),
            expectedAmountPaise,
          });
          if (!verification.ok) {
            throw Object.assign(new Error(verification.error), { statusCode: verification.status });
          }
          paymentStatus = 'Paid';
          paymentMode = 'LIVE';
          finalRzpOrderId = String(razorpay_order_id);
          finalRzpPaymentId = String(razorpay_payment_id);
        }

        const now = FieldValue.serverTimestamp();
        const label = ['Home', 'Office', 'Other'].includes(String(shippingAddress?.label))
          ? String(shippingAddress?.label)
          : 'Home';

        tx.set(adminDb.doc(`orders/${orderId}`), {
          orderNumber,
          userId: decoded.uid,
          customerName: cleanName,
          customerEmail: sanitizeServerText(decoded.email || '', 160),
          customerPhone: cleanPhone,
          shippingAddress: {
            fullName: cleanName,
            phone: cleanPhone,
            line1: cleanLine1,
            line2: sanitizeServerText(shippingAddress?.line2, 200),
            city: cleanCity,
            state: cleanState,
            pincode: cleanPin,
            label,
          },
          shippingMethod: validShipping,
          items: verifiedItems,
          subtotal,
          discountTotal: couponDiscount,
          couponCode: cleanAppliedCode,
          gstTotal,
          shippingCharge,
          totalAmount,
          paymentMethod: validMethod,
          paymentStatus,
          paymentMode,
          razorpayOrderId: finalRzpOrderId,
          razorpayPaymentId: finalRzpPaymentId,
          status: 'Pending',
          trackingNumber: '',
          statusHistory: [
            {
              status: 'Pending',
              note:
                paymentMode === 'TEST_MODE'
                  ? 'Order placed in Razorpay Test Mode'
                  : paymentMode === 'COD'
                    ? 'Cash on Delivery order placed (Payment Pending)'
                    : 'Order placed and Razorpay payment verified server-side',
              timestampIso: new Date().toISOString(),
            },
          ],
          createdAt: now,
          updatedAt: now,
        });

        tx.set(adminDb.doc(`payments/${paymentId}`), {
          orderId,
          orderNumber,
          userId: decoded.uid,
          amount: totalAmount,
          currency: 'INR',
          method: validMethod,
          mode: paymentMode,
          status: paymentStatus,
          gatewayRef: finalRzpPaymentId || finalRzpOrderId || `COD-${orderNumber}`,
          createdAt: now,
        });

        tx.set(adminDb.doc(`users/${decoded.uid}/notifications/${notifId}`), {
          userId: decoded.uid,
          title: `Order ${orderNumber} Placed`,
          message: `Your order for ₹${totalAmount.toLocaleString('en-IN')} has been received.`,
          type: 'order',
          orderId,
          read: false,
          createdAt: now,
        });

        for (const [pid, reqQty] of qtyPerProduct.entries()) {
          const currentStock = Number(productDocs.get(pid)!.stockQty || 0);
          tx.update(adminDb.doc(`products/${pid}`), {
            stockQty: currentStock - reqQty,
            updatedAt: now,
          });
        }

        if (appliedCouponRef) {
          tx.update(appliedCouponRef, {
            usageCount: FieldValue.increment(1),
            updatedAt: now,
          });
        }

        return { orderId, orderNumber, paymentStatus, paymentMode, totalAmount };
      });

      return res.json({ ok: true, ...txResult });
    } catch (err: unknown) {
      const status = typeof (err as { statusCode?: number }).statusCode === 'number' ? (err as { statusCode: number }).statusCode : 500;
      return res.status(status).json({
        error: err instanceof Error ? err.message : 'Unable to place verified order.',
      });
    }
  });

  // Server-Verified Review Submission (Always 'pending'; Server determines verifiedPurchase & verifiedOrderId)
  app.post('/api/reviews/submit', async (req: Request, res: Response) => {
    if (!ADMIN_SDK_CONFIGURED || !adminDb || !adminAuth) {
      return res.status(503).json({
        error: 'Server Firebase Admin credentials required for server-verified purchase review checks.',
      });
    }

    try {
      const decoded = await verifyBearerToken(req).catch(() => null);
      if (!isVerifiedUserToken(decoded) || !decoded) {
        return res.status(401).json({ error: 'Verified account sign-in required to submit reviews.' });
      }

      const { productId, rating, comment } = req.body as {
        productId?: string;
        rating?: number;
        comment?: string;
      };

      const cleanProductId = sanitizeServerText(productId, 128);
      const cleanComment = sanitizeServerText(comment, 1000);
      const numRating = Math.min(5, Math.max(1, Math.round(Number(rating || 0))));

      if (!cleanProductId || !/^[a-zA-Z0-9_\-]+$/.test(cleanProductId)) {
        return res.status(400).json({ error: 'Valid productId is required.' });
      }
      if (cleanComment.length < 2) {
        return res.status(400).json({ error: 'Review comment must be at least 2 characters.' });
      }

      const prodSnap = await adminDb.doc(`products/${cleanProductId}`).get();
      if (!prodSnap.exists || prodSnap.data()?.status !== 'active') {
        return res.status(404).json({ error: 'Product not found.' });
      }

      const userSnap = await adminDb.doc(`users/${decoded.uid}`).get();
      const userName = sanitizeServerText(
        userSnap.data()?.displayName || decoded.name || 'ROYAL FLASK Customer',
        120,
      );

      // Verify genuine purchase ownership against customer's non-cancelled/returned/refunded orders
      const ordersSnap = await adminDb.collection('orders').where('userId', '==', decoded.uid).get();
      let matchedOrderId: string | null = null;
      for (const orderDoc of ordersSnap.docs) {
        const orderData = orderDoc.data();
        if (['Cancelled', 'Returned', 'Refunded'].includes(String(orderData.status))) continue;
        const orderItems = Array.isArray(orderData.items) ? orderData.items : [];
        if (orderItems.some((item: { productId?: string }) => item.productId === cleanProductId)) {
          matchedOrderId = orderDoc.id;
          break;
        }
      }

      const reviewId = `rev_${cleanProductId}_${decoded.uid}_${Date.now()}`;
      const reviewDoc: Record<string, unknown> = {
        productId: cleanProductId,
        userId: decoded.uid,
        userName,
        rating: numRating,
        comment: cleanComment,
        verifiedPurchase: Boolean(matchedOrderId),
        status: 'pending',
        createdAt: FieldValue.serverTimestamp(),
      };
      if (matchedOrderId) {
        reviewDoc.verifiedOrderId = matchedOrderId;
      }

      await adminDb.doc(`reviews/${reviewId}`).set(reviewDoc);
      return res.json({
        ok: true,
        reviewId,
        status: 'pending',
        verifiedPurchase: Boolean(matchedOrderId),
      });
    } catch (err) {
      return res.status(500).json({
        error: err instanceof Error ? err.message : 'Unable to submit review.',
      });
    }
  });

  // Super Admin Server-Side Catalog Seed Endpoint (manual trigger only, strict verified Super Admin check)
  app.post('/api/admin/seed-catalog', async (req: Request, res: Response) => {
    if (!ADMIN_SDK_CONFIGURED || !adminDb || !adminAuth) {
      return res.status(503).json({
        error:
          'Server Firebase Admin credentials (FIREBASE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS) are required for server-side catalog seeding.',
      });
    }

    try {
      const decoded = await verifyBearerToken(req).catch(() => null);
      if (!decoded) {
        return res.status(401).json({ error: 'Authentication token required.' });
      }
      if (!isVerifiedSuperAdminToken(decoded)) {
        return res.status(403).json({ error: 'Forbidden: Only verified Super Admin may seed the catalog.' });
      }

      const { confirmSeed } = req.body as { confirmSeed?: boolean };
      if (confirmSeed !== true) {
        return res.status(400).json({ error: 'Explicit confirmation { confirmSeed: true } is required.' });
      }

      const batch = adminDb.batch();
      const now = FieldValue.serverTimestamp();

      for (const cat of SEED_CATEGORIES) {
        batch.set(adminDb.doc(`categories/${cat.id}`), {
          name: cat.name,
          slug: cat.slug,
          description: cat.description,
          image: cat.image,
          active: cat.active,
          sortOrder: cat.sortOrder,
          subcategories: cat.subcategories,
          createdAt: now,
          updatedAt: now,
        });
      }

      for (const prod of SEED_PRODUCTS) {
        const { id: prodId, ...prodPayload } = prod;
        batch.set(adminDb.doc(`products/${prodId}`), {
          ...prodPayload,
          createdAt: now,
          updatedAt: now,
        });
      }

      for (const coupon of SEED_COUPONS) {
        batch.set(adminDb.doc(`coupons/${coupon.id}`), {
          code: coupon.code,
          type: coupon.type,
          value: coupon.value,
          minOrderAmount: coupon.minOrderAmount,
          maxDiscount: coupon.maxDiscount,
          description: coupon.description,
          active: coupon.active,
          usageCount: coupon.usageCount,
          createdAt: now,
          updatedAt: now,
        });
      }

      for (const banner of SEED_BANNERS) {
        batch.set(adminDb.doc(`banners/${banner.id}`), {
          title: banner.title,
          subtitle: banner.subtitle,
          ctaText: banner.ctaText,
          ctaLink: banner.ctaLink,
          image: banner.image,
          active: banner.active,
          sortOrder: banner.sortOrder,
          updatedAt: now,
        });
      }

      batch.set(adminDb.doc('settings/store'), {
        ...DEFAULT_STORE_SETTINGS,
        updatedAt: now,
      });

      await batch.commit();
      return res.json({ ok: true, message: 'Catalog seeded by verified Super Admin on server.' });
    } catch (err) {
      return res.status(500).json({
        error: err instanceof Error ? err.message : 'Server catalog seed failed.',
      });
    }
  });

  // Dynamic SEO Sitemap & Robots.txt
  app.get('/robots.txt', (req: Request, res: Response) => {
    const baseUrl = process.env.APP_URL?.replace(/\/$/, '') || `${req.protocol}://${req.get('host')}`;
    res.type('text/plain').send(
      [
        'User-agent: *',
        'Allow: /',
        'Disallow: /admin',
        'Disallow: /checkout',
        'Disallow: /payment',
        `Sitemap: ${baseUrl}/sitemap.xml`,
      ].join('\n'),
    );
  });

  app.get('/sitemap.xml', (req: Request, res: Response) => {
    const baseUrl = process.env.APP_URL?.replace(/\/$/, '') || `${req.protocol}://${req.get('host')}`;
    const staticRoutes = [
      '/',
      '/shop',
      '/explore',
      '/categories',
      '/about',
      '/support',
      '/contact',
      '/track-order',
      '/privacy-policy',
      '/terms-and-conditions',
      '/return-refund-policy',
      '/shipping-policy',
      '/category/water-bottles-flasks',
      '/category/kitchen-cookware',
      '/category/lunch-boxes',
      '/category/food-storage-containers',
      '/category/kitchen-appliances',
      '/category/dining-tableware',
    ];
    const urls = staticRoutes
      .map(
        (route) =>
          `  <url><loc>${baseUrl}${route}</loc><changefreq>weekly</changefreq><priority>${route === '/' ? '1.0' : '0.8'}</priority></url>`,
      )
      .join('\n');

    res
      .type('application/xml')
      .send(
        `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`,
      );
  });

  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        ws: { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output not found. Run npm run build first.');
      }
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`ROYAL FLASK server running on http://0.0.0.0:${PORT} (${IS_PROD ? 'production' : 'development'})`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
