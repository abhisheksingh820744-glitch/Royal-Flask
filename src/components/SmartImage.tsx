import { useState } from 'react';
import { Package } from 'lucide-react';

interface SmartImageProps {
  src?: string;
  alt: string;
  className?: string;
  fallbackTitle?: string;
}

export function SmartImage({ src, alt, className = '', fallbackTitle }: SmartImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 via-slate-200 to-slate-100 dark:from-[#0D1526] dark:via-[#131E36] dark:to-[#0A1120] text-slate-400 dark:text-slate-500 p-4 text-center ${className}`}
        role="img"
        aria-label={alt}
      >
        <Package className="w-8 h-8 mb-2 opacity-60" />
        <span className="text-xs font-medium tracking-wide text-slate-500 dark:text-slate-400 line-clamp-2">
          {fallbackTitle || alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
      loading="lazy"
    />
  );
}
