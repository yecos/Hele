'use client';

import { useEffect, useState } from 'react';
import { WifiOff, RefreshCw, Home } from 'lucide-react';

export function OfflinePage() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    setIsOffline(!navigator.onLine);

    const goOnline = () => setIsOffline(false);
    const goOffline = () => setIsOffline(true);

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-[#0a0a0a] flex items-center justify-center px-4">
      {/* Background glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-red-600/5 rounded-full blur-[128px]" />
      </div>

      <div className="relative text-center max-w-sm">
        {/* Icon */}
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-white/5 mb-6">
          <WifiOff size={40} className="text-red-500" />
        </div>

        {/* Logo */}
        <div className="mb-2">
          <span className="text-2xl font-bold text-white">Xuper<span className="text-red-500">Stream</span></span>
        </div>

        {/* Message */}
        <h2 className="text-xl font-bold text-white mb-2">Sin conexión</h2>
        <p className="text-gray-400 text-sm mb-8 leading-relaxed">
          No hay conexión a internet. Verifica tu red y vuelve a intentar.
        </p>

        {/* Retry button */}
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-semibold transition-all hover:scale-105 active:scale-95 shadow-lg shadow-red-600/20"
        >
          <RefreshCw size={18} />
          Reintentar
        </button>

        {/* Hint */}
        <p className="text-gray-600 text-xs mt-6">
          El contenido previamente visitado puede estar disponible en caché.
        </p>
      </div>
    </div>
  );
}
