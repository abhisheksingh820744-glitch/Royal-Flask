import { useState } from 'react';
import { ExternalLink, MessageCircle, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { buildWhatsAppUrl } from '../lib/formatters';

export function WhatsAppFloat() {
  const { settings } = useStore();
  const [open, setOpen] = useState(false);
  const [customNote, setCustomNote] = useState('');

  const message = customNote.trim()
    ? `${settings.whatsappGreeting}\n\nMy enquiry: ${customNote.trim()}`
    : settings.whatsappGreeting;

  const waUrl = buildWhatsAppUrl(settings.whatsappNumber, message);

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3">
      {open && (
        <div className="w-80 max-w-[calc(100vw-2.5rem)] bg-white dark:bg-[#0D1526] border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-4">
          <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                WhatsApp Business Concierge
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Confirm your message below to open WhatsApp directly.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close WhatsApp support box"
              className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-3 space-y-3">
            <textarea
              rows={3}
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder="Ask about product sizing, bulk gifting, or an order ID..."
              className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#060911] p-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1E40AF]"
            />
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              Recipient: +{settings.whatsappNumber.replace(/\D/g, '')} (confirm sending inside WhatsApp)
            </div>
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="w-full py-2.5 px-4 inline-flex items-center justify-center gap-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors"
            >
              <span>Continue to WhatsApp</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="WhatsApp Business Support"
        className="inline-flex items-center gap-2 px-4 py-3 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white shadow-lg transition-transform hover:scale-[1.02] text-xs font-semibold"
      >
        <MessageCircle className="w-4 h-4" />
        <span className="hidden sm:inline">WhatsApp Support</span>
      </button>
    </div>
  );
}
