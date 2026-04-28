'use client';

import { Loader2 } from 'lucide-react';
import { Cast } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCastStore } from '@/lib/cast-store';

interface CastButtonProps {
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Extra class names */
  className?: string;
  /** Hide when no devices available */
  showOnlyWhenAvailable?: boolean;
  /** Action to perform when clicked (defaults to nothing — parent handles cast logic) */
  onClick?: () => void;
}

const sizeClasses = {
  sm: 'h-7 w-7',
  md: 'h-8 w-8',
  lg: 'h-9 w-9',
};

const iconSizes = {
  sm: 'h-3 w-3',
  md: 'h-3.5 w-3.5',
  lg: 'h-4 w-4',
};

export default function CastButton({
  size = 'md',
  className = '',
  showOnlyWhenAvailable = true,
  onClick,
}: CastButtonProps) {
  const { available, connected, loading } = useCastStore();

  // Hide if no devices and configured to hide
  if (showOnlyWhenAvailable && !available && !connected) return null;

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      disabled={loading || (!available && !connected)}
      className={`p-0 rounded-full transition-all ${
        connected
          ? 'text-blue-400 hover:bg-blue-400/20'
          : available
            ? 'text-white hover:bg-white/20'
            : 'text-gray-500 hover:bg-white/5'
      } ${sizeClasses[size]} ${className}`}
      title={
        connected
          ? 'Chromecast conectado'
          : available
            ? 'Enviar a Chromecast'
            : 'No hay dispositivos Chromecast'
      }
    >
      {loading ? (
        <Loader2 className={`${iconSizes[size]} animate-spin`} />
      ) : (
        <Cast className={iconSizes[size]} />
      )}
    </Button>
  );
}
