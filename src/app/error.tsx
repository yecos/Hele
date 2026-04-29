'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[App Error]', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-red-600/20 flex items-center justify-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Error inesperado</h2>
          <p className="text-gray-400 text-sm">Ocurri&oacute; un error al cargar la aplicaci&oacute;n.</p>
          <p className="text-gray-600 text-xs mt-2 font-mono break-all">
            {error.message || 'Error desconocido'}
          </p>
          {error.digest && (
            <p className="text-gray-700 text-xs mt-1">Digest: {error.digest}</p>
          )}
        </div>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors"
          >
            Reintentar
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-colors"
          >
            Recargar
          </button>
        </div>
      </div>
    </div>
  );
}
