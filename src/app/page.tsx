'use client';

import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAppStore, Movie } from '@/lib/store';
import Navbar from '@/components/streaming/Navbar';
import HeroBanner from '@/components/streaming/HeroBanner';
import MovieRow from '@/components/streaming/MovieRow';
import MovieDetailModal from '@/components/streaming/MovieDetailModal';
import VideoPlayer from '@/components/streaming/VideoPlayer';
import SearchView from '@/components/streaming/SearchView';
import CategoryView from '@/components/streaming/CategoryView';
import FavoritesView from '@/components/streaming/FavoritesView';
import Sidebar from '@/components/streaming/Sidebar';
import AuthView from '@/components/streaming/AuthView';
import PricingView from '@/components/streaming/PricingView';
import ProfileView from '@/components/streaming/ProfileView';
import AdminView from '@/components/streaming/AdminView';
import WatchHistoryView from '@/components/streaming/WatchHistoryView';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2 } from 'lucide-react';

const CATEGORY_META: Record<string, { title: string; description: string }> = {
  peliculas: {
    title: 'Películas',
    description: 'Las mejores películas latinoamericanas y del mundo. Acción, drama, comedia y mucho más.',
  },
  series: {
    title: 'Series',
    description: 'Series originales y exclusivas que no puedes dejar de ver.',
  },
  deportes: {
    title: 'Deportes',
    description: 'Fútbol, boxeo, lucha libre y más. La mejor cobertura deportiva en vivo.',
  },
  tv: {
    title: 'TV en Vivo',
    description: 'Canales de televisión en vivo con noticias, música, animación y cine clásico.',
  },
};

export default function Home() {
  const {
    currentView,
    selectedCategory,
    isAuthenticated,
    setCurrentView,
    login,
    setUserId,
    setUserInfo,
  } = useAppStore();
  const [allMovies, setAllMovies] = useState<Movie[]>([]);
  const [featuredMovies, setFeaturedMovies] = useState<Movie[]>([]);
  const [trendingMovies, setTrendingMovies] = useState<Movie[]>([]);
  const [liveMovies, setLiveMovies] = useState<Movie[]>([]);
  const [peliculas, setPeliculas] = useState<Movie[]>([]);
  const [series, setSeries] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [authChecking, setAuthChecking] = useState(true);

  // Check auth on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            login('', data.user);
          } else {
            setCurrentView('auth');
          }
        } else {
          setCurrentView('auth');
        }
      } catch {
        setCurrentView('auth');
      } finally {
        setAuthChecking(false);
      }
    };

    checkAuth();
  }, []);

  // Fetch all movies for home view
  useEffect(() => {
    if (currentView !== 'home' || !isAuthenticated) return;

    const fetchMovies = async () => {
      setIsLoading(true);
      try {
        const [featuredRes, trendingRes, liveRes, peliculasRes, seriesRes, allRes] =
          await Promise.all([
            fetch('/api/movies?featured=true&limit=10'),
            fetch('/api/movies?trending=true&limit=15'),
            fetch('/api/movies?category=deportes&limit=10'),
            fetch('/api/movies?category=peliculas&limit=15'),
            fetch('/api/movies?category=series&limit=15'),
            fetch('/api/movies?limit=50'),
          ]);

        const [featuredData, trendingData, liveData, peliculasData, seriesData, allData] =
          await Promise.all([
            featuredRes.json(),
            trendingRes.json(),
            liveRes.json(),
            peliculasRes.json(),
            seriesRes.json(),
            allRes.json(),
          ]);

        const parseMovies = (data: Record<string, unknown>) =>
          Array.isArray(data) ? data : (data.movies as Movie[]) || [];

        setFeaturedMovies(parseMovies(featuredData));
        setTrendingMovies(parseMovies(trendingData));
        setLiveMovies(parseMovies(liveData));
        setPeliculas(parseMovies(peliculasData));
        setSeries(parseMovies(seriesData));
        setAllMovies(parseMovies(allData));
      } catch (error) {
        console.error('Error fetching movies:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMovies();
  }, [currentView, isAuthenticated]);

  // Fetch related movies when a movie is selected
  const fetchRelatedMovies = async (movie: Movie) => {
    try {
      const res = await fetch(
        `/api/movies?category=${encodeURIComponent(movie.category)}&limit=12`
      );
      if (res.ok) {
        const data = await res.json();
        const movies = Array.isArray(data) ? data : data.movies || [];
        const { useAppStore } = await import('@/lib/store');
        useAppStore.getState().setSelectedMovie(
          movie,
          movies.filter((m: Movie) => m.id !== movie.id)
        );
      }
    } catch {
      // silently fail
    }
  };

  // Watch for selected movie changes to fetch related movies
  useEffect(() => {
    const unsubscribe = useAppStore.subscribe((state, prev) => {
      if (state.selectedMovie && state.selectedMovie.id !== prev.selectedMovie?.id) {
        fetchRelatedMovies(state.selectedMovie);
      }
    });
    return unsubscribe;
  }, []);

  const handleMovieClick = (movie: Movie) => {
    fetchRelatedMovies(movie);
  };

  // Auth checking
  if (authChecking) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <Loader2 className="h-8 w-8 text-red-500 animate-spin" />
          <span className="text-xl font-black tracking-tight text-red-600">XUPER</span>
          <span className="text-[10px] font-light text-gray-500 tracking-widest uppercase">
            STREAM
          </span>
        </motion.div>
      </div>
    );
  }

  // Auth gate
  if (!isAuthenticated) {
    return <AuthView />;
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navbar */}
      <Navbar />

      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main>
        <AnimatePresence mode="wait">
          {/* Home View */}
          {currentView === 'home' && (
            <div key="home">
              {/* Hero Banner */}
              {!isLoading && featuredMovies.length > 0 && (
                <HeroBanner featuredMovies={featuredMovies.slice(0, 5)} />
              )}

              {/* Loading Skeleton for Hero */}
              {isLoading && (
                <div className="w-full h-[50vh] sm:h-[70vh] lg:h-[80vh] bg-gray-900">
                  <Skeleton className="w-full h-full" />
                </div>
              )}

              {/* Movie Rows */}
              <div className="-mt-16 sm:-mt-24 relative z-10 pb-16">
                {isLoading ? (
                  <div className="px-4 sm:px-8 md:px-12 lg:px-16 space-y-8">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i}>
                        <Skeleton className="h-7 w-48 mb-4 bg-gray-800" />
                        <div className="flex gap-3 overflow-hidden">
                          {Array.from({ length: 6 }).map((_, j) => (
                            <Skeleton
                              key={j}
                              className="w-[calc(16.666%-10px)] aspect-[2/3] rounded-lg bg-gray-800 flex-shrink-0"
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    <MovieRow
                      title="Tendencias Ahora"
                      movies={trendingMovies}
                    />
                    <MovieRow
                      title="Películas Populares"
                      movies={peliculas}
                      category="peliculas"
                    />
                    <MovieRow
                      title="Series Destacadas"
                      movies={series}
                      category="series"
                    />
                    <MovieRow
                      title="En Vivo"
                      movies={liveMovies}
                      category="deportes"
                    />
                    <MovieRow
                      title="Populares en XuperStream"
                      movies={allMovies.filter((m) => m.rating >= 8.5)}
                    />
                    <MovieRow
                      title="Nuevos Estrenos"
                      movies={allMovies.filter((m) => m.year === 2025)}
                    />
                    <MovieRow
                      title="Mejor Valoradas"
                      movies={[...allMovies].sort((a, b) => b.rating - a.rating).slice(0, 12)}
                    />
                  </>
                )}
              </div>
            </div>
          )}

          {/* Category View */}
          {currentView === 'category' && CATEGORY_META[selectedCategory] && (
            <CategoryView
              key={`category-${selectedCategory}`}
              category={selectedCategory}
              title={CATEGORY_META[selectedCategory].title}
              description={CATEGORY_META[selectedCategory].description}
            />
          )}

          {/* Search View */}
          {currentView === 'search' && <SearchView key="search" />}

          {/* Favorites View */}
          {currentView === 'favorites' && <FavoritesView key="favorites" />}

          {/* Pricing View */}
          {currentView === 'pricing' && <PricingView key="pricing" />}

          {/* Profile View */}
          {currentView === 'profile' && <ProfileView key="profile" />}

          {/* Admin View */}
          {currentView === 'admin' && <AdminView key="admin" />}

          {/* Watch History View */}
          {currentView === 'watchHistory' && <WatchHistoryView key="watchHistory" />}
        </AnimatePresence>
      </main>

      {/* Movie Detail Modal (always mounted, visibility controlled internally) */}
      <MovieDetailModal />

      {/* Video Player (always mounted, visibility controlled internally) */}
      <VideoPlayer />
    </div>
  );
}
