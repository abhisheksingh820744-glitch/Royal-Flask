import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Filter, Search, SlidersHorizontal, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { ProductCard } from '../components/ProductCard';
import { SeoHead } from '../components/SeoHead';
import { SmartImage } from '../components/SmartImage';
import { formatINR } from '../lib/formatters';

type SortMode = 'featured' | 'price-asc' | 'price-desc' | 'rating' | 'discount';

export function CategoriesPage() {
  const { categories, products } = useStore();
  const activeCategories = categories.filter((c) => c.active);

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <SeoHead
        title="All Categories – ROYAL FLASK India"
        description="Browse all 13 Home & Kitchen categories at ROYAL FLASK including Water Bottles & Flasks, Cookware, Lunch Boxes, Appliances, and Tableware."
      />
      <div className="mb-10">
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#0B1D3A] dark:text-white">
          All Departments
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
          Explore our complete Home &amp; Kitchen range across {activeCategories.length} active categories.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {activeCategories.map((cat) => {
          const count = products.filter((p) => p.status === 'active' && p.categoryId === cat.id).length;
          return (
            <Link
              key={cat.id}
              to={`/category/${cat.slug}`}
              className="group bg-white dark:bg-[#0D1526] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden hover:border-[#2449B5] dark:hover:border-blue-500 transition-colors flex flex-col"
            >
              <div className="aspect-[16/10] bg-slate-100 dark:bg-[#131E36] overflow-hidden">
                <SmartImage
                  src={cat.image}
                  alt={cat.name}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white group-hover:text-[#2449B5] dark:group-hover:text-blue-400">
                    {cat.name}
                  </h2>
                  <span className="text-xs font-mono-tabular text-slate-500 dark:text-slate-400">
                    {count} {count === 1 ? 'item' : 'items'}
                  </span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1.5 line-clamp-2">{cat.description}</p>
                {cat.subcategories.length > 0 && (
                  <p className="mt-auto pt-4 text-xs text-slate-500 dark:text-slate-400">
                    {cat.subcategories.join(' · ')}
                  </p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}

export function ExplorePage() {
  const { products, recentlyViewedIds } = useStore();
  const activeProducts = products.filter((p) => p.status === 'active');

  const trending = activeProducts.filter((p) => p.trending);
  const newArrivals = activeProducts.filter((p) => p.newArrival);
  const specialOffers = activeProducts.filter((p) => p.discountPercent >= 25);
  const recentlyViewed = recentlyViewedIds
    .map((id) => activeProducts.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-14">
      <SeoHead
        title="Explore Collections – ROYAL FLASK India"
        description="Discover trending products, new arrivals, special offers, and recommended Home & Kitchen essentials at ROYAL FLASK."
      />

      <div>
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#0B1D3A] dark:text-white">
          Explore Collections
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
          Curated selections across trending releases, new arrivals, and value bundles.
        </p>
      </div>

      {trending.length > 0 && (
        <section>
          <h2 className="font-display text-2xl font-bold text-[#0B1D3A] dark:text-white mb-6">Trending Now</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {trending.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {newArrivals.length > 0 && (
        <section>
          <h2 className="font-display text-2xl font-bold text-[#0B1D3A] dark:text-white mb-6">New Arrivals</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {newArrivals.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {specialOffers.length > 0 && (
        <section>
          <h2 className="font-display text-2xl font-bold text-[#0B1D3A] dark:text-white mb-6">
            Special Offers (25%+ Savings)
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {specialOffers.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {recentlyViewed.length > 0 && (
        <section>
          <h2 className="font-display text-2xl font-bold text-[#0B1D3A] dark:text-white mb-6">Recently Viewed</h2>
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

export function ShopPage() {
  const { slug } = useParams<{ slug?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { categories, products, recentlyViewedIds, usingDemoFallback, getProductRatingStats, reviews } = useStore();

  const initialQuery = searchParams.get('q') || '';
  const [queryText, setQueryText] = useState(initialQuery);
  const [selectedCategorySlug, setSelectedCategorySlug] = useState(slug || 'all');
  const [selectedSubcategory, setSelectedSubcategory] = useState('all');
  const [maxPrice, setMaxPrice] = useState(10000);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortMode>('featured');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  useEffect(() => {
    setSelectedCategorySlug(slug || 'all');
    setSelectedSubcategory('all');
  }, [slug]);

  useEffect(() => {
    const q = searchParams.get('q') || '';
    setQueryText(q);
  }, [searchParams]);

  const activeCategories = categories.filter((c) => c.active);
  const activeCategory = activeCategories.find((c) => c.slug === selectedCategorySlug);

  const filteredProducts = useMemo(() => {
    const q = queryText.trim().toLowerCase();
    const list = products.filter((p) => {
      if (p.status !== 'active') return false;
      if (selectedCategorySlug !== 'all') {
        if (!activeCategory || p.categoryId !== activeCategory.id) return false;
      }
      if (selectedSubcategory !== 'all' && p.subcategory !== selectedSubcategory) return false;
      if (p.sellingPrice > maxPrice) return false;
      if (inStockOnly && p.stockQty <= 0) return false;
      if (q) {
        const tokens = q.split(/\s+/).filter(Boolean);
        const specsText = p.specifications.map((s) => `${s.key} ${s.value}`).join(' ');
        const variantsText = p.variants.map((v) => v.label).join(' ');
        const hay = `${p.name} ${p.sku} ${p.categoryName} ${p.subcategory} ${p.description} ${specsText} ${variantsText}`.toLowerCase();
        if (!tokens.every((tok) => hay.includes(tok))) return false;
      }
      return true;
    });

    return [...list].sort((a, b) => {
      switch (sortBy) {
        case 'price-asc':
          return a.sellingPrice - b.sellingPrice;
        case 'price-desc':
          return b.sellingPrice - a.sellingPrice;
        case 'rating': {
          const statsB = getProductRatingStats(b.id);
          const statsA = getProductRatingStats(a.id);
          return statsB.average - statsA.average || statsB.count - statsA.count;
        }
        case 'discount':
          return b.discountPercent - a.discountPercent;
        default:
          return Number(b.featured) - Number(a.featured) || Number(b.bestseller) - Number(a.bestseller);
      }
    });
  }, [products, queryText, selectedCategorySlug, activeCategory, selectedSubcategory, maxPrice, inStockOnly, sortBy, reviews]);

  const recentlyViewed = recentlyViewedIds
    .map((id) => products.find((p) => p.id === id && p.status === 'active'))
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .slice(0, 3);

  const pageTitle = activeCategory
    ? `${activeCategory.name} – ROYAL FLASK India`
    : queryText
      ? `Search: ${queryText} – ROYAL FLASK`
      : 'Shop All Products – ROYAL FLASK India';

  const filterPanel = (
    <div className="space-y-6">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-white mb-3">
          Categories
        </h3>
        <div className="space-y-1.5">
          <button
            type="button"
            onClick={() => {
              setSelectedCategorySlug('all');
              setSelectedSubcategory('all');
            }}
            className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${
              selectedCategorySlug === 'all'
                ? 'bg-[#2449B5] text-white font-medium'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            All Categories
          </button>
          {activeCategories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setSelectedCategorySlug(cat.slug);
                setSelectedSubcategory('all');
              }}
              className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${
                selectedCategorySlug === cat.slug
                  ? 'bg-[#2449B5] text-white font-medium'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {activeCategory && activeCategory.subcategories.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-white mb-3">
            Subcategory
          </h3>
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => setSelectedSubcategory('all')}
              className={`w-full text-left px-3 py-1.5 text-xs rounded-md ${
                selectedSubcategory === 'all'
                  ? 'bg-slate-200 dark:bg-slate-800 font-semibold text-slate-900 dark:text-white'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              All in {activeCategory.name}
            </button>
            {activeCategory.subcategories.map((sub) => (
              <button
                key={sub}
                type="button"
                onClick={() => setSelectedSubcategory(sub)}
                className={`w-full text-left px-3 py-1.5 text-xs rounded-md ${
                  selectedSubcategory === sub
                    ? 'bg-slate-200 dark:bg-slate-800 font-semibold text-slate-900 dark:text-white'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {sub}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-white mb-2">
          <span>Max Price</span>
          <span className="font-mono-tabular text-[#2449B5] dark:text-blue-400">{formatINR(maxPrice)}</span>
        </div>
        <input
          type="range"
          min={500}
          max={10000}
          step={250}
          value={maxPrice}
          onChange={(e) => setMaxPrice(Number(e.target.value))}
          className="w-full accent-[#2449B5]"
        />
      </div>

      <label className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
        <input
          type="checkbox"
          checked={inStockOnly}
          onChange={(e) => setInStockOnly(e.target.checked)}
          className="rounded border-slate-300 text-[#2449B5] focus:ring-[#2449B5]"
        />
        <span>In stock only</span>
      </label>

      <button
        type="button"
        onClick={() => {
          setQueryText('');
          setSearchParams({});
          setSelectedCategorySlug('all');
          setSelectedSubcategory('all');
          setMaxPrice(10000);
          setInStockOnly(false);
        }}
        className="w-full py-2 text-xs font-medium border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        Reset Filters
      </button>
    </div>
  );

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <SeoHead
        title={pageTitle}
        description={
          activeCategory?.description ||
          'Browse ROYAL FLASK products with instant search, price filtering, and pan-India delivery.'
        }
      />

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#0B1D3A] dark:text-white">
            {activeCategory ? activeCategory.name : 'Shop Collection'}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            {activeCategory ? activeCategory.description : 'Multi-category Home & Kitchen storefront'}
            {usingDemoFallback ? ' · Demo catalog preview' : ''}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              placeholder="Search All Home & Kitchen Products"
              aria-label="Search All Home & Kitchen Products"
              className="w-full min-h-[42px] pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0D1526] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2449B5]"
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortMode)}
            aria-label="Sort products"
            className="min-h-[42px] px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0D1526] text-slate-900 dark:text-white focus:outline-none"
          >
            <option value="featured">Sort: Featured</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="discount">Highest Discount</option>
            <option value="rating">Customer Rating</option>
          </select>

          <button
            type="button"
            onClick={() => setMobileFiltersOpen(true)}
            className="lg:hidden inline-flex items-center gap-1.5 min-h-[42px] px-3.5 py-2 text-sm font-medium border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Filters</span>
          </button>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <aside className="hidden lg:block lg:col-span-3">{filterPanel}</aside>

        <section className="lg:col-span-9">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
            Showing <span className="font-mono-tabular font-semibold">{filteredProducts.length}</span> products
          </p>

          {filteredProducts.length === 0 ? (
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center bg-slate-50 dark:bg-[#0D1526]">
              <Filter className="w-8 h-8 text-slate-400 mx-auto mb-3" />
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">No matching products</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Try clearing your search query or adjusting the price slider.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          {recentlyViewed.length > 0 && (
            <div className="mt-14 pt-10 border-t border-slate-200 dark:border-slate-800">
              <h2 className="font-display text-2xl font-bold text-[#0B1D3A] dark:text-white mb-5">
                Recently Viewed
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {recentlyViewed.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Mobile Filters Drawer */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex justify-end">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileFiltersOpen(false)} />
          <div className="relative w-80 max-w-[85vw] bg-white dark:bg-[#0D1526] h-full p-6 overflow-y-auto">
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-200 dark:border-slate-800">
              <h2 className="font-semibold text-slate-900 dark:text-white">Filters</h2>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                aria-label="Close filters"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {filterPanel}
          </div>
        </div>
      )}
    </main>
  );
}
