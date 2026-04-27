'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Play, Trash2, Loader2, Eye, Film } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAppStore, Movie } from '@/lib/store';

interface HistoryItem {
  id: string;
  movieId: string;
  progress: number;
  watchedAt: string;
  movie: Movie;
}

export default function WatchHistoryView() {
  const { setCurrentView, setSelectedMovie, setCurrentView: setView } = useAppStore();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/history');
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history || []);
      }
    } catch (error) {
      console.error('Fetch history error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = async () => {
    if (!confirm('¿Estás seguro de que quieres borrar todo el historial?')) return;
    setClearing(true);
    try {
      await fetch('/api/history', { method: 'DELETE' });
      setHistory([]);
    } catch (error) {
      console.error('Clear history error:', error);
    } finally {
      setClearing(false);
    }
  };

  const handleContinueWatching = (item: HistoryItem) => {
    setSelectedMovie(item.movie);
    setView('player');
  };

  const handleMovieClick = (item: HistoryItem) => {
    setSelectedMovie(item.movie);
    setView('movieDetail');
  };

  const formatTimeAgo = (dateStr: string) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Ahora mismo';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays < 7) return `Hace ${diffDays}d`;
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="min-h-screen pt-20 pb-16 px-4 sm:px-8 lg:px-16">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-600/10">
              <Clock className="h-6 w-6 text-red-400" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Historial de Reproducción</h1>
              <p className="text-gray-400 text-sm">
                {history.length > 0
                  ? `${history.length} elementos en tu historial`
                  : 'No tienes reproducciones recientes'}
              </p>
            </div>
          </div>

          {history.length > 0 && (
            <Button
              onClick={handleClearHistory}
              disabled={clearing}
              variant="outline"
              className="border-red-600/20 text-red-400 hover:bg-red-600/10 hover:text-red-300 hover:border-red-600/30 text-sm"
            >
              {clearing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Borrar Historial
            </Button>
          )}
        </motion.div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 text-red-500 animate-spin" />
          </div>
        )}

        {/* Empty State */}
        {!isLoading && history.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center py-20"
          >
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-white/5 flex items-center justify-center">
              <Film className="h-10 w-10 text-gray-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-300 mb-2">
              Sin historial de reproducción
            </h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              Comienza a ver películas y series y aparecerán aquí para que puedas continuar donde lo dejaste.
            </p>
            <Button
              onClick={() => setCurrentView('home')}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Explorar Contenido
            </Button>
          </motion.div>
        )}

        {/* History List */}
        {!isLoading && history.length > 0 && (
          <div className="space-y-3">
            {/* Continue Watching */}
            {history.filter((h) => h.progress > 0 && h.progress < 100).length > 0 && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Play className="h-4 w-4 text-red-400" />
                  Continuar Viendo
                </h2>
                <div className="space-y-3">
                  {history
                    .filter((h) => h.progress > 0 && h.progress < 100)
                    .map((item, index) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        className="group flex items-center gap-4 p-3 rounded-xl bg-gray-900/60 border border-white/10 hover:border-white/20 transition-all cursor-pointer"
                        onClick={() => handleContinueWatching(item)}
                      >
                        {/* Thumbnail */}
                        <div className="relative flex-shrink-0">
                          <img
                            src={item.movie.posterUrl}
                            alt={item.movie.title}
                            className="w-16 sm:w-20 h-24 sm:h-28 object-cover rounded-lg"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                            <Play className="h-8 w-8 text-white fill-white" />
                          </div>
                          <div className="absolute bottom-0 left-0 right-0">
                            <Progress
                              value={item.progress}
                              className="h-1 rounded-none bg-black/50 [&>div]:bg-red-600"
                            />
                          </div>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-white font-medium text-sm sm:text-base truncate group-hover:text-red-400 transition-colors">
                            {item.movie.title}
                          </h3>
                          <p className="text-gray-400 text-xs sm:text-sm mt-1 capitalize">
                            {item.movie.genre} · {item.movie.year} · {item.movie.duration}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge
                              variant="secondary"
                              className="bg-red-600/20 text-red-400 text-[10px] border-0"
                            >
                              {Math.round(item.progress)}% visto
                            </Badge>
                            <span className="text-gray-500 text-xs">
                              {formatTimeAgo(item.watchedAt)}
                            </span>
                          </div>
                        </div>

                        {/* Play Button */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="flex-shrink-0 h-10 w-10 rounded-full bg-red-600 hover:bg-red-700 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Play className="h-4 w-4 fill-white" />
                        </Button>
                      </motion.div>
                    ))}
                </div>
              </div>
            )}

            {/* Completed / Full History */}
            {history.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Eye className="h-4 w-4 text-gray-400" />
                  Todo el Historial
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {history.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.03 }}
                      className="group flex items-center gap-3 p-3 rounded-xl bg-gray-900/40 border border-white/5 hover:border-white/15 transition-all cursor-pointer"
                      onClick={() => handleMovieClick(item)}
                    >
                      <img
                        src={item.movie.posterUrl}
                        alt={item.movie.title}
                        className="w-12 h-16 object-cover rounded-lg flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-white text-sm font-medium truncate">
                          {item.movie.title}
                        </h4>
                        <p className="text-gray-500 text-xs mt-0.5">
                          {item.movie.year} · {item.movie.genre}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Progress
                            value={item.progress}
                            className="h-1 flex-1 bg-white/5 [&>div]:bg-red-600"
                          />
                          <span className="text-gray-500 text-[10px] w-8 text-right">
                            {Math.round(item.progress)}%
                          </span>
                        </div>
                        <p className="text-gray-600 text-[10px] mt-1">
                          {formatTimeAgo(item.watchedAt)}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
