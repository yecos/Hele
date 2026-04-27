'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Film,
  Heart,
  Clock,
  BarChart3,
  Trash2,
  Plus,
  Loader2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useAppStore, Movie } from '@/lib/store';

interface Stats {
  totalUsers: number;
  totalMovies: number;
  totalFavorites: number;
  totalHistory: number;
}

interface CategoryStat {
  category: string;
  _count: { id: number };
}

interface GenreStat {
  genre: string;
  _count: { id: number };
}

interface PlanStat {
  plan: string;
  _count: { id: number };
}

interface RecentUser {
  id: string;
  name: string;
  email: string;
  plan: string;
  role: string;
  createdAt: string;
}

export default function AdminView() {
  const { setCurrentView } = useAppStore();
  const [stats, setStats] = useState<Stats | null>(null);
  const [categoryStats, setCategoryStats] = useState<CategoryStat[]>([]);
  const [genreStats, setGenreStats] = useState<GenreStat[]>([]);
  const [planStats, setPlanStats] = useState<PlanStat[]>([]);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Add movie dialog
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newMovie, setNewMovie] = useState({
    title: '',
    description: '',
    posterUrl: '',
    backdropUrl: '',
    videoUrl: '',
    year: '2025',
    duration: '',
    rating: '0',
    genre: '',
    category: 'peliculas',
    isLive: false,
    featured: false,
    trending: false,
  });
  const [addingMovie, setAddingMovie] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [statsRes, moviesRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/movies'),
      ]);

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.stats);
        setCategoryStats(data.categoryStats || []);
        setGenreStats(data.genreStats || []);
        setPlanStats(data.planStats || []);
        setRecentUsers(data.recentUsers || []);
      }

      if (moviesRes.ok) {
        const data = await moviesRes.json();
        setMovies(data.movies || []);
      }
    } catch (error) {
      console.error('Admin fetch error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddMovie = async () => {
    setAddingMovie(true);
    try {
      const res = await fetch('/api/admin/movies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMovie),
      });
      if (res.ok) {
        setAddDialogOpen(false);
        setNewMovie({
          title: '',
          description: '',
          posterUrl: '',
          backdropUrl: '',
          videoUrl: '',
          year: '2025',
          duration: '',
          rating: '0',
          genre: '',
          category: 'peliculas',
          isLive: false,
          featured: false,
          trending: false,
        });
        fetchData();
      }
    } catch (error) {
      console.error('Add movie error:', error);
    } finally {
      setAddingMovie(false);
    }
  };

  const handleDeleteMovie = async (id: string) => {
    try {
      const res = await fetch('/api/admin/movies', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Delete movie error:', error);
    }
  };

  const statCards = [
    { label: 'Usuarios', value: stats?.totalUsers || 0, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Películas', value: stats?.totalMovies || 0, icon: Film, color: 'text-red-400', bg: 'bg-red-500/10' },
    { label: 'Favoritos', value: stats?.totalFavorites || 0, icon: Heart, color: 'text-pink-400', bg: 'bg-pink-500/10' },
    { label: 'Historial', value: stats?.totalHistory || 0, icon: Clock, color: 'text-green-400', bg: 'bg-green-500/10' },
  ];

  const maxGenreCount = Math.max(...genreStats.map((g) => g._count.id), 1);

  if (isLoading) {
    return (
      <div className="min-h-screen pt-20 pb-16 px-4 sm:px-8 lg:px-16 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-red-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-16 px-4 sm:px-8 lg:px-16">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8"
        >
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white flex items-center gap-3">
              <Shield className="h-8 w-8 text-red-500" />
              Panel de Administración
            </h1>
            <p className="text-gray-400 mt-1">Gestiona contenido y usuarios</p>
          </div>
          <Button
            onClick={() => setCurrentView('home')}
            variant="outline"
            className="border-white/10 text-gray-300 hover:bg-white/5 hover:text-white"
          >
            Volver al Inicio
          </Button>
        </motion.div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="bg-gray-900/60 border border-white/10 rounded-xl p-4 sm:p-6"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2 rounded-lg ${card.bg}`}>
                    <Icon className={`h-5 w-5 ${card.color}`} />
                  </div>
                  <BarChart3 className="h-4 w-4 text-gray-600" />
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-white">{card.value}</p>
                <p className="text-gray-400 text-sm mt-1">{card.label}</p>
              </motion.div>
            );
          })}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Genre Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gray-900/60 border border-white/10 rounded-xl p-6"
          >
            <h3 className="text-lg font-semibold text-white mb-4">Distribución por Género</h3>
            <div className="space-y-3">
              {genreStats.map((g) => (
                <div key={g.genre} className="flex items-center gap-3">
                  <span className="text-gray-300 text-sm w-24 truncate">{g.genre}</span>
                  <div className="flex-1 h-6 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(g._count.id / maxGenreCount) * 100}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className="h-full bg-gradient-to-r from-red-600 to-red-500 rounded-full"
                    />
                  </div>
                  <span className="text-gray-400 text-sm font-medium w-8 text-right">
                    {g._count.id}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Plan Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-gray-900/60 border border-white/10 rounded-xl p-6"
          >
            <h3 className="text-lg font-semibold text-white mb-4">Distribución de Planes</h3>
            <div className="space-y-4">
              {planStats.map((p) => {
                const total = planStats.reduce((acc, curr) => acc + curr._count.id, 0);
                const pct = total > 0 ? Math.round((p._count.id / total) * 100) : 0;
                const colors: Record<string, string> = {
                  free: 'from-gray-600 to-gray-500',
                  premium: 'from-red-600 to-red-500',
                  vip: 'from-yellow-600 to-amber-500',
                };
                return (
                  <div key={p.plan}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-gray-300 text-sm capitalize">{p.plan}</span>
                      <span className="text-gray-400 text-sm">
                        {p._count.id} ({pct}%)
                      </span>
                    </div>
                    <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className={`h-full bg-gradient-to-r ${colors[p.plan] || 'from-gray-600 to-gray-500'} rounded-full`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Recent Users */}
            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-400 mb-3">Usuarios Recientes</h4>
              <div className="space-y-2">
                {recentUsers.slice(0, 5).map((u) => (
                  <div key={u.id} className="flex items-center justify-between py-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-gray-300">
                          {u.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-white truncate">{u.name}</p>
                        <p className="text-xs text-gray-500 truncate">{u.email}</p>
                      </div>
                    </div>
                    <Badge
                      variant="secondary"
                      className={`text-[10px] flex-shrink-0 ml-2 ${
                        u.role === 'admin'
                          ? 'bg-red-600/20 text-red-400'
                          : 'bg-gray-700 text-gray-400'
                      }`}
                    >
                      {u.role === 'admin' ? 'Admin' : u.plan}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Movie Management */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-gray-900/60 border border-white/10 rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Film className="h-5 w-5 text-red-400" />
              Gestión de Películas
            </h3>
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-red-600 hover:bg-red-700 text-white text-sm">
                  <Plus className="h-4 w-4 mr-1.5" />
                  Agregar
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-gray-900 border-white/10 text-white sm:max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Agregar Nueva Película</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 pt-4">
                  <div className="space-y-1.5">
                    <Label className="text-gray-300 text-xs">Título</Label>
                    <Input
                      value={newMovie.title}
                      onChange={(e) => setNewMovie({ ...newMovie, title: e.target.value })}
                      className="bg-white/5 border-white/10 text-white text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-gray-300 text-xs">Descripción</Label>
                    <Input
                      value={newMovie.description}
                      onChange={(e) => setNewMovie({ ...newMovie, description: e.target.value })}
                      className="bg-white/5 border-white/10 text-white text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-gray-300 text-xs">URL Poster</Label>
                      <Input
                        value={newMovie.posterUrl}
                        onChange={(e) => setNewMovie({ ...newMovie, posterUrl: e.target.value })}
                        className="bg-white/5 border-white/10 text-white text-sm"
                        placeholder="https://..."
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-gray-300 text-xs">URL Backdrop</Label>
                      <Input
                        value={newMovie.backdropUrl}
                        onChange={(e) => setNewMovie({ ...newMovie, backdropUrl: e.target.value })}
                        className="bg-white/5 border-white/10 text-white text-sm"
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-gray-300 text-xs">Año</Label>
                      <Input
                        value={newMovie.year}
                        onChange={(e) => setNewMovie({ ...newMovie, year: e.target.value })}
                        className="bg-white/5 border-white/10 text-white text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-gray-300 text-xs">Duración</Label>
                      <Input
                        value={newMovie.duration}
                        onChange={(e) => setNewMovie({ ...newMovie, duration: e.target.value })}
                        className="bg-white/5 border-white/10 text-white text-sm"
                        placeholder="2h 15min"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-gray-300 text-xs">Rating</Label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        max="10"
                        value={newMovie.rating}
                        onChange={(e) => setNewMovie({ ...newMovie, rating: e.target.value })}
                        className="bg-white/5 border-white/10 text-white text-sm"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-gray-300 text-xs">Género</Label>
                      <Input
                        value={newMovie.genre}
                        onChange={(e) => setNewMovie({ ...newMovie, genre: e.target.value })}
                        className="bg-white/5 border-white/10 text-white text-sm"
                        placeholder="Acción, Drama..."
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-gray-300 text-xs">Categoría</Label>
                      <select
                        value={newMovie.category}
                        onChange={(e) => setNewMovie({ ...newMovie, category: e.target.value })}
                        className="w-full h-9 rounded-md bg-white/5 border border-white/10 text-white text-sm px-3"
                      >
                        <option value="peliculas">Películas</option>
                        <option value="series">Series</option>
                        <option value="deportes">Deportes</option>
                        <option value="tv">TV en Vivo</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={handleAddMovie}
                      disabled={addingMovie || !newMovie.title}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm"
                    >
                      {addingMovie ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Plus className="h-4 w-4 mr-2" />
                      )}
                      Crear Película
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setAddDialogOpen(false)}
                      className="border-white/10 text-gray-300 text-sm"
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Movies Table */}
          <div className="overflow-x-auto">
            <div className="min-w-[600px]">
              <div className="grid grid-cols-[40px_1fr_80px_80px_80px_80px] gap-3 pb-3 border-b border-white/10 px-3">
                <div className="text-gray-500 text-xs">#</div>
                <div className="text-gray-500 text-xs">Título</div>
                <div className="text-gray-500 text-xs">Categoría</div>
                <div className="text-gray-500 text-xs">Año</div>
                <div className="text-gray-500 text-xs">Rating</div>
                <div className="text-gray-500 text-xs">Acción</div>
              </div>
              <div className="max-h-96 overflow-y-auto custom-scrollbar">
                {movies.map((movie, index) => (
                  <div
                    key={movie.id}
                    className="grid grid-cols-[40px_1fr_80px_80px_80px_80px] gap-3 py-3 border-b border-white/5 hover:bg-white/5 px-3 items-center transition-colors rounded"
                  >
                    <div className="text-gray-400 text-xs">{index + 1}</div>
                    <div className="flex items-center gap-2 min-w-0">
                      <img
                        src={movie.posterUrl}
                        alt={movie.title}
                        className="w-8 h-12 rounded object-cover flex-shrink-0"
                      />
                      <span className="text-white text-sm truncate">{movie.title}</span>
                    </div>
                    <div>
                      <Badge
                        variant="secondary"
                        className="bg-white/5 text-gray-400 text-[10px] capitalize"
                      >
                        {movie.category}
                      </Badge>
                    </div>
                    <div className="text-gray-300 text-sm">{movie.year}</div>
                    <div className="text-yellow-400 text-sm font-medium">{movie.rating}</div>
                    <div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteMovie(movie.id)}
                        className="h-7 w-7 text-gray-500 hover:text-red-400 hover:bg-red-600/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function Shield(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
