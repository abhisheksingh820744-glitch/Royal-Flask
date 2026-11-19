import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import {
  IMG_DINNERWARE,
  IMG_KADAI,
  IMG_STORAGE,
  IMG_VACUUM_FLASK,
} from '../data/seedCatalog';
import { SmartImage } from './SmartImage';

interface PromoSlide {
  id: string;
  tag: string;
  heading: string;
  description: string;
  ctaText: string;
  ctaLink: string;
  image: string;
}

const DEFAULT_SLIDES: PromoSlide[] = [
  {
    id: 'banner_kitchen_cookware',
    tag: 'Kitchen & Cookware',
    heading: 'Heritage Cast Iron & Tri-Ply Cookware',
    description:
      'Pre-seasoned virgin cast iron kadais and heavy-gauge cookware crafted for balanced heat retention across Indian kitchens.',
    ctaText: 'Shop Now',
    ctaLink: '/category/kitchen-cookware',
    image: IMG_KADAI,
  },
  {
    id: 'banner_home_living',
    tag: 'Home & Living',
    heading: 'Architectural Stoneware & Dining Sets',
    description:
      'High-fired matte stoneware plates, deep bowls, and refined tabletop accents designed for everyday gatherings.',
    ctaText: 'Shop Now',
    ctaLink: '/category/home-living',
    image: IMG_DINNERWARE,
  },
  {
    id: 'banner_water_bottles',
    tag: 'Water Bottles & Drinkware',
    heading: '24-Hour Vacuum Insulated Royal Flasks',
    description:
      'Copper-lined 304 surgical stainless steel flasks and hammered copper bottles engineered for extreme Indian summers.',
    ctaText: 'Shop Now',
    ctaLink: '/category/water-bottles-flasks',
    image: IMG_VACUUM_FLASK,
  },
  {
    id: 'banner_storage_org',
    tag: 'Storage & Organization',
    heading: 'Airtight Borosilicate Pantry Canisters',
    description:
      'Crystal-clear borosilicate jars with vacuum-seal lids and leakproof 3-tier tiffins to keep staples fresh.',
    ctaText: 'Shop Now',
    ctaLink: '/category/food-storage-containers',
    image: IMG_STORAGE,
  },
];

function inferTagFromBanner(id: string, ctaLink: string): string {
  if (id === 'banner_kitchen_cookware' || ctaLink.includes('cookware')) return 'Kitchen & Cookware';
  if (id === 'banner_home_living' || ctaLink.includes('home-living')) return 'Home & Living';
  if (id === 'banner_water_bottles' || ctaLink.includes('water-bottles')) return 'Water Bottles & Drinkware';
  if (id === 'banner_storage_org' || ctaLink.includes('storage')) return 'Storage & Organization';
  return 'Featured Collection';
}

export function HeroBannerSlider() {
  const { banners } = useStore();
  const [activeIdx, setActiveIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const slides: PromoSlide[] = useMemo(() => {
    const active = banners.filter((b) => b.active);
    if (active.length < 4) return DEFAULT_SLIDES;
    return active.map((b) => ({
      id: b.id,
      tag: inferTagFromBanner(b.id, b.ctaLink),
      heading: b.title,
      description: b.subtitle,
      ctaText: b.ctaText || 'Shop Now',
      ctaLink: b.ctaLink || '/shop',
      image: b.image,
    }));
  }, [banners]);

  const safeIdx = slides.length > 0 ? activeIdx % slides.length : 0;

  useEffect(() => {
    if (paused || slides.length <= 1) return;
    const timer = window.setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % slides.length);
    }, 4500);
    return () => window.clearInterval(timer);
  }, [paused, slides.length]);

  const goPrev = () => setActiveIdx((prev) => (prev - 1 + slides.length) % slides.length);
  const goNext = () => setActiveIdx((prev) => (prev + 1) % slides.length);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
    setPaused(true);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) {
      setPaused(false);
      return;
    }
    const endX = e.changedTouches[0]?.clientX ?? touchStartX.current;
    const delta = touchStartX.current - endX;
    if (delta > 45) goNext();
    else if (delta < -45) goPrev();
    touchStartX.current = null;
    setPaused(false);
  };

  return (
    <section
      aria-label="Promotional Collections"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="relative w-full overflow-hidden bg-slate-100 dark:bg-[#0A1120] border-b border-slate-200 dark:border-slate-800/80"
    >
      <div
        className="flex transition-transform duration-500 ease-out will-change-transform"
        style={{ transform: `translateX(-${safeIdx * 100}%)` }}
      >
        {slides.map((slide) => (
          <div key={slide.id} className="w-full shrink-0 overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-6 sm:py-10 lg:py-12">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-8 lg:gap-10 items-center">
                <div className="lg:col-span-6 order-2 lg:order-1 min-w-0 space-y-3 sm:space-y-4">
                  <span className="inline-block rounded-full bg-[#E76F51] text-white text-[11px] font-semibold uppercase tracking-wider px-3 py-1">
                    {slide.tag}
                  </span>
                  <h2 className="font-display text-2xl sm:text-4xl lg:text-5xl font-bold text-[#0B1D3A] dark:text-white leading-[1.15] sm:leading-[1.1] break-words">
                    {slide.heading}
                  </h2>
                  <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-xl leading-relaxed break-words">
                    {slide.description}
                  </p>
                  <div className="pt-1.5">
                    <Link
                      to={slide.ctaLink}
                      className="inline-flex items-center justify-center gap-2 w-full sm:w-auto min-h-[44px] px-6 py-3 text-sm font-semibold text-white bg-[#2449B5] hover:bg-[#1b3891] rounded-lg transition-colors"
                    >
                      <span>{slide.ctaText}</span>
                      <ArrowRight className="w-4 h-4 shrink-0" />
                    </Link>
                  </div>
                </div>

                <div className="lg:col-span-6 order-1 lg:order-2 min-w-0">
                  <div className="relative aspect-[16/10] sm:aspect-[16/9] rounded-xl sm:rounded-2xl overflow-hidden bg-slate-200 dark:bg-[#131E36] border border-slate-200 dark:border-slate-800">
                    <SmartImage
                      src={slide.image}
                      alt={slide.heading}
                      className="w-full h-full object-cover object-center"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Previous / Next Controls (positioned cleanly on mobile image zone and centered on desktop) */}
      <button
        type="button"
        onClick={goPrev}
        aria-label="Previous promotional banner"
        className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/90 dark:bg-[#0D1526]/90 border border-slate-200 dark:border-slate-700 text-[#0B1D3A] dark:text-white hover:border-[#2449B5] shadow-md absolute left-2 sm:left-4 top-[115px] sm:top-1/2 -translate-y-1/2 transition-colors z-10"
      >
        <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
      </button>

      <button
        type="button"
        onClick={goNext}
        aria-label="Next promotional banner"
        className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/90 dark:bg-[#0D1526]/90 border border-slate-200 dark:border-slate-700 text-[#0B1D3A] dark:text-white hover:border-[#2449B5] shadow-md absolute right-2 sm:right-4 top-[115px] sm:top-1/2 -translate-y-1/2 transition-colors z-10"
      >
        <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
      </button>

      {/* Pagination Dots */}
      <div className="pb-5 flex items-center justify-center gap-1.5">
        {slides.map((s, idx) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setActiveIdx(idx)}
            aria-label={`Show ${s.tag} banner`}
            className="p-1.5 flex items-center justify-center"
          >
            <span
              className={`block h-2 rounded-full transition-all ${
                idx === safeIdx
                  ? 'w-7 bg-[#2449B5]'
                  : 'w-2 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400'
              }`}
            />
          </button>
        ))}
      </div>
    </section>
  );
}
