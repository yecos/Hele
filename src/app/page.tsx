'use client';

import { useViewStore, usePlayerStore } from '@/lib/store';
import { Navbar } from '@/components/streaming/Navbar';
import { VideoPlayer } from '@/components/streaming/VideoPlayer';
import { MovieDetailModal } from '@/components/streaming/MovieDetailModal';
import { HomeView } from '@/components/views/HomeView';
import { SearchView } from '@/components/views/SearchView';
import { FavoritesView } from '@/components/views/FavoritesView';

export default function Page() {
  const { currentView } = useViewStore();
  const { isPlaying } = usePlayerStore();

  return (
    <main className="min-h-screen bg-[#0a0a0a]">
      <Navbar />
      <VideoPlayer />

      {/* Main content */}
      <div className={isPlaying ? 'pointer-events-none opacity-30' : ''}>
        {currentView === 'home' && <HomeView />}
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
                  MoviesAPI, VidSrc PM, VidSrc IO, VidLink
                </p>
                <p className="text-gray-500 text-xs mt-1">
                  Los servidores se cargan automáticamente al reproducir contenido.
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
