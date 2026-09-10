import { useEffect, useState } from 'react';

interface AnimatedCheckmarkProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'emerald' | 'orange';
  onComplete?: () => void;
  className?: string;
}

export function AnimatedCheckmark({
  size = 'md',
  variant = 'emerald',
  onComplete,
  className = '',
}: AnimatedCheckmarkProps) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(media.matches);

    const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete?.();
    }, prefersReducedMotion ? 100 : 900);
    return () => clearTimeout(timer);
  }, [onComplete, prefersReducedMotion]);

  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-16 h-16',
    lg: 'w-20 h-20',
  };

  const bgClasses = {
    emerald: 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25',
    orange: 'bg-brand-500 text-white shadow-lg shadow-brand-500/25',
  };

  if (prefersReducedMotion) {
    return (
      <div
        className={`rounded-full flex items-center justify-center ${sizeClasses[size]} ${bgClasses[variant]} ${className}`}
      >
        <svg viewBox="0 0 24 24" className="w-1/2 h-1/2 stroke-current fill-none stroke-[3]">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
    );
  }

  return (
    <div
      className={`rounded-full flex items-center justify-center transition-all duration-300 ${sizeClasses[size]} ${bgClasses[variant]} ${className}`}
      style={{
        animation: 'checkScale 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
      }}
    >
      <svg
        viewBox="0 0 24 24"
        className="w-1/2 h-1/2 stroke-current fill-none stroke-[3] stroke-linecap-round stroke-linejoin-round"
      >
        <path
          d="M4 12.5L9.5 17.5L20 6.5"
          style={{
            strokeDasharray: 30,
            strokeDashoffset: 30,
            animation: 'drawCheck 0.5s ease-out 0.2s forwards',
          }}
        />
      </svg>
      <style>{`
        @keyframes checkScale {
          0% { transform: scale(0.6); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes drawCheck {
          0% { stroke-dashoffset: 30; }
          100% { stroke-dashoffset: 0; }
        }
      `}</style>
    </div>
  );
}

interface ConfettiBurstProps {
  count?: number;
  className?: string;
}

export function ConfettiBurst({ count = 16, className = '' }: ConfettiBurstProps) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(media.matches);
  }, []);

  if (prefersReducedMotion) return null;

  // Curated palette: brand orange + emerald green accents
  const colors = ['#f97316', '#fb923c', '#10b981', '#34d399', '#f59e0b', '#fdba74'];

  const particles = Array.from({ length: count }).map((_, i) => {
    const angle = (i / count) * 360;
    const distance = 48 + (i % 3) * 16;
    const rad = (angle * Math.PI) / 180;
    const x = Math.cos(rad) * distance;
    const y = Math.sin(rad) * distance;
    const size = 5 + (i % 3) * 2;
    const color = colors[i % colors.length];
    const isSquare = i % 2 === 0;

    return { id: i, x, y, size, color, isSquare };
  });

  return (
    <div className={`absolute inset-0 pointer-events-none flex items-center justify-center ${className}`}>
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute opacity-0"
          style={{
            width: `${p.size}px`,
            height: `${p.isSquare ? p.size : p.size * 1.5}px`,
            backgroundColor: p.color,
            borderRadius: p.isSquare ? '2px' : '999px',
            animation: `confettiBurst 1.2s cubic-bezier(0.25, 1, 0.5, 1) forwards`,
            transform: `translate(${p.x}px, ${p.y}px) rotate(${p.id * 45}deg)`,
          }}
        />
      ))}
      <style>{`
        @keyframes confettiBurst {
          0% {
            opacity: 1;
            transform: translate(0, 0) scale(0);
          }
          30% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translate(var(--tw-translate-x, 0), var(--tw-translate-y, 0)) scale(1.1);
          }
        }
      `}</style>
    </div>
  );
}
