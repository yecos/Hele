'use client';

import { useEffect } from 'react';
import { useViewStore, usePlayerStore, useAuthStore } from '@/lib/store';
import { Navbar } from '@/components/streaming/Navbar';
import { VideoPlayer } from '@/components/streaming/VideoPlayer';
import { LoginView } from '@/components/views/LoginView';
import { OfflinePage } from '@/components/views/OfflinePage';
import { HomeView } from '@/components/views/HomeView';
import { MoviesView } from '@/components/views/MoviesView';
import { SeriesView } from '@/components/views/SeriesView';
import { IPTVView } from '@/components/views/IPTVView';
import { SearchView } from '@/components/views/SearchView';
import { FavoritesView } from '@/components/views/FavoritesView';

export default function Page() {
  const { currentView } = useViewStore();
  const { isPlaying } = usePlayerStore();
  const { isLoggedIn, checkAuth } = useAuthStore();

  // Check auth on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Show login screen if not authenticated
  if (!isLoggedIn) {
    return <LoginView />;
  }

  return (
    <main className="min-h-screen bg-background">
      <OfflinePage />
      <Navbar />
      <VideoPlayer />

      {/* Main content */}
      <div className={isPlaying ? 'pointer-events-none opacity-30' : ''}>
        {currentView === 'home' && <HomeView />}
        {currentView === 'movies' && <MoviesView />}
        {currentView === 'series' && <SeriesView />}
        {currentView === 'iptv' && <IPTVView />}
        {currentView === 'search' && <SearchView />}
        {currentView === 'favorites' && <FavoritesView />}
        {currentView === 'settings' && (
          <div className="pt-20 px-4 max-w-[600px] mx-auto">
            <h1 className="text-2xl font-bold text-white mb-6">Ajustes</h1>
            <div className="bg-white/5 rounded-xl p-6 space-y-4">
              <div>
                <h3 className="text-white font-semibold text-sm">Acerca de</h3>
                <p className="text-gray-400 text-sm mt-1">XuperStream - Tu plataforma personal de streaming</p>
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm">Servidores</h3>
                <p className="text-gray-400 text-sm mt-1">
                  VidSrc IO, VidLink, MoviesAPI
                </p>
                <p className="text-gray-500 text-xs mt-1">
                  Los servidores se cargan automáticamente al reproducir contenido.
                </p>
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm">IPTV</h3>
                <p className="text-gray-400 text-sm mt-1">Canales en vivo verificados de Colombia y el mundo</p>
                <p className="text-gray-500 text-xs mt-1">
                  Fuentes: iptv-org, TDTChannels. Solo se muestran canales funcionales.
                </p>
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm">Chromecast</h3>
                <p className="text-gray-400 text-sm mt-1">Envía películas, series y canales IPTV a tu TV</p>
                <p className="text-gray-500 text-xs mt-1">
                  Soporte nativo HLS para IPTV. Busca el ícono de Cast en la barra superior.
                </p>
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm">PWA</h3>
                <p className="text-gray-400 text-sm mt-1">Instalable como app en Android, iOS y Desktop</p>
                <p className="text-gray-500 text-xs mt-1">
                  Funciona sin conexión con contenido en caché.
                </p>
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm">Datos</h3>
                <p className="text-gray-400 text-sm mt-1">Metadatos proporcionados por TMDB (The Movie Database)</p>
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm">Mi Lista</h3>
                <p className="text-gray-400 text-sm mt-1">Guardada localmente en tu navegador</p>
                <button
                  onClick={() => {
                    if (confirm('¿Borrar toda la lista de favoritos?')) {
                      localStorage.removeItem('xuper-favorites');
                      window.location.reload();
                    }
                  }}
                  className="mt-2 text-red-400 text-xs hover:text-red-300 transition-colors"
                >
                  Borrar favoritos
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
