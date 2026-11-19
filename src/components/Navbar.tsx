import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  Heart,
  Menu,
  Moon,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sun,
  User as UserIcon,
  X,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';

export function Navbar() {
  const {
    theme,
    toggleTheme,
    user,
    isAdmin,
    cartCount,
    setCartDrawerOpen,
    wishlist,
    unreadNotifications,
    settings,
  } = useStore();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    setSearchOpen(false);
    if (q) {
      navigate(`/search?q=${encodeURIComponent(q)}`);
    } else {
      navigate('/shop');
    }
  };

  const navLinks = [
    { label: 'Shop', to: '/shop' },
    { label: 'Categories', to: '/categories' },
    { label: 'Explore', to: '/explore' },
    { label: 'Orders', to: '/orders' },
    { label: 'Support', to: '/support' },
  ];

  return (
    <>
      {!bannerDismissed && settings.announcementText && (
        <div className="bg-[#0B1D3A] dark:bg-[#0D1526] text-slate-100 text-xs py-2 px-4 flex items-center justify-center relative border-b border-white/10">
          <p className="truncate max-w-3xl text-center tracking-wide">{settings.announcementText}</p>
          <button
            type="button"
            onClick={() => setBannerDismissed(true)}
            aria-label="Dismiss announcement"
            className="absolute right-3 p-1 text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#060911]/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/80 transition-colors">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4 lg:gap-8">
          {/* Zone 1: Original RF Monogram + ROYAL FLASK Wordmark in Royal Blue (#2449B5) */}
          <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 shrink-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open menu"
              className="lg:hidden p-2 -ml-1.5 text-slate-700 dark:text-slate-200 hover:text-[#2449B5]"
            >
              <Menu className="w-5 h-5" />
            </button>
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 sm:gap-2.5 whitespace-nowrap shrink-0"
            >
              <img
                src="/assets/rf-logo-royal-blue.png"
                alt="ROYAL FLASK Monogram"
                className="h-6 sm:h-8 w-auto object-contain shrink-0"
              />
              <span className="font-display text-lg sm:text-2xl font-bold tracking-tight text-[#2449B5] whitespace-nowrap">
                ROYAL FLASK
              </span>
            </Link>
          </div>

          {/* Zone 2: Concise Single-Line Navigation Links */}
          <nav className="hidden lg:flex items-center gap-7 text-sm font-medium text-slate-600 dark:text-slate-300">
            {navLinks.map((item) => {
              const active = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`whitespace-nowrap shrink-0 py-1 transition-colors border-b-2 ${
                    active
                      ? 'text-[#2449B5] dark:text-white border-[#2449B5]'
                      : 'border-transparent hover:text-[#2449B5] dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            {isAdmin && (
              <Link
                to="/admin"
                className={`whitespace-nowrap shrink-0 py-1 inline-flex items-center gap-1.5 transition-colors border-b-2 ${
                  location.pathname.startsWith('/admin')
                    ? 'text-[#2449B5] dark:text-blue-400 border-[#2449B5]'
                    : 'border-transparent text-[#2449B5] dark:text-blue-400 hover:border-[#2449B5]'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Admin</span>
              </Link>
            )}
          </nav>

          {/* Zone 3: Utility Icons + Primary Bag Action */}
          <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setSearchOpen((prev) => !prev)}
              aria-label="Search products"
              className="p-2 text-slate-600 dark:text-slate-300 hover:text-[#2449B5] dark:hover:text-white rounded-lg transition-colors"
            >
              <Search className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              className="p-2 text-slate-600 dark:text-slate-300 hover:text-[#2449B5] dark:hover:text-white rounded-lg transition-colors"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <Link
              to="/wishlist"
              aria-label="Wishlist"
              className="hidden sm:inline-flex relative p-2 text-slate-600 dark:text-slate-300 hover:text-[#2449B5] dark:hover:text-white rounded-lg transition-colors"
            >
              <Heart className="w-4 h-4" />
              {wishlist.length > 0 && (
                <span className="absolute top-1 right-1 text-[10px] font-mono-tabular font-semibold text-[#2449B5] dark:text-blue-400">
                  {wishlist.length}
                </span>
              )}
            </Link>

            {user && (
              <Link
                to="/notifications"
                aria-label="Notifications"
                className="hidden sm:inline-flex relative p-2 text-slate-600 dark:text-slate-300 hover:text-[#2449B5] dark:hover:text-white rounded-lg transition-colors"
              >
                <Bell className="w-4 h-4" />
                {unreadNotifications > 0 && (
                  <span className="absolute top-1 right-1 text-[10px] font-mono-tabular font-semibold text-[#2449B5] dark:text-blue-400">
                    {unreadNotifications}
                  </span>
                )}
              </Link>
            )}

            <Link
              to={user ? '/profile' : '/login'}
              aria-label={user ? 'Account profile' : 'Sign in'}
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:text-[#2449B5] dark:hover:text-white rounded-lg border border-slate-200 dark:border-slate-800 whitespace-nowrap shrink-0 transition-colors"
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span>{user ? (user.displayName?.split(' ')[0] || 'Account') : 'Sign In'}</span>
            </Link>

            <button
              type="button"
              onClick={() => setCartDrawerOpen(true)}
              className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 min-h-[38px] text-xs font-semibold text-white bg-[#2449B5] hover:bg-[#1b3891] rounded-lg whitespace-nowrap shrink-0 transition-colors"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Bag</span>
              <span className="font-mono-tabular">({cartCount})</span>
            </button>
          </div>
        </div>

        {/* Expandable Search Bar */}
        {searchOpen && (
          <div className="border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D1526] px-4 sm:px-6 lg:px-8 py-3">
            <form onSubmit={handleSearchSubmit} className="max-w-3xl mx-auto flex items-center gap-2 sm:gap-3">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="search"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search All Home & Kitchen Products"
                className="w-full min-w-0 bg-transparent text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none py-1.5"
              />
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold bg-[#2449B5] hover:bg-[#1b3891] text-white rounded-md whitespace-nowrap shrink-0 transition-colors"
              >
                Search
              </button>
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                aria-label="Close search"
                className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}
      </header>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative w-72 max-w-[85vw] bg-white dark:bg-[#0D1526] h-full flex flex-col border-r border-slate-200 dark:border-slate-800 p-6 overflow-y-auto">
            <div className="flex items-center justify-between pb-6 border-b border-slate-200 dark:border-slate-800">
              <div className="inline-flex items-center gap-2">
                <img
                  src="/assets/rf-logo-royal-blue.png"
                  alt="ROYAL FLASK Monogram"
                  className="h-6 w-auto object-contain shrink-0"
                />
                <span className="font-display text-xl font-bold text-[#2449B5]">
                  ROYAL FLASK
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close menu"
                className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="py-6 flex flex-col gap-3 text-sm font-medium">
              {navLinks.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2 text-slate-700 dark:text-slate-200 hover:text-[#2449B5] dark:hover:text-blue-400"
                >
                  {item.label}
                </Link>
              ))}
              <Link
                to="/wishlist"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2 text-slate-700 dark:text-slate-200 hover:text-[#2449B5]"
              >
                Wishlist ({wishlist.length})
              </Link>
              <Link
                to="/addresses"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2 text-slate-700 dark:text-slate-200 hover:text-[#2449B5]"
              >
                Saved Addresses
              </Link>
              <Link
                to="/about"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2 text-slate-700 dark:text-slate-200 hover:text-[#2449B5]"
              >
                About Us
              </Link>
              <Link
                to="/settings"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2 text-slate-700 dark:text-slate-200 hover:text-[#2449B5]"
              >
                Settings
              </Link>
              {isAdmin && (
                <Link
                  to="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2 font-semibold text-[#2449B5] dark:text-blue-400"
                >
                  Admin Dashboard
                </Link>
              )}
            </nav>

            <div className="mt-auto pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-3">
              <Link
                to={user ? '/profile' : '/login'}
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-2.5 px-4 text-center text-xs font-semibold text-white bg-[#2449B5] hover:bg-[#1b3891] rounded-lg transition-colors"
              >
                {user ? 'My Account' : 'Sign In / Register'}
              </Link>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
