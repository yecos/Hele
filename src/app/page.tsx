'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useViewStore, usePlayerStore, useAuthStore } from '@/lib/store';
import { Navbar } from '@/components/streaming/Navbar';
import { VideoPlayer } from '@/components/streaming/VideoPlayer';
import { LoginView } from '@/components/views/LoginView';
import { OfflinePage } from '@/components/views/OfflinePage';
import { ViewTransition, FavoritesHearts } from '@/components/ViewTransition';
import { OnboardingTutorial } from '@/components/OnboardingTutorial';
import { X } from 'lucide-react';
import { useT } from '@/lib/i18n';

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

function MainApp() {
  const { currentView, setView } = useViewStore();
  const { isPlaying, closePlayer } = usePlayerStore();
  const { t } = useT();
  const [showShortcuts, setShowShortcuts] = useState(false);

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
        case '?':
          e.preventDefault();
          setShowShortcuts(s => !s);
          break;
        case 'Escape':
          if (isPlaying) {
            closePlayer();
          }
          if (showShortcuts) {
            setShowShortcuts(false);
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
  }, [isPlaying, setView, closePlayer, showShortcuts]);

  const renderView = () => {
    switch (currentView) {
      case 'home':
        return <HomeView />;
      case 'movies':
        return <MoviesView />;
      case 'series':
        return <SeriesView />;
      case 'iptv':
        return <IPTVView />;
      case 'search':
        return <SearchView />;
      case 'favorites':
        return <FavoritesView />;
      case 'history':
        return <HistoryView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <HomeView />;
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <OfflinePage />
      <Navbar />
      <VideoPlayer />

      {/* Main content with view transitions */}
      <div className={`transition-opacity duration-300 ${isPlaying ? 'pointer-events-none opacity-30' : 'opacity-100'}`}>
        {/* Floating hearts for favorites view */}
        {currentView === 'favorites' && <FavoritesHearts />}

        <ViewTransition view={currentView}>
          {renderView()}
        </ViewTransition>
      </div>

      {/* Keyboard shortcuts help button */}
      <button
        onClick={() => setShowShortcuts(true)}
        className="fixed bottom-6 right-6 z-30 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-gray-400 hover:text-white items-center justify-center transition-all backdrop-blur-sm text-sm font-bold border border-white/10 hidden md:flex"
        title={t('shortcuts.buttonTitle')}
      >
        ?
      </button>

      {/* Keyboard shortcuts modal */}
      {showShortcuts && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setShowShortcuts(false)}>
          <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 w-[90vw] max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-white font-bold text-lg">{t('shortcuts.title')}</h2>
              <button onClick={() => setShowShortcuts(false)} className="p-1 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-all">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3">
              {[
                { key: '/', desc: t('shortcuts.search') },
                { key: 'H', desc: t('shortcuts.goHome') },
                { key: 'F', desc: t('shortcuts.goFavorites') },
                { key: '?', desc: t('shortcuts.showShortcuts') },
                { key: 'Esc', desc: t('shortcuts.closePlayer') },
              ].map(s => (
                <div key={s.key} className="flex items-center justify-between">
                  <span className="text-gray-300 text-sm">{s.desc}</span>
                  <kbd className="bg-white/10 text-white px-2.5 py-1 rounded-lg text-xs font-mono border border-white/10">{s.key}</kbd>
                </div>
              ))}
            </div>
            <p className="text-gray-600 text-xs mt-5 text-center">{t('shortcuts.hint')}</p>
          </div>
        </div>
      )}
    </main>
  );
}

export default function Page() {
  const { isLoggedIn, checkAuth } = useAuthStore();
  const [onboardingDone, setOnboardingDone] = useState(() => {
    try {
      return localStorage.getItem('xs-onboarding-done') === '1';
    } catch {
      return true;
    }
  });

  // Check auth on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const handleOnboardingComplete = useCallback(() => {
    setOnboardingDone(true);
  }, []);

  // Show login screen if not authenticated
  if (!isLoggedIn) {
    return <LoginView />;
  }

  // Show onboarding if not completed
  if (!onboardingDone) {
    return <OnboardingTutorial onComplete={handleOnboardingComplete} />;
  }

  return <MainApp />;
}
