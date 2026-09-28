'use client';

import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import {
  type ViewType,
  useAuthStore,
  usePlayerStore,
  useViewStore,
} from '@/lib/store';
import { Navbar } from '@/components/streaming/Navbar';
import { VideoPlayer } from '@/components/streaming/VideoPlayer';
import { LoginView } from '@/components/views/LoginView';
import { OfflinePage } from '@/components/views/OfflinePage';
import { ViewTransition, FavoritesHearts } from '@/components/ViewTransition';
import { OnboardingTutorial } from '@/components/OnboardingTutorial';
import { X } from 'lucide-react';
import { useT } from '@/lib/i18n';

const HomeView = dynamic(
  () => import('@/components/views/HomeView').then((module) => ({ default: module.HomeView })),
  { ssr: false, loading: () => <ViewSkeleton /> }
);
const MoviesView = dynamic(
  () => import('@/components/views/MoviesView').then((module) => ({ default: module.MoviesView })),
  { ssr: false, loading: () => <ViewSkeleton /> }
);
const SeriesView = dynamic(
  () => import('@/components/views/SeriesView').then((module) => ({ default: module.SeriesView })),
  { ssr: false, loading: () => <ViewSkeleton /> }
);
const IPTVView = dynamic(
  () => import('@/components/views/IPTVView').then((module) => ({ default: module.IPTVView })),
  { ssr: false, loading: () => <ViewSkeleton /> }
);
const SearchView = dynamic(
  () => import('@/components/views/SearchView').then((module) => ({ default: module.SearchView })),
  { ssr: false, loading: () => <ViewSkeleton /> }
);
const FavoritesView = dynamic(
  () => import('@/components/views/FavoritesView').then((module) => ({ default: module.FavoritesView })),
  { ssr: false, loading: () => <ViewSkeleton /> }
);
const HistoryView = dynamic(
  () => import('@/components/views/HistoryView').then((module) => ({ default: module.HistoryView })),
  { ssr: false, loading: () => <ViewSkeleton /> }
);
const SettingsView = dynamic(
  () => import('@/components/views/SettingsView').then((module) => ({ default: module.SettingsView })),
  { ssr: false, loading: () => <ViewSkeleton /> }
);
const LibraryView = dynamic(
  () => import('@/components/views/LibraryView').then((module) => ({ default: module.LibraryView })),
  { ssr: false, loading: () => <ViewSkeleton /> }
);

function ViewSkeleton() {
  return (
    <div className="pt-20 px-4 max-w-[1400px] mx-auto">
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-48 bg-white/5 rounded-lg" />
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-4">
          {Array.from({ length: 7 }).map((_, index) => (
            <div key={index} className="aspect-[2/3] bg-white/5 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

function RouteContent({ view }: { view: ViewType }) {
  switch (view) {
    case 'movies':
      return <MoviesView />;
    case 'series':
      return <SeriesView />;
    case 'iptv':
      return <IPTVView />;
    case 'search':
      return <SearchView />;
    case 'history':
      return <HistoryView />;
    case 'favorites':
      return <FavoritesView />;
    case 'library':
      return <LibraryView />;
    case 'settings':
      return <SettingsView />;
    case 'home':
    default:
      return <HomeView />;
  }
}

function AuthenticatedRoute({ view }: { view: ViewType }) {
  const router = useRouter();
  const { isPlaying, closePlayer } = usePlayerStore();
  const { t } = useT();
  const [showShortcuts, setShowShortcuts] = useState(false);

  useEffect(() => {
    useViewStore.setState({ currentView: view });

    if (view === 'search' && typeof window !== 'undefined') {
      const query = new URLSearchParams(window.location.search).get('q');
      if (query) {
        useViewStore.setState({ searchQuery: query });
      }
    }
  }, [view]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      switch (event.key) {
        case '/':
          event.preventDefault();
          router.push('/search');
          break;
        case '?':
          event.preventDefault();
          setShowShortcuts((current) => !current);
          break;
        case 'Escape':
          if (isPlaying) closePlayer();
          if (showShortcuts) setShowShortcuts(false);
          break;
        case 'h':
          if (!event.ctrlKey && !event.metaKey) router.push('/');
          break;
        case 'f':
          if (!event.ctrlKey && !event.metaKey) router.push('/favorites');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closePlayer, isPlaying, router, showShortcuts]);

  return (
    <main className="min-h-screen bg-background">
      <OfflinePage />
      <Navbar />
      <VideoPlayer />

      {view === 'iptv' ? (
        <IPTVView />
      ) : (
        <div
          className={`transition-opacity duration-300 ${
            isPlaying ? 'pointer-events-none opacity-30' : 'opacity-100'
          }`}
        >
          {(view === 'favorites' || view === 'library') && <FavoritesHearts />}
          <ViewTransition view={view}>
            <RouteContent view={view} />
          </ViewTransition>
        </div>
      )}

      <button
        onClick={() => setShowShortcuts(true)}
        className="fixed bottom-6 right-6 z-30 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-gray-400 hover:text-white items-center justify-center transition-all backdrop-blur-sm text-sm font-bold border border-white/10 hidden md:flex"
        title={t('shortcuts.buttonTitle')}
      >
        ?
      </button>

      {showShortcuts && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setShowShortcuts(false)}
        >
          <div
            className="bg-gray-900 border border-white/10 rounded-2xl p-6 w-[90vw] max-w-sm shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-white font-bold text-lg">{t('shortcuts.title')}</h2>
              <button
                onClick={() => setShowShortcuts(false)}
                className="p-1 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-all"
              >
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
              ].map((shortcut) => (
                <div key={shortcut.key} className="flex items-center justify-between">
                  <span className="text-gray-300 text-sm">{shortcut.desc}</span>
                  <kbd className="bg-white/10 text-white px-2.5 py-1 rounded-lg text-xs font-mono border border-white/10">
                    {shortcut.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export function HeleRoutePage({ view }: { view: ViewType }) {
  const { isLoggedIn, checkAuth } = useAuthStore();
  const [onboardingDone, setOnboardingDone] = useState(() => {
    try {
      return localStorage.getItem('xs-onboarding-done') === '1';
    } catch {
      return true;
    }
  });

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const handleOnboardingComplete = useCallback(() => {
    setOnboardingDone(true);
  }, []);

  if (!isLoggedIn) {
    return <LoginView />;
  }

  if (!onboardingDone) {
    return <OnboardingTutorial onComplete={handleOnboardingComplete} />;
  }

  return <AuthenticatedRoute view={view} />;
}
