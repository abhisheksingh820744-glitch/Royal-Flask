import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Check,
  CheckCircle2,
  Heart,
  MessageCircle,
  Minus,
  Plus,
  Share2,
  ShieldCheck,
  ShoppingBag,
  Star,
  Truck,
} from 'lucide-react';
import {
  doc,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { useStore } from '../context/StoreContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  buildProductEnquiryMessage,
  buildShareProductMessage,
  buildWhatsAppUrl,
  formatFirestoreDate,
  formatINR,
  sanitizeText,
} from '../lib/formatters';
import { ProductCard } from '../components/ProductCard';
import { SeoHead } from '../components/SeoHead';
import { SmartImage } from '../components/SmartImage';

export function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const {
    products,
    settings,
    user,
    reviews: allApprovedReviews,
    getProductRatingStats,
    hasVerifiedPurchase,
    addToCart,
    toggleWishlist,
    isInWishlist,
    trackProductView,
    recentlyViewedIds,
    notifyToast,
  } = useStore();

  const product = products.find((p) => p.slug === slug) || products.find((p) => p.id === slug);

  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [selectedVariantIdx, setSelectedVariantIdx] = useState(0);
  const [qty, setQty] = useState(1);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    setSelectedImageIdx(0);
    setSelectedVariantIdx(0);
    setQty(1);
    if (product) {
      trackProductView(product.id);
    }
  }, [product?.id]);

  const productReviews = useMemo(() => {
    if (!product) return [];
    return allApprovedReviews.filter((r) => r.productId === product.id);
  }, [allApprovedReviews, product]);

  const ratingStats = useMemo(() => {
    if (!product) return { average: 0, count: 0, breakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };
    return getProductRatingStats(product.id);
  }, [product, getProductRatingStats]);

  const relatedProducts = useMemo(() => {
    if (!product) return [];
    return products
      .filter((p) => p.id !== product.id && p.status === 'active' && p.categoryId === product.categoryId)
      .slice(0, 3);
  }, [products, product]);

  const recentlyViewed = useMemo(() => {
    if (!product) return [];
    return recentlyViewedIds
      .filter((id) => id !== product.id)
      .map((id) => products.find((p) => p.id === id && p.status === 'active'))
      .filter((p): p is NonNullable<typeof p> => Boolean(p))
      .slice(0, 3);
  }, [recentlyViewedIds, products, product]);

  if (!product) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-20 text-center">
        <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-white">Product Not Found</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
          The product you requested may have been moved or archived.
        </p>
        <Link
          to="/shop"
          className="inline-block mt-6 px-6 py-3 text-sm font-semibold bg-[#2449B5] text-white rounded-lg"
        >
          Return to Store
        </Link>
      </main>
    );
  }

  const activeVariant = product.variants[selectedVariantIdx] || {
    id: 'default',
    label: 'Standard',
    priceDelta: 0,
    stockQty: product.stockQty,
  };
  const effectivePrice = Math.max(0, product.sellingPrice + (activeVariant.priceDelta || 0));
  const effectiveMrp = Math.max(effectivePrice, product.mrp + (activeVariant.priceDelta || 0));
  const saved = isInWishlist(product.id);
  const outOfStock = product.stockQty <= 0;
  const userBoughtProduct = hasVerifiedPurchase(product.id);

  const enquiryUrl = buildWhatsAppUrl(
    settings.whatsappNumber,
    buildProductEnquiryMessage(product, activeVariant.label),
  );
  const shareUrl = `https://wa.me/?text=${encodeURIComponent(buildShareProductMessage(product))}`;

  const handleBuyNow = async () => {
    await addToCart(product, activeVariant, qty);
    navigate('/checkout');
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      notifyToast('Please sign in to submit a product review.', 'error');
      navigate('/login');
      return;
    }
    if (!user.emailVerified && !user.phoneNumber) {
      notifyToast('Please verify your account email or sign in with Google to submit a review.', 'error');
      return;
    }
    const clean = sanitizeText(reviewComment, 1000);
    if (clean.length < 3) {
      notifyToast('Please enter at least 3 characters in your review.', 'error');
      return;
    }
    setSubmittingReview(true);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/reviews/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          productId: product.id,
          rating: reviewRating,
          comment: clean,
        }),
      });

      if (res.status === 503) {
        // Fallback when server Firebase Admin credentials are not yet configured:
        // Strictly pending and verifiedPurchase: false (no verifiedOrderId allowed from client)
        const reviewId = `rev_${product.id}_${user.uid}_${Date.now()}`;
        await setDoc(doc(db, 'reviews', reviewId), {
          productId: product.id,
          userId: user.uid,
          userName: user.displayName || 'ROYAL FLASK Customer',
          rating: reviewRating,
          comment: clean,
          verifiedPurchase: false,
          status: 'pending',
          createdAt: serverTimestamp(),
        });
      } else {
        const data = (await res.json()) as { ok?: boolean; error?: string };
        if (!res.ok || !data.ok) {
          throw new Error(data.error || 'Could not submit review.');
        }
      }

      setReviewComment('');
      notifyToast('Thank you! Your review has been submitted and awaits Super Admin approval.', 'success');
    } catch (err) {
      if (err instanceof Error && err.message.includes('Missing or insufficient permissions')) {
        handleFirestoreError(err, OperationType.CREATE, `reviews/${product.id}`);
      }
      notifyToast(err instanceof Error ? err.message : 'Unable to submit review.', 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <SeoHead
        title={`${product.name} – ROYAL FLASK India`}
        description={product.description.slice(0, 155)}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: product.name,
          sku: product.sku,
          description: product.description,
          brand: { '@type': 'Brand', name: 'ROYAL FLASK' },
          offers: {
            '@type': 'Offer',
            priceCurrency: 'INR',
            price: String(effectivePrice),
            availability: outOfStock ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
          },
        }}
      />

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-6 flex-wrap">
        <Link to="/" className="hover:text-[#2449B5]">Home</Link>
        <span>/</span>
        <Link to="/shop" className="hover:text-[#2449B5]">Shop</Link>
        <span>/</span>
        <span>{product.categoryName}</span>
        <span>/</span>
        <span className="text-slate-900 dark:text-slate-200 font-medium">{product.name}</span>
      </nav>

      {/* Main Split: Sticky Gallery + Purchase Module */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
        {/* Left: Gallery */}
        <div className="lg:col-span-7 space-y-4">
          <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-slate-100 dark:bg-[#131E36] border border-slate-200 dark:border-slate-800">
            <SmartImage
              src={product.images[selectedImageIdx] || product.images[0]}
              alt={product.name}
              className="w-full h-full object-cover"
            />
            {product.discountPercent > 0 && (
              <span className="absolute top-4 left-4 rounded-full bg-[#E76F51] text-white text-xs font-bold px-3 py-1 shadow-sm">
                {product.discountPercent}% OFF
              </span>
            )}
          </div>
          {product.images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-1">
              {product.images.map((img, i) => (
                <button
                  key={`${img}_${i}`}
                  type="button"
                  onClick={() => setSelectedImageIdx(i)}
                  className={`w-24 aspect-[4/3] rounded-lg overflow-hidden border-2 shrink-0 ${
                    selectedImageIdx === i
                      ? 'border-[#2449B5]'
                      : 'border-slate-200 dark:border-slate-800 opacity-75 hover:opacity-100'
                  }`}
                >
                  <SmartImage src={img} alt={`${product.name} view ${i + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Contiguous Purchase Module */}
        <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-6">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>{product.categoryName}</span>
              <span>·</span>
              <span>SKU: <span className="font-mono-tabular">{product.sku}</span></span>
              {product.isDemoData && (
                <>
                  <span>·</span>
                  <span>Demo Item</span>
                </>
              )}
            </div>
            <h1 className="mt-2 font-display text-3xl sm:text-4xl font-bold text-[#0B1D3A] dark:text-white leading-tight">
              {product.name}
            </h1>

            {/* Genuine Star Rating Summary (Stars displayed only when genuine review data exists) */}
            <div className="mt-2.5 flex items-center gap-2 text-sm flex-wrap">
              {ratingStats.count > 0 ? (
                <>
                  <div className="flex items-center gap-0.5" aria-label={`Rated ${ratingStats.average} out of 5`}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${
                          star <= Math.round(ratingStats.average)
                            ? 'text-amber-500 fill-current'
                            : 'text-slate-300 dark:text-slate-700'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="font-mono-tabular font-semibold text-slate-900 dark:text-white">
                    {ratingStats.average.toFixed(1)}
                  </span>
                  <span className="text-slate-400">·</span>
                  <a href="#customer-reviews" className="text-[#2449B5] dark:text-blue-400 hover:underline">
                    {ratingStats.count} {ratingStats.count === 1 ? 'review' : 'reviews'}
                  </a>
                </>
              ) : (
                <a href="#customer-reviews" className="text-xs text-slate-500 dark:text-slate-400 hover:underline">
                  No Reviews Yet · Be the first to review
                </a>
              )}
            </div>
          </div>

          <div className="pb-5 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-3xl font-bold font-mono-tabular text-[#0B1D3A] dark:text-white">
                {formatINR(effectivePrice)}
              </span>
              {effectiveMrp > effectivePrice && (
                <>
                  <span className="text-base font-mono-tabular line-through text-slate-400">
                    {formatINR(effectiveMrp)}
                  </span>
                  <span className="rounded-full bg-[#E76F51] text-white text-xs font-bold px-2.5 py-0.5">
                    {product.discountPercent}% OFF
                  </span>
                </>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
              Inclusive of {product.gstPercent}% GST · HSN <span className="font-mono-tabular">{product.hsnCode}</span>
            </p>
          </div>

          {/* Variants */}
          {product.variants.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2.5">
                Select Option: <span className="text-[#0B1D3A] dark:text-white">{activeVariant.label}</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((variant, idx) => (
                  <button
                    key={variant.id}
                    type="button"
                    onClick={() => setSelectedVariantIdx(idx)}
                    className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg border transition-colors ${
                      selectedVariantIdx === idx
                        ? 'border-[#2449B5] bg-[#2449B5] text-white'
                        : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-slate-400'
                    }`}
                  >
                    {variant.colorHex && (
                      <span
                        className="w-3 h-3 rounded-full border border-white/40"
                        style={{ backgroundColor: variant.colorHex }}
                      />
                    )}
                    <span>{variant.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity & Availability */}
          <div className="flex items-center justify-between gap-4">
            <div className="inline-flex items-center border border-slate-300 dark:border-slate-700 rounded-lg">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                aria-label="Decrease quantity"
                className="p-2.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="px-4 text-sm font-mono-tabular font-semibold text-slate-900 dark:text-white">
                {qty}
              </span>
              <button
                type="button"
                onClick={() => setQty((q) => Math.min(20, q + 1))}
                aria-label="Increase quantity"
                className="p-2.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs font-medium">
              {outOfStock ? (
                <span className="text-rose-600 dark:text-rose-400">Currently Out of Stock</span>
              ) : product.stockQty <= 10 ? (
                <span className="text-amber-700 dark:text-amber-400">
                  Only {product.stockQty} left in stock
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                  <Check className="w-3.5 h-3.5" /> In Stock ({product.stockQty} units)
                </span>
              )}
            </div>
          </div>

          {/* Primary Purchase Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              disabled={outOfStock}
              onClick={() => addToCart(product, activeVariant, qty)}
              className="py-3.5 px-5 inline-flex items-center justify-center gap-2 text-sm font-semibold text-white bg-[#2449B5] hover:bg-[#1b3891] rounded-lg disabled:opacity-40 transition-colors"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Add to Bag</span>
            </button>
            <button
              type="button"
              disabled={outOfStock}
              onClick={handleBuyNow}
              className="py-3.5 px-5 text-sm font-semibold text-[#0B1D3A] dark:text-white bg-slate-100 hover:bg-slate-200 dark:bg-[#131E36] dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg disabled:opacity-40 transition-colors"
            >
              Buy Now
            </button>
          </div>

          {/* Wishlist & WhatsApp Actions */}
          <div className="grid grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={() => toggleWishlist(product)}
              className={`py-2.5 px-3 inline-flex items-center justify-center gap-1.5 text-xs font-medium rounded-lg border transition-colors ${
                saved
                  ? 'border-[#2449B5] bg-blue-50 dark:bg-blue-950/40 text-[#2449B5] dark:text-blue-400'
                  : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${saved ? 'fill-current' : ''}`} />
              <span>{saved ? 'Saved' : 'Wishlist'}</span>
            </button>

            <a
              href={enquiryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2.5 px-3 inline-flex items-center justify-center gap-1.5 text-xs font-medium rounded-lg border border-emerald-600/35 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Enquire</span>
            </a>

            <a
              href={shareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2.5 px-3 inline-flex items-center justify-center gap-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share</span>
            </a>
          </div>

          {/* Delivery & Guarantee */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2.5 text-xs text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-2.5">
              <Truck className="w-4 h-4 text-[#2449B5] shrink-0" />
              <span>Free standard delivery above {formatINR(settings.freeShippingThreshold)} · COD eligible</span>
            </div>
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-[#2449B5] shrink-0" />
              <span>7-day return &amp; replacement guarantee · Tax invoice included</span>
            </div>
          </div>
        </div>
      </div>

      {/* Product Description & Technical Specifications */}
      <section className="mt-14 pt-10 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-6">
          <h2 className="font-display text-2xl font-bold text-[#0B1D3A] dark:text-white mb-4">
            Design &amp; Craftsmanship
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
            {product.description}
          </p>
        </div>

        <div className="lg:col-span-6">
          <h2 className="font-display text-2xl font-bold text-[#0B1D3A] dark:text-white mb-4">
            Specifications &amp; Dimensions
          </h2>
          <dl className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-[#0D1526]">
            <div className="px-4 py-3 flex justify-between gap-4 text-sm">
              <dt className="text-slate-500 dark:text-slate-400">Dimensions</dt>
              <dd className="font-medium text-slate-900 dark:text-white text-right">{product.dimensions}</dd>
            </div>
            <div className="px-4 py-3 flex justify-between gap-4 text-sm">
              <dt className="text-slate-500 dark:text-slate-400">Net Weight</dt>
              <dd className="font-medium font-mono-tabular text-slate-900 dark:text-white text-right">{product.weight}</dd>
            </div>
            <div className="px-4 py-3 flex justify-between gap-4 text-sm">
              <dt className="text-slate-500 dark:text-slate-400">HSN / GST</dt>
              <dd className="font-medium font-mono-tabular text-slate-900 dark:text-white text-right">
                {product.hsnCode} ({product.gstPercent}% GST)
              </dd>
            </div>
            {product.specifications.map((spec) => (
              <div key={spec.key} className="px-4 py-3 flex justify-between gap-4 text-sm">
                <dt className="text-slate-500 dark:text-slate-400">{spec.key}</dt>
                <dd className="font-medium text-slate-900 dark:text-white text-right">{spec.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Customer Reviews & Star Rating Breakdown */}
      <section id="customer-reviews" className="mt-14 pt-10 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-5 space-y-8">
          {/* Star Rating Breakdown */}
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1526]">
            <h2 className="font-display text-2xl font-bold text-[#0B1D3A] dark:text-white">
              Ratings &amp; Breakdown
            </h2>
            {ratingStats.count > 0 ? (
              <>
                <div className="mt-4 flex items-baseline gap-3">
                  <span className="text-4xl font-bold font-mono-tabular text-[#0B1D3A] dark:text-white">
                    {ratingStats.average.toFixed(1)}
                  </span>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${
                            star <= Math.round(ratingStats.average)
                              ? 'text-amber-500 fill-current'
                              : 'text-slate-300 dark:text-slate-700'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Based on {ratingStats.count} {ratingStats.count === 1 ? 'review' : 'reviews'}
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-2">
                  {([5, 4, 3, 2, 1] as const).map((starLevel) => {
                    const count = ratingStats.breakdown[starLevel];
                    const pct = Math.round((count / ratingStats.count) * 100);
                    return (
                      <div key={starLevel} className="flex items-center gap-3 text-xs">
                        <span className="w-8 font-mono-tabular font-medium text-slate-700 dark:text-slate-300">
                          {starLevel} ★
                        </span>
                        <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className="h-full bg-[#2449B5] transition-all duration-300"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="w-10 text-right font-mono-tabular text-slate-500 dark:text-slate-400">
                          {count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                No Reviews Yet. Star ratings and score breakdowns will appear here once verified customers submit reviews.
              </p>
            )}
          </div>

          {/* Review Submission Form */}
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1526]">
            <h3 className="font-display text-2xl font-bold text-[#0B1D3A] dark:text-white mb-1">
              Write a Review
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              {userBoughtProduct
                ? 'Your account has a confirmed order for this product — your review will carry a Verified Purchase badge.'
                : 'Share your honest feedback on quality, finish, and thermal performance.'}
            </p>

            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Your Rating
                </label>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className={`p-1.5 rounded ${
                        star <= reviewRating ? 'text-amber-500' : 'text-slate-300 dark:text-slate-700'
                      }`}
                      aria-label={`Rate ${star} stars`}
                    >
                      <Star className="w-5 h-5 fill-current" />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Written Review
                </label>
                <textarea
                  rows={3}
                  required
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="How does the thermal retention, finish, or build quality perform?"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#060911] p-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2449B5]"
                />
              </div>

              <button
                type="submit"
                disabled={submittingReview}
                className="px-5 py-2.5 text-xs font-semibold text-white bg-[#2449B5] hover:bg-[#1b3891] rounded-lg disabled:opacity-50 transition-colors"
              >
                {submittingReview ? 'Submitting...' : 'Submit Review'}
              </button>
            </form>
          </div>
        </div>

        {/* Written Reviews List */}
        <div className="lg:col-span-7 space-y-4">
          <h2 className="font-display text-2xl font-bold text-[#0B1D3A] dark:text-white">
            Customer Reviews ({productReviews.length})
          </h2>
          {productReviews.length === 0 ? (
            <div className="p-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1526] text-sm text-slate-500 dark:text-slate-400">
              No customer reviews have been submitted for this product yet. Once customers submit reviews, their
              authentic ratings and comments appear here.
            </div>
          ) : (
            <div className="space-y-4">
              {productReviews.map((rev) => (
                <article
                  key={rev.id}
                  className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1526]"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">{rev.userName}</span>
                      {rev.verifiedPurchase && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Verified Purchase</span>
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {formatFirestoreDate(rev.createdAt)}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-0.5 text-amber-500">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-3.5 h-3.5 ${
                          star <= rev.rating ? 'fill-current' : 'text-slate-300 dark:text-slate-700'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="mt-2.5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{rev.comment}</p>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <section className="mt-14 pt-10 border-t border-slate-200 dark:border-slate-800">
          <h2 className="font-display text-2xl font-bold text-[#0B1D3A] dark:text-white mb-6">
            Related Products
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {relatedProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* Recently Viewed */}
      {recentlyViewed.length > 0 && (
        <section className="mt-14 pt-10 border-t border-slate-200 dark:border-slate-800">
          <h2 className="font-display text-2xl font-bold text-[#0B1D3A] dark:text-white mb-6">
            Recently Viewed
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentlyViewed.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
