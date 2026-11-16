import { useEffect, useState } from 'react';
import { ImageOff } from 'lucide-react';

interface ResilientImageProps {
  src?: string;
  fallbackSrc?: string;
  alt: string;
  className?: string;
  fallbackTitle?: string;
  isDark?: boolean;
}

export function ResilientImage({
  src,
  fallbackSrc,
  alt,
  className = '',
  fallbackTitle,
  isDark = false,
}: ResilientImageProps) {
  const [activeSrc, setActiveSrc] = useState<string | undefined>(src);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setActiveSrc(src);
    setFailed(false);
  }, [src, fallbackSrc]);

  const handleError = () => {
    if (fallbackSrc && activeSrc !== fallbackSrc) {
      setActiveSrc(fallbackSrc);
    } else {
      setFailed(true);
    }
  };

  if (!activeSrc || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-2 p-6 text-center ${
          isDark
            ? 'bg-zinc-900 text-zinc-400 border border-white/10'
            : 'bg-stone-100 text-stone-500 border border-stone-200'
        } ${className}`}
        role="img"
        aria-label={alt}
      >
        <ImageOff className="w-6 h-6 opacity-60" strokeWidth={1.5} />
        {fallbackTitle && (
          <span className="text-xs font-medium max-w-[26ch] line-clamp-2 opacity-80">
            {fallbackTitle}
          </span>
        )}
      </div>
    );
  }

  return (
    <img
      src={activeSrc}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={handleError}
      className={className}
    />
  );
}
