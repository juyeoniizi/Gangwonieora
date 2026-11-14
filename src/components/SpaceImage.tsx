import { useState } from 'react';
import { Building2 } from 'lucide-react';

interface SpaceImageProps {
  src: string;
  alt: string;
  className?: string;
}

export function SpaceImage({ src, alt, className = '' }: SpaceImageProps) {
  const [hasError, setHasError] = useState(false);

  if (hasError || !src) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 via-slate-50 to-emerald-50/60 text-slate-400 ${className}`}
        role="img"
        aria-label={alt}
      >
        <Building2 className="w-7 h-7 text-slate-400 mb-1.5" strokeWidth={1.5} />
        <span className="text-xs font-medium text-slate-500 px-3 text-center truncate max-w-full">
          {alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={className}
    />
  );
}
