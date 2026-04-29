'use client';

import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useViewStore, usePlayerStore, useAuthStore } from '@/lib/store';
import { Navbar } from '@/components/streaming/Navbar';
import { VideoPlayer } from '@/components/streaming/VideoPlayer';
import { LoginView } from '@/components/views/LoginView';
import { OfflinePage } from '@/components/views/OfflinePage';

const HomeView = dynamic(() => import('@/components/views/HomeView').then(m => ({ default: m.HomeView })), { ssr: false, loading: () => <ViewSkeleton /> });
const MoviesView = dynamic(() => import('@/components/views/MoviesView').then(m => ({ default: m.MoviesView })), { ssr: false, loading: () => <ViewSkeleton /> });
const SeriesView = dynamic(() => import('@/components/views/SeriesView').then(m => ({ default: m.SeriesView })), { ssr: false, loading: () => <ViewSkeleton /> });
const IPTVView = dynamic(() => import('@/components/views/IPTVView').then(m => ({ default: m.IPTVView })), { ssr: false, loading: () => <ViewSkeleton /> });
const SearchView = dynamic(() => import('@/components/views/SearchView').then(m => ({ default: m.SearchView })), { ssr: false, loading: () => <ViewSkeleton /> });
const FavoritesView = dynamic(() => import('@/components/views/FavoritesView').then(m => ({ default: m.FavoritesView })), { ssr: false, loading: () => <ViewSkeleton /> });
const HistoryView = dynamic(() => import('@/components/views/HistoryView').then(m => ({ default: m.HistoryView })), { ssr: false, loading: () => <ViewSkeleton /> });
const SettingsView = dynamic(() => import('@/components/views/SettingsView').then(m => ({ default: m.SettingsView })), { ssr: false, loading: () => <ViewSkeleton /> });

function ViewSkeleton() {
  return (
    <div className="pt-20 px-4 max-w-[1400px] mx-auto">
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-48 bg-white/5 rounded-lg" />
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] bg-white/5 rounded-xl" />
          ))}
        </div>
        <div className="h-8 w-56 bg-white/5 rounded-lg" />
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] bg-white/5 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  const { currentView, setView } = useViewStore();
  const { isPlaying, closePlayer } = usePlayerStore();
  const { isLoggedIn, checkAuth } = useAuthStore();

  // Check auth on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;

      switch (e.key) {
        case '/':
          e.preventDefault();
          setView('search');
          break;
        case 'Escape':
          if (isPlaying) {
            closePlayer();
          }
          break;
        case 'h':
          if (!e.ctrlKey && !e.metaKey) setView('home');
          break;
        case 'f':
          if (!e.ctrlKey && !e.metaKey) setView('favorites');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, setView, closePlayer]);

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
      <div className={`transition-opacity duration-300 ${isPlaying ? 'pointer-events-none opacity-30' : 'opacity-100'}`}>
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
