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
import { HistoryView } from '@/components/views/HistoryView';
import { SettingsView } from '@/components/views/SettingsView';

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
        {currentView === 'settings' && <SettingsView />}
        {currentView === 'history' && <HistoryView />}
      </div>
    </main>
  );
}
