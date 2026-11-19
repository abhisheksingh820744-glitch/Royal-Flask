import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, MessageCircle, Search, Shield, Truck } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { buildWhatsAppUrl } from '../lib/formatters';
import { HeroBannerSlider } from '../components/HeroBannerSlider';
import { ProductCard } from '../components/ProductCard';
import { SeoHead } from '../components/SeoHead';
import { SmartImage } from '../components/SmartImage';

export function HomePage() {
  const { categories, products, settings, usingDemoFallback } = useStore();
  const [heroSearch, setHeroSearch] = useState('');
  const navigate = useNavigate();

  const activeCategories = categories.filter((c) => c.active);
  const activeProducts = products.filter((p) => p.status === 'active');
  const featuredProducts = activeProducts.filter((p) => p.featured || p.bestseller).slice(0, 6);
  const showcaseProducts = featuredProducts.length > 0 ? featuredProducts : activeProducts.slice(0, 6);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (heroSearch.trim()) {
      navigate(`/search?q=${encodeURIComponent(heroSearch.trim())}`);
    } else {
      navigate('/shop');
    }
  };

  return (
    <>
      <SeoHead
        title="ROYAL FLASK – Luxury Home & Kitchen Store India"
        description="Shop precision-crafted insulated flasks, cookware, lunch boxes, kitchen appliances, tableware, and home essentials from ROYAL FLASK India."
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: 'ROYAL FLASK',
          url: 'https://royalflask.in',
          contactPoint: {
            '@type': 'ContactPoint',
            contactType: 'customer support',
            email: settings.supportEmail,
          },
        }}
      />

      <main>
        {/* 1. Automatic 4-Banner Promotional Slider Directly Below Header */}
        <HeroBannerSlider />

        {/* Store Heading, Description & Responsive Search Bar */}
        <section className="bg-white dark:bg-[#060911] border-b border-slate-200 dark:border-slate-800/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7 sm:py-10">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="max-w-2xl min-w-0">
                <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-[#0B1D3A] dark:text-white leading-tight break-words">
                  Everything Your Home Needs, All in One Place.
                </h1>
                <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                  Discover premium Home &amp; Kitchen essentials designed to make everyday living easier, smarter and better.
                </p>
              </div>

              <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:max-w-lg shrink-0">
                <div className="relative flex-1 min-w-0">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="search"
                    value={heroSearch}
                    onChange={(e) => setHeroSearch(e.target.value)}
                    placeholder="Search All Home & Kitchen Products"
                    aria-label="Search All Home & Kitchen Products"
                    className="w-full min-h-[44px] pl-10 pr-4 py-2.5 text-sm rounded-lg bg-slate-50 dark:bg-[#0D1526] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2449B5]"
                  />
                </div>
                <button
                  type="submit"
                  className="min-h-[44px] px-6 py-2.5 text-sm font-semibold text-white bg-[#2449B5] hover:bg-[#1b3891] rounded-lg whitespace-nowrap shrink-0 transition-colors"
                >
                  Search
                </button>
              </form>
            </div>

            <div className="mt-7 pt-6 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm">
              <div className="flex items-start gap-3">
                <Truck className="w-5 h-5 text-[#2449B5] shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">Pan-India Dispatch</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Complimentary delivery above ₹{settings.freeShippingThreshold} · Cash on Delivery available
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-[#2449B5] shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">304 Surgical-Grade Steel</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    BPA-free gaskets, BIS-compliant appliances, GST invoice on every order
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#2449B5] shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">Direct WhatsApp Concierge</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Instant product sizing, corporate gifting &amp; order assistance
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 2. Shop by Categories */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="flex items-end justify-between gap-4 mb-8">
            <div>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-[#0B1D3A] dark:text-white">
                Shop by Department
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Thirteen curated departments across hydration, cookware, dining, and home organization.
              </p>
            </div>
            <Link
              to="/categories"
              className="text-sm font-semibold text-[#2449B5] dark:text-blue-400 hover:underline whitespace-nowrap shrink-0"
            >
              All Categories →
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {activeCategories.slice(0, 10).map((cat) => (
              <Link
                key={cat.id}
                to={`/category/${cat.slug}`}
                className="group bg-white dark:bg-[#0D1526] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden hover:border-[#2449B5] transition-colors"
              >
                <div className="aspect-[4/3] bg-slate-100 dark:bg-[#131E36] overflow-hidden">
                  <SmartImage
                    src={cat.image}
                    alt={cat.name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="p-3.5">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-[#2449B5] dark:group-hover:text-blue-400 line-clamp-1">
                    {cat.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                    {cat.subcategories.slice(0, 2).join(' · ')}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* 3. Featured & Bestselling Products */}
        <section className="bg-slate-50/70 dark:bg-[#090E1A] border-y border-slate-200 dark:border-slate-800/80 py-14">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
              <div>
                <h2 className="font-display text-3xl sm:text-4xl font-bold text-[#0B1D3A] dark:text-white">
                  Flagship &amp; Bestselling Craft
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Signature flasks, cast iron cookware, and thermal carriers built for daily longevity.
                  {usingDemoFallback && ' (Showing demo preview catalog)'}
                </p>
              </div>
              <Link
                to="/shop"
                className="text-sm font-semibold text-[#2449B5] dark:text-blue-400 hover:underline whitespace-nowrap shrink-0 inline-flex items-center gap-1"
              >
                <span>View Full Catalog</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              {showcaseProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>

        {/* 4. Craftsmanship & Direct WhatsApp Concierge */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="rounded-2xl bg-[#0B1D3A] dark:bg-[#0D1526] border border-slate-800 text-white p-8 sm:p-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8">
              <p className="text-xs font-medium uppercase tracking-wider text-blue-300">
                Corporate Gifting &amp; Custom Orders
              </p>
              <h2 className="mt-2 font-display text-3xl sm:text-4xl font-bold text-white">
                Need personalised advice or bulk kitchenware pricing?
              </h2>
              <p className="mt-3 text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed">
                Connect directly with our Indian product specialists via WhatsApp Business for custom laser-engraved
                corporate flasks, wedding gift boxes, or kitchen appliance guidance.
              </p>
            </div>
            <div className="lg:col-span-4 flex flex-wrap lg:justify-end gap-3">
              <a
                href={buildWhatsAppUrl(
                  settings.whatsappNumber,
                  'Hello ROYAL FLASK Team, I would like assistance with product selection / bulk enquiry.',
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3.5 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Chat on WhatsApp</span>
              </a>
              <Link
                to="/about"
                className="inline-flex items-center gap-2 px-5 py-3.5 text-sm font-semibold border border-white/25 text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <span>Our Story</span>
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
