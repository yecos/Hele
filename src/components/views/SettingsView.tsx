'use client';

import { useFavoritesStore } from '@/lib/store';
import { Heart, Trash2 } from 'lucide-react';

export function SettingsView() {
  const clearFavorites = () => {
    if (confirm('¿Borrar toda la lista de favoritos?')) {
      localStorage.removeItem('xuper-favorites');
      window.location.reload();
    }
  };

  const clearHistory = () => {
    if (confirm('¿Borrar todo el historial?')) {
      localStorage.removeItem('xuper-history');
      window.location.reload();
    }
  };

  const clearData = () => {
    if (confirm('¿Borrar TODOS los datos locales? (favoritos, historial, sesión)')) {
      localStorage.removeItem('xuper-favorites');
      localStorage.removeItem('xuper-history');
      localStorage.removeItem('xs-auth');
      window.location.reload();
    }
  };

  return (
    <div className="pt-20 px-4 max-w-[600px] mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Ajustes</h1>

      <div className="space-y-4">
        {/* About */}
        <div className="bg-white/5 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="XuperStream" className="w-10 h-10" />
            <div>
              <h2 className="text-white font-semibold text-base">XuperStream</h2>
              <p className="text-gray-500 text-xs">Versión 0.2.0</p>
            </div>
          </div>
          <p className="text-gray-400 text-sm leading-relaxed">
            XuperStream es tu plataforma personal de streaming. Disfruta de películas, series y canales en vivo desde un solo lugar.
          </p>
        </div>

        {/* Servers */}
        <div className="bg-white/5 rounded-xl p-6 space-y-3">
          <h2 className="text-white font-semibold text-base flex items-center gap-2">
            <span className="text-red-500">●</span> Servidores
          </h2>
          <div className="space-y-2">
            {[
              { name: 'VidSrc IO', url: 'vidsrc.io', status: 'Activo' },
              { name: 'VidLink', url: 'vidlink.pro', status: 'Activo' },
              { name: 'MoviesAPI', url: 'moviesapi.to', status: 'Activo' },
              { name: 'MoviesAPI Club', url: 'moviesapi.club', status: 'Backup' },
              { name: 'VidSrc PM', url: 'vidsrc.pm', status: 'Backup' },
            ].map(server => (
              <div key={server.name} className="flex items-center justify-between text-sm">
                <span className="text-gray-300">{server.name}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  server.status === 'Activo'
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-white/5 text-gray-500'
                }`}>
                  {server.status}
                </span>
              </div>
            ))}
          </div>
          <p className="text-gray-500 text-xs">Se cargan automáticamente al reproducir contenido.</p>
        </div>

        {/* IPTV */}
        <div className="bg-white/5 rounded-xl p-6 space-y-3">
          <h2 className="text-white font-semibold text-base flex items-center gap-2">
            <span className="text-red-500">●</span> IPTV
          </h2>
          <p className="text-gray-400 text-sm">Canales en vivo verificados de Colombia y el mundo.</p>
          <div className="text-gray-500 text-xs space-y-1">
            <p>Fuentes: iptv-org, TDTChannels</p>
            <p>Solo se muestran canales funcionales.</p>
          </div>
        </div>

        {/* Chromecast */}
        <div className="bg-white/5 rounded-xl p-6 space-y-3">
          <h2 className="text-white font-semibold text-base flex items-center gap-2">
            <span className="text-red-500">●</span> Chromecast
          </h2>
          <p className="text-gray-400 text-sm">Envía películas, series y canales IPTV a tu TV.</p>
          <div className="text-gray-500 text-xs space-y-1">
            <p>Soporte HLS nativo para IPTV.</p>
            <p>Busca el ícono de Cast en la barra superior.</p>
          </div>
        </div>

        {/* PWA */}
        <div className="bg-white/5 rounded-xl p-6 space-y-3">
          <h2 className="text-white font-semibold text-base flex items-center gap-2">
            <span className="text-red-500">●</span> App Instalable (PWA)
          </h2>
          <p className="text-gray-400 text-sm">Instalable como app en Android, iOS y Desktop.</p>
          <div className="text-gray-500 text-xs space-y-1">
            <p>Funciona sin conexión con contenido en caché.</p>
            <p>Compatible con Chrome, Safari, Edge y Firefox.</p>
          </div>
        </div>

        {/* Data source */}
        <div className="bg-white/5 rounded-xl p-6 space-y-3">
          <h2 className="text-white font-semibold text-base flex items-center gap-2">
            <span className="text-red-500">●</span> Datos
          </h2>
          <p className="text-gray-400 text-sm">Metadatos proporcionados por TMDB (The Movie Database).</p>
        </div>

        {/* Storage management */}
        <div className="bg-white/5 rounded-xl p-6 space-y-3">
          <h2 className="text-white font-semibold text-base flex items-center gap-2">
            <span className="text-red-500">●</span> Almacenamiento
          </h2>
          <p className="text-gray-400 text-sm">Tus datos se guardan localmente en tu navegador.</p>
          <div className="space-y-2 pt-2">
            <button
              onClick={clearFavorites}
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-red-400 transition-colors"
            >
              <Heart size={14} />
              Borrar favoritos
            </button>
            <button
              onClick={clearHistory}
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-red-400 transition-colors"
            >
              <Trash2 size={14} />
              Borrar historial
            </button>
            <button
              onClick={clearData}
              className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 transition-colors font-medium"
            >
              Borrar todos los datos
            </button>
          </div>
        </div>
      </div>

      <div className="h-20" />
    </div>
  );
}
