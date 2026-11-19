import { Link } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { buildWhatsAppUrl } from '../lib/formatters';

export function Footer() {
  const { settings, categories } = useStore();
  const activeCategories = categories.filter((c) => c.active).slice(0, 6);
  const whatsappLink = buildWhatsAppUrl(settings.whatsappNumber, settings.whatsappGreeting);

  return (
    <footer className="bg-slate-50 dark:bg-[#0D1526] border-t border-slate-200 dark:border-slate-800/80 text-slate-600 dark:text-slate-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand Column */}
          <div>
            <Link to="/" className="inline-flex items-center gap-2.5">
              <img
                src="/assets/rf-logo-royal-blue.png"
                alt="ROYAL FLASK Monogram"
                className="h-7 w-auto object-contain shrink-0"
              />
              <span className="font-display text-2xl font-bold text-[#2449B5]">
                ROYAL FLASK
              </span>
            </Link>
            <p className="mt-3 text-sm leading-relaxed">
              Precision-engineered hydration flasks, heritage cookware, and architectural home &amp; kitchen essentials
              designed for modern Indian households.
            </p>
            <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
              royalflask.in · Currency: INR (₹) · Pan-India Delivery
            </p>
          </div>

          {/* Categories */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#0B1D3A] dark:text-white mb-4">
              Departments
            </h3>
            <ul className="space-y-2.5 text-sm">
              {activeCategories.map((cat) => (
                <li key={cat.id}>
                  <Link
                    to={`/category/${cat.slug}`}
                    className="hover:text-[#2449B5] dark:hover:text-blue-400 transition-colors"
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link to="/categories" className="font-medium text-[#2449B5] dark:text-blue-400 hover:underline">
                  View all categories
                </Link>
              </li>
            </ul>
          </div>

          {/* Customer Care */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#0B1D3A] dark:text-white mb-4">
              Customer Care
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/track-order" className="hover:text-[#2449B5] dark:hover:text-blue-400 transition-colors">
                  Track Order
                </Link>
              </li>
              <li>
                <Link to="/orders" className="hover:text-[#2449B5] dark:hover:text-blue-400 transition-colors">
                  My Orders
                </Link>
              </li>
              <li>
                <Link to="/support" className="hover:text-[#2449B5] dark:hover:text-blue-400 transition-colors">
                  Customer Support
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-[#2449B5] dark:hover:text-blue-400 transition-colors">
                  Contact Us
                </Link>
              </li>
              <li>
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#2449B5] dark:hover:text-blue-400 transition-colors"
                >
                  WhatsApp Concierge
                </a>
              </li>
            </ul>
          </div>

          {/* Policies & About */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#0B1D3A] dark:text-white mb-4">
              Company &amp; Policies
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/about" className="hover:text-[#2449B5] dark:hover:text-blue-400 transition-colors">
                  About Royal Flask
                </Link>
              </li>
              <li>
                <Link to="/shipping-policy" className="hover:text-[#2449B5] dark:hover:text-blue-400 transition-colors">
                  Shipping Policy
                </Link>
              </li>
              <li>
                <Link
                  to="/return-refund-policy"
                  className="hover:text-[#2449B5] dark:hover:text-blue-400 transition-colors"
                >
                  Return &amp; Refund Policy
                </Link>
              </li>
              <li>
                <Link to="/privacy-policy" className="hover:text-[#2449B5] dark:hover:text-blue-400 transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  to="/terms-and-conditions"
                  className="hover:text-[#2449B5] dark:hover:text-blue-400 transition-colors"
                >
                  Terms &amp; Conditions
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <p>© {new Date().getFullYear()} ROYAL FLASK India. All rights reserved.</p>
          <p>
            Support: <span className="text-slate-900 dark:text-slate-200">{settings.supportEmail}</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
