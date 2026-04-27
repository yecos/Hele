'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  X,
  Play,
  Heart,
  Star,
  Clock,
  Calendar,
  Tv,
  Film,
  ChevronDown,
  Loader2,
  Users,
  Clock3,
  Magnet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAppStore, type Movie } from '@/lib/store';
import { getPosterUrl, isTmdbConfigured } from '@/lib/tmdb';
import MovieCard from './MovieCard';

interface TVShowDetails {
  id: number;
  name: string;
  overview: string;
  backdrop_path: string | null;
  poster_path: string | null;
  vote_average: number;
  first_air_date: string;
  number_of_seasons: number;
  number_of_episodes: number;
  status: string;
  genres: { id: number; name: string }[];
  tagline: string;
  episode_run_time: number[];
  created_by: { id: number; name: string; profile_path: string | null }[];
  networks: { id: number; name: string; logo_path: string | null }[];
}

interface EpisodeData {
  episode_number: number;
  name: string;
  overview: string;
  still_path: string | null;
  air_date: string;
  runtime: number;
  vote_average: number;
}

export default function MovieDetailModal() {
  const {
    selectedMovie,
    relatedMovies,
    currentView,
    goBack,
    playMovie,
    toggleFavorite,
    isFavorite,
    playTorrent,
  } = useAppStore();

  const [tvDetails, setTvDetails] = useState<TVShowDetails | null>(null);
  const [episodes, setEpisodes] = useState<EpisodeData[]>([]);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const [showEpisodeList, setShowEpisodeList] = useState(false);
  const [genres, setGenres] = useState<{ id: number; name: string }[]>([]);

  useEffect(() => {
    if (currentView === 'movieDetail') {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    // Reset state when movie changes
    if (selectedMovie) {
      setTvDetails(null);
      setEpisodes([]);
      setSelectedSeason(1);
      setShowEpisodeList(false);
      setGenres([]);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [currentView, selectedMovie?.id]);

  // Load TV show details and episodes
  useEffect(() => {
    if (!selectedMovie || selectedMovie.mediaType !== 'tv') return;

    const loadTVData = async () => {
      setLoadingDetails(true);
      try {
        const res = await fetch(`/api/tv?id=${selectedMovie.id}`);
        if (res.ok) {
          const data = await res.json();
          setTvDetails(data.tvShow);
          setEpisodes(data.currentSeasonEpisodes || []);
          setGenres(data.tvShow?.genres || []);
        }
      } catch (err) {
        console.error('Error loading TV details:', err);
      } finally {
        setLoadingDetails(false);
      }
    };

    loadTVData();
  }, [selectedMovie?.id, selectedMovie?.mediaType]);

  // Load episodes when season changes
  useEffect(() => {
    if (!selectedMovie || selectedMovie.mediaType !== 'tv') return;
    if (!tvDetails) return;

    const loadEpisodes = async () => {
      setLoadingEpisodes(true);
      try {
        const res = await fetch(
          `/api/tv?id=${selectedMovie.id}&season=${selectedSeason}`
        );
        if (res.ok) {
          const data = await res.json();
          setEpisodes(data.episodes || []);
        }
      } catch {
        console.error('Error loading episodes');
      } finally {
        setLoadingEpisodes(false);
      }
    };

    loadEpisodes();
  }, [selectedSeason, tvDetails, selectedMovie?.id, selectedMovie?.mediaType]);

  if (currentView !== 'movieDetail' || !selectedMovie) return null;

  const movie = selectedMovie;
  const favorite = isFavorite(movie.id);
  const isTVShow = movie.mediaType === 'tv';
  const tmdbId = parseInt(movie.id);
  const hasTmdbId = !isNaN(tmdbId);

  const handlePlay = () => {
    if (hasTmdbId && (movie.mediaType === 'movie' || movie.mediaType === 'tv')) {
      playMovie(tmdbId, movie.mediaType, movie.title);
    } else if (movie.videoUrl) {
      // Fallback for seed data with video URLs
      playMovie(parseInt(movie.id), 'movie', movie.title);
    }
  };

  const handlePlayEpisode = (season: number, episode: number) => {
    if (hasTmdbId && isTVShow) {
      playMovie(tmdbId, 'tv', movie.title, season, episode);
    }
  };

  const handleClose = () => {
    goBack();
  };

  const handleBack = () => {
    goBack();
  };

  // Get genres display
  const genreDisplay =
    genres.length > 0
      ? genres.map((g) => g.name).join(', ')
      : movie.genre || '';

  // Runtime display
  const runtimeDisplay = isTVShow
    ? tvDetails?.episode_run_time?.[0]
      ? `${tvDetails.episode_run_time[0]} min/ep`
      : ''
    : movie.duration;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[100] bg-black overflow-y-auto"
    >
      {/* Backdrop */}
      <div className="relative w-full h-[40vh] sm:h-[50vh] md:h-[45vh]">
        <img
          src={movie.backdropUrl}
          alt={movie.title}
          className="w-full h-full object-cover"
        />
        {/* Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/20" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-transparent" />

        {/* Top Buttons */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 sm:p-6">
          <Button
            variant="ghost"
            onClick={handleBack}
            className="text-white hover:bg-white/20 bg-black/30 backdrop-blur-sm rounded-full h-9 w-9 p-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            onClick={handleClose}
            className="text-white hover:bg-white/20 bg-black/30 backdrop-blur-sm rounded-full h-9 w-9 p-0"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Badges on backdrop */}
        <div className="absolute bottom-4 left-4 sm:left-6 flex items-center gap-2">
          {movie.isLive && (
            <Badge className="bg-red-600 text-white border-0 px-3 py-1 text-sm font-bold shadow-lg animate-pulse">
              <span className="mr-2 inline-block h-2 w-2 rounded-full bg-white" />
              EN VIVO
            </Badge>
          )}
          {isTVShow && (
            <Badge className="bg-purple-600/80 text-white border-0 px-3 py-1 text-sm font-semibold shadow-lg">
              <Tv className="h-3.5 w-3.5 mr-1.5" />
              SERIE
            </Badge>
          )}
          {hasTmdbId && !movie.isLive && !isTVShow && (
            <Badge className="bg-blue-600/80 text-white border-0 px-3 py-1 text-sm font-semibold shadow-lg">
              <Film className="h-3.5 w-3.5 mr-1.5" />
              PELICULA
            </Badge>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="relative -mt-20 sm:-mt-24 z-10 px-4 sm:px-6 md:px-12 lg:px-16 pb-16">
        {/* Title & Meta */}
        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 sm:mb-6 leading-tight">
          {movie.title}
        </h1>

        {/* Tagline for TV shows */}
        {tvDetails?.tagline && (
          <p className="text-sm italic text-gray-500 mb-3">
            &ldquo;{tvDetails.tagline}&rdquo;
          </p>
        )}

        {/* Meta Row */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
          <span className="flex items-center gap-1.5 text-yellow-500 font-semibold">
            <Star className="h-4 w-4 fill-yellow-500" />
            {movie.rating.toFixed(1)}
          </span>
          <span className="flex items-center gap-1.5 text-gray-300 text-sm">
            <Calendar className="h-4 w-4" />
            {movie.year}
          </span>
          {runtimeDisplay && (
            <span className="flex items-center gap-1.5 text-gray-300 text-sm">
              <Clock className="h-4 w-4" />
              {runtimeDisplay}
            </span>
          )}
          {isTVShow && tvDetails && (
            <>
              <span className="flex items-center gap-1.5 text-gray-300 text-sm">
                <Tv className="h-4 w-4" />
                {tvDetails.number_of_seasons} temporada
                {tvDetails.number_of_seasons !== 1 ? 's' : ''}
              </span>
              <span className="flex items-center gap-1.5 text-gray-300 text-sm">
                <Clock3 className="h-4 w-4" />
                {tvDetails.number_of_episodes} episodio
                {tvDetails.number_of_episodes !== 1 ? 's' : ''}
              </span>
            </>
          )}
        </div>

        {/* Networks for TV shows */}
        {tvDetails?.networks && tvDetails.networks.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {tvDetails.networks.map((network) => (
              <Badge
                key={network.id}
                variant="outline"
                className="border-gray-600 text-gray-400 text-xs bg-white/5"
              >
                {network.name}
              </Badge>
            ))}
          </div>
        )}

        {/* Created By for TV shows */}
        {tvDetails?.created_by && tvDetails.created_by.length > 0 && (
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-400">
              Creado por{' '}
              {tvDetails.created_by.map((c) => c.name).join(', ')}
            </span>
          </div>
        )}

        {/* Genre Tags */}
        <div className="flex flex-wrap gap-2 mb-6">
          {genreDisplay.split(',').map((g) => (
            <Badge
              key={g.trim()}
              variant="outline"
              className="border-gray-600 text-gray-300 text-xs sm:text-sm bg-white/5"
            >
              {g.trim()}
            </Badge>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 mb-6 sm:mb-8">
          {hasTmdbId && (movie.mediaType === 'movie' || movie.mediaType === 'tv') ? (
            <Button
              onClick={handlePlay}
              className="bg-red-600 hover:bg-red-700 text-white px-6 sm:px-10 py-5 sm:py-6 text-sm sm:text-base font-semibold rounded-lg transition-all hover:scale-105 shadow-lg shadow-red-600/30"
            >
              <Play className="h-5 w-5 mr-2 fill-white" />
              {isTVShow ? 'Ver Serie' : 'Reproducir'}
            </Button>
          ) : movie.videoUrl ? (
            <Button
              onClick={handlePlay}
              className="bg-red-600 hover:bg-red-700 text-white px-6 sm:px-10 py-5 sm:py-6 text-sm sm:text-base font-semibold rounded-lg transition-all hover:scale-105 shadow-lg shadow-red-600/30"
            >
              <Play className="h-5 w-5 mr-2 fill-white" />
              Reproducir
            </Button>
          ) : (
            <Button
              disabled
              className="bg-gray-700 text-gray-400 px-6 sm:px-10 py-5 sm:py-6 text-sm sm:text-base font-semibold rounded-lg cursor-not-allowed"
            >
              <Play className="h-5 w-5 mr-2" />
              No disponible
            </Button>
          )}

          <Button
            variant="outline"
            onClick={() => toggleFavorite(movie.id)}
            className={`bg-white/10 hover:bg-white/20 border-gray-600 px-4 sm:px-6 py-5 sm:py-6 text-sm sm:text-base font-semibold rounded-lg backdrop-blur-sm transition-all ${
              favorite ? 'text-red-500 border-red-500/50' : 'text-white'
            }`}
          >
            <Heart
              className={`h-5 w-5 mr-2 ${favorite ? 'fill-red-500' : ''}`}
            />
            {favorite ? 'En Mi Lista' : 'Mi Lista'}
          </Button>

          {hasTmdbId && (movie.mediaType === 'movie' || movie.mediaType === 'tv') && (
            <Button
              variant="outline"
              onClick={() => {
                playTorrent(movie.title, movie.mediaType);
              }}
              className="bg-blue-600/10 hover:bg-blue-600/20 border-blue-600/50 px-4 sm:px-6 py-5 sm:py-6 text-sm sm:text-base font-semibold rounded-lg backdrop-blur-sm transition-all text-blue-400 hover:text-blue-300"
              title="Buscar y reproducir via torrent P2P"
            >
              <Magnet className="h-5 w-5 mr-2" />
              Torrent
            </Button>
          )}
        </div>

        {/* Description */}
        <div className="mb-8 sm:mb-12">
          <h3 className="text-base sm:text-lg font-semibold text-white mb-2 sm:mb-3">
            Sinopsis
          </h3>
          <p className="text-sm sm:text-base text-gray-400 leading-relaxed max-w-3xl">
            {movie.description}
          </p>
        </div>

        {/* TV Show: Season/Episode Browser */}
        {isTVShow && tvDetails && (
          <div className="mb-8 sm:mb-12">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base sm:text-lg font-semibold text-white">
                Temporadas y Episodios
              </h3>
              <Button
                variant="ghost"
                onClick={() => setShowEpisodeList(!showEpisodeList)}
                className="text-gray-400 hover:text-white text-sm"
              >
                {showEpisodeList ? 'Ocultar' : 'Ver episodios'}
                <ChevronDown
                  className={`h-4 w-4 ml-1 transition-transform ${
                    showEpisodeList ? 'rotate-180' : ''
                  }`}
                />
              </Button>
            </div>

            {/* Season Tabs */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
              {Array.from(
                { length: tvDetails.number_of_seasons },
                (_, i) => i + 1
              ).map((s) => (
                <Button
                  key={s}
                  variant={selectedSeason === s ? 'default' : 'outline'}
                  onClick={() => setSelectedSeason(s)}
                  className={
                    selectedSeason === s
                      ? 'bg-red-600 hover:bg-red-700 text-white rounded-lg px-4 flex-shrink-0'
                      : 'border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg px-4 flex-shrink-0'
                  }
                >
                  T{s}
                </Button>
              ))}
            </div>

            {/* Episode List */}
            <AnimatePresence>
              {showEpisodeList && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  {loadingEpisodes ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 text-red-500 animate-spin mr-2" />
                      <span className="text-gray-400 text-sm">
                        Cargando episodios...
                      </span>
                    </div>
                  ) : episodes.length === 0 ? (
                    <p className="text-gray-500 text-sm py-8 text-center">
                      No hay episodios disponibles para esta temporada
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {episodes.map((ep) => (
                        <button
                          key={ep.episode_number}
                          onClick={() =>
                            handlePlayEpisode(selectedSeason, ep.episode_number)
                          }
                          className="flex items-start gap-3 p-3 rounded-lg bg-gray-900/50 border border-gray-800 hover:border-red-600/50 hover:bg-gray-900 transition-all text-left group"
                        >
                          {/* Episode thumbnail */}
                          <div className="flex-shrink-0 w-28 aspect-video rounded overflow-hidden bg-gray-800 relative">
                            {ep.still_path ? (
                              <img
                                src={getPosterUrl(ep.still_path, 'w300')}
                                alt={`Episodio ${ep.episode_number}`}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gray-800">
                                <Film className="h-5 w-5 text-gray-600" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Play className="h-6 w-6 text-white fill-white" />
                            </div>
                          </div>

                          {/* Episode info */}
                          <div className="flex-1 min-w-0 py-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-mono text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded">
                                E{ep.episode_number}
                              </span>
                              {ep.runtime > 0 && (
                                <span className="text-xs text-gray-500">
                                  {ep.runtime}m
                                </span>
                              )}
                            </div>
                            <p className="text-sm font-medium text-white truncate">
                              {ep.name}
                            </p>
                            {ep.overview && (
                              <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                                {ep.overview}
                              </p>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Related Movies */}
        {relatedMovies && relatedMovies.length > 0 && (
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-white mb-4">
              Contenido Relacionado
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3">
              {relatedMovies.slice(0, 12).map((relMovie) => (
                <MovieCard key={relMovie.id} movie={relMovie} />
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
