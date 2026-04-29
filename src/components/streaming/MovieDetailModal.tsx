'use client';

import { useEffect, useState } from 'react';
import { usePlayerStore, useFavoritesStore } from '@/lib/store';
import type { TMDBMovieDetail, TMDBSeasonDetail } from '@/lib/tmdb';
import { getPosterUrl, getBackdropUrl } from '@/lib/tmdb';
import { Star, Heart, Play, Calendar, Clock, X, ChevronLeft, ChevronRight, Tv, Film } from 'lucide-react';
import { useT } from '@/lib/i18n';

export function MovieDetailModal() {
  const { t } = useT();
  const {
    isPlaying, currentMovie, currentDetail,
    setDetail, closePlayer, playMovie, playEpisode,
    currentSeason, currentEpisode,
    showDetail, closeDetail,
  } = usePlayerStore();
  const { toggleFavorite, isFavorite } = useFavoritesStore();
  const [seasonDetail, setSeasonDetail] = useState<TMDBSeasonDetail | null>(null);
  const [activeSeason, setActiveSeason] = useState(1);

  // Derived season: sync with player state for TV shows
  const displaySeason = isPlaying && currentMovie?.mediaType === 'tv' ? currentSeason : activeSeason;

  // Fetch detail when movie changes
  useEffect(() => {
    if (!currentMovie || !isPlaying) return;
    if (currentDetail) return; // Already have detail

    const fetchDetail = async () => {
      try {
        const type = currentMovie.mediaType;
        const res = await fetch(`/api/tmdb?endpoint=/${type}/${currentMovie.tmdbId}&append_to_response=videos,similar,credits`);
        if (res.ok) {
          const data = await res.json();
          setDetail(data);
        }
      } catch (err) {
        console.error('Error fetching detail:', err);
      }
    };
    fetchDetail();
  }, [currentMovie?.id, isPlaying]);

  // Fetch season detail
  useEffect(() => {
    if (currentMovie?.mediaType !== 'tv' || !isPlaying) return;
    const fetchSeason = async () => {
      try {
        const res = await fetch(`/api/tmdb?endpoint=/tv/${currentMovie.tmdbId}/season/${displaySeason}`);
        if (res.ok) {
          const data = await res.json();
          setSeasonDetail(data);
        }
      } catch (err) {
        console.error('Error fetching season:', err);
      }
    };
    fetchSeason();
  }, [currentMovie?.id, displaySeason, isPlaying]);

  if (!isPlaying || !currentMovie || !showDetail) return null;

  const detail = currentDetail;
  const isTV = currentMovie.mediaType === 'tv';
  const favorite = isFavorite(currentMovie.id);

  // Find trailer
  const trailer = detail?.videos?.results?.find(v => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser'));

  return (
    <div className="fixed inset-0 z-[200] bg-black/95 overflow-y-auto">
      {/* Close button */}
      <button
        onClick={() => closeDetail()}
        className="fixed top-4 right-4 z-30 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-all"
      >
        <X size={24} />
      </button>

      {/* Backdrop */}
      <div className="relative w-full h-[50vh] min-h-[300px]">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: detail?.backdrop_path ? `url(${getBackdropUrl(detail.backdrop_path)})` : undefined }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />

        {/* Poster overlay */}
        <div className="absolute bottom-[-60px] left-4 sm:left-8 z-10">
          <div className="w-32 sm:w-40 rounded-xl overflow-hidden shadow-2xl border-2 border-white/10">
            <img
              src={getPosterUrl(detail?.poster_path || null)}
              alt={currentMovie.title}
              className="w-full aspect-[2/3] object-cover"
            />
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-8 pt-20 pb-8">
        {/* Title and actions */}
        <div className="ml-0 sm:ml-48 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            {isTV ? (
              <span className="flex items-center gap-1 bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded text-xs font-bold">
                <Tv size={12} /> {t('detail.serie')}
              </span>
            ) : (
              <span className="flex items-center gap-1 bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded text-xs font-bold">
                <Film size={12} /> {t('detail.movie')}
              </span>
            )}
            {detail?.runtime && (
              <span className="flex items-center gap-1 text-gray-400 text-xs">
                <Clock size={12} /> {detail.runtime} min
              </span>
            )}
            {detail?.first_air_date && (
              <span className="flex items-center gap-1 text-gray-400 text-xs">
                <Calendar size={12} /> {detail.first_air_date.substring(0, 4)}
              </span>
            )}
            {detail?.status && detail.status !== 'Released' && detail.status !== 'Returning Series' && (
              <span className="text-gray-500 text-xs">{detail.status}</span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">{currentMovie.title}</h1>

          {detail?.tagline && (
            <p className="text-gray-500 italic text-sm">{detail.tagline}</p>
          )}

          <div className="flex items-center gap-3 flex-wrap">
            {detail?.vote_average && detail.vote_average > 0 && (
              <div className="flex items-center gap-1.5 bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-lg">
                <Star size={16} fill="currentColor" />
                <span className="font-bold">{detail.vote_average.toFixed(1)}</span>
                <span className="text-yellow-500/60 text-xs">/10</span>
              </div>
            )}

            <button
              onClick={() => { closeDetail(); playMovie(currentMovie, detail || undefined); }}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl font-semibold transition-all hover:scale-105 active:scale-95 shadow-lg shadow-red-600/20"
            >
              <Play size={18} fill="white" />
              {isTV ? `Ver T${String(currentSeason).padStart(2,'0')}E${String(currentEpisode).padStart(2,'0')}` : t('detail.watchMovie')}
            </button>

            <button
              onClick={() => toggleFavorite(currentMovie.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold transition-all ${
                favorite ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              <Heart size={18} className={favorite ? 'fill-red-400' : ''} />
              {favorite ? t('detail.inMyList') : t('detail.myList')}
            </button>
          </div>

          {/* Genres */}
          {detail?.genres && detail.genres.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {detail.genres.map(g => (
                <span key={g.id} className="bg-white/5 text-gray-400 px-3 py-1 rounded-full text-xs">
                  {g.name}
                </span>
              ))}
            </div>
          )}

          {/* Overview */}
          {detail?.overview && (
            <p className="text-gray-300 text-sm sm:text-base leading-relaxed max-w-3xl pt-1">
              {detail.overview}
            </p>
          )}

          {/* Trailer */}
          {trailer && (
            <div className="pt-2">
              <h3 className="text-white font-semibold text-sm mb-2">{t('detail.trailer')}</h3>
              <div className="relative w-full max-w-xl aspect-video rounded-xl overflow-hidden bg-gray-900">
                <iframe
                  src={`https://www.youtube.com/embed/${trailer.key}`}
                  className="w-full h-full"
                  sandbox="allow-scripts allow-same-origin allow-autoplay allow-fullscreen allow-encrypted-media"
                  allowFullScreen
                  allow="autoplay; encrypted-media"
                />
              </div>
            </div>
          )}

          {/* Cast */}
          {detail?.credits?.cast && detail.credits.cast.length > 0 && (
            <div className="pt-4">
              <h3 className="text-white font-semibold text-sm mb-3">{t('detail.cast')}</h3>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
                {detail.credits.cast.slice(0, 15).map(person => (
                  <div key={person.id} className="flex-shrink-0 w-20 text-center">
                    <div className="w-16 h-16 mx-auto rounded-full overflow-hidden bg-gray-800 mb-1">
                      {person.profile_path ? (
                        <img src={getPosterUrl(person.profile_path, 'w185')} alt={person.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-600 text-lg font-bold">{person.name[0]}</div>
                      )}
                    </div>
                    <p className="text-white text-[10px] font-medium truncate">{person.name}</p>
                    <p className="text-gray-500 text-[10px] truncate">{person.character}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Seasons (TV shows) */}
        {isTV && detail?.seasons && (
          <div className="mt-10">
            <h2 className="text-xl font-bold text-white mb-4">{t('detail.seasons')}</h2>

            {/* Season tabs */}
            <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
              {detail.seasons
                .filter(s => s.season_number > 0)
                .sort((a, b) => a.season_number - b.season_number)
                .map(s => (
                  <button
                    key={s.season_number}
                    onClick={() => setActiveSeason(s.season_number)}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
                      displaySeason === s.season_number
                        ? 'bg-white text-black'
                        : 'bg-white/10 text-gray-300 hover:bg-white/20'
                    }`}
                  >
                    T{String(s.season_number).padStart(2, '0')}
                    <span className="ml-1 text-xs opacity-60">({s.episode_count} {t('detail.ep')})</span>
                  </button>
                ))}
            </div>

            {/* Episode grid */}
            {seasonDetail && (
              <div className="grid gap-2 mt-2">
                {seasonDetail.episodes.map(ep => {
                  const isActive = ep.episode_number === currentEpisode && displaySeason === currentSeason;
                  return (
                    <button
                      key={ep.id}
                      onClick={() => {
                        playEpisode(displaySeason, ep.episode_number);
                        closeDetail();
                      }}
                      className={`flex items-start gap-3 p-3 rounded-xl text-left transition-all ${
                        isActive
                          ? 'bg-red-600/20 border border-red-500/30'
                          : 'bg-white/5 hover:bg-white/10 border border-transparent'
                      }`}
                    >
                      {/* Episode thumbnail */}
                      <div className="flex-shrink-0 w-32 sm:w-40 aspect-video rounded-lg overflow-hidden bg-gray-800 relative">
                        {ep.still_path ? (
                          <img src={getPosterUrl(ep.still_path, 'w300')} alt={ep.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-600">
                            <Film size={24} />
                          </div>
                        )}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity">
                          <Play size={20} fill="white" className="text-white" />
                        </div>
                        <div className="absolute bottom-1 left-1 bg-black/70 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                          E{String(ep.episode_number).padStart(2, '0')}
                        </div>
                      </div>

                      {/* Episode info */}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-white text-sm font-semibold truncate">
                          {ep.episode_number}. {ep.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                          {ep.runtime && (
                            <span className="flex items-center gap-1"><Clock size={10} />{ep.runtime}m</span>
                          )}
                          {ep.vote_average > 0 && (
                            <span className="flex items-center gap-1"><Star size={10} fill="currentColor" className="text-yellow-400" />{ep.vote_average.toFixed(1)}</span>
                          )}
                          {ep.air_date && <span>{ep.air_date}</span>}
                        </div>
                        {ep.overview && (
                          <p className="text-gray-500 text-xs mt-1 line-clamp-2">{ep.overview}</p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
