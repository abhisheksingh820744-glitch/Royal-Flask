import { Heart, ShoppingBag, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { formatINR } from '../lib/formatters';
import type { Product } from '../types/ecommerce';
import { SmartImage } from './SmartImage';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addToCart, toggleWishlist, isInWishlist, getProductRatingStats } = useStore();
  const saved = isInWishlist(product.id);
  const outOfStock = product.stockQty <= 0;
  const ratingStats = getProductRatingStats(product.id);

  return (
    <article className="group flex flex-col bg-white dark:bg-[#0D1526] border border-slate-200 dark:border-slate-800/90 rounded-xl overflow-hidden transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="relative aspect-[4/3] bg-slate-100 dark:bg-[#131E36] overflow-hidden">
        <Link to={`/product/${product.slug}`} className="block w-full h-full">
          <SmartImage
            src={product.images[0]}
            alt={product.name}
            fallbackTitle={product.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        </Link>

        {/* Coral Orange Discount Badge (#E76F51) */}
        {product.discountPercent > 0 && (
          <span className="absolute top-3 left-3 rounded-full bg-[#E76F51] text-white text-[11px] font-bold tracking-wide px-2.5 py-1 shadow-sm">
            {product.discountPercent}% OFF
          </span>
        )}

        <button
          type="button"
          onClick={() => toggleWishlist(product)}
          aria-label={saved ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
          className={`absolute top-3 right-3 p-2.5 rounded-full backdrop-blur-sm border transition-colors ${
            saved
              ? 'bg-[#2449B5] text-white border-[#2449B5]'
              : 'bg-white/90 dark:bg-[#060911]/85 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:text-[#2449B5]'
          }`}
        >
          <Heart className={`w-4 h-4 ${saved ? 'fill-current' : ''}`} />
        </button>
      </div>

      <div className="p-4 flex flex-col flex-1 min-w-0">
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 truncate">
          <span className="truncate">{product.categoryName}</span>
          <span aria-hidden="true">·</span>
          <span className={outOfStock ? 'text-rose-600 dark:text-rose-400 font-medium shrink-0' : 'shrink-0'}>
            {outOfStock ? 'Out of stock' : product.isDemoData ? 'Demo catalog' : 'In stock'}
          </span>
        </div>

        <Link
          to={`/product/${product.slug}`}
          className="mt-1.5 text-base font-semibold text-slate-900 dark:text-white hover:text-[#2449B5] dark:hover:text-blue-400 line-clamp-2 transition-colors break-words"
        >
          {product.name}
        </Link>

        {/* Genuine Customer Ratings (Stars shown ONLY when genuine reviews exist) */}
        <div className="mt-2 flex items-center gap-1.5 text-xs min-h-[18px]">
          {ratingStats.count > 0 ? (
            <>
              <div className="flex items-center gap-0.5" aria-label={`Rated ${ratingStats.average} out of 5`}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-3.5 h-3.5 ${
                      star <= Math.round(ratingStats.average)
                        ? 'text-amber-500 fill-current'
                        : 'text-slate-300 dark:text-slate-700'
                    }`}
                  />
                ))}
              </div>
              <span className="text-slate-700 dark:text-slate-300 font-mono-tabular font-medium">
                {ratingStats.average.toFixed(1)}
              </span>
              <span className="text-slate-500 dark:text-slate-400 font-mono-tabular">
                ({ratingStats.count} {ratingStats.count === 1 ? 'review' : 'reviews'})
              </span>
            </>
          ) : (
            <span className="text-slate-400 dark:text-slate-500">No Reviews Yet</span>
          )}
        </div>

        <div className="mt-auto pt-4 flex items-center justify-between gap-3">
          <div className="flex items-baseline gap-2 flex-wrap min-w-0">
            <span className="text-base font-semibold font-mono-tabular text-[#0B1D3A] dark:text-white">
              {formatINR(product.sellingPrice)}
            </span>
            {product.mrp > product.sellingPrice && (
              <span className="text-xs font-mono-tabular line-through text-slate-400">
                {formatINR(product.mrp)}
              </span>
            )}
          </div>

          <button
            type="button"
            disabled={outOfStock}
            onClick={() => addToCart(product)}
            aria-label={`Add ${product.name} to bag`}
            className="inline-flex items-center justify-center gap-1.5 min-h-[38px] px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#2449B5] hover:bg-[#1b3891] text-white disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap shrink-0 transition-colors"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>{outOfStock ? 'Sold Out' : 'Add'}</span>
          </button>
        </div>
      </div>
    </article>
  );
}
