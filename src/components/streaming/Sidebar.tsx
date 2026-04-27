'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  User,
  Heart,
  Film,
  Tv,
  Trophy,
  Radio,
  X,
  Crown,
  Clock,
  CreditCard,
  Settings,
  Shield,
  LogOut,
  Server,
  Globe,
  Magnet,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/lib/store';

const navLinks = [
  { label: 'Inicio', view: 'home' as const, category: 'all', icon: null },
  { label: 'Películas', view: 'category' as const, category: 'peliculas', icon: Film },
  { label: 'Series', view: 'category' as const, category: 'series', icon: Tv },
  { label: 'Deportes', view: 'category' as const, category: 'deportes', icon: Trophy },
  { label: 'TV en Vivo', view: 'category' as const, category: 'tv', icon: Radio },
  { label: 'Mi Lista', view: 'favorites' as const, category: 'all', icon: Heart },
];

export default function Sidebar() {
  const {
    sidebarOpen,
    setSidebarOpen,
    currentView,
    setCurrentView,
    setSelectedCategory,
    userName,
    userPlan,
    userRole,
    isAuthenticated,
  } = useAppStore();

  const handleNavClick = (view: (typeof navLinks)[number]['view'], category: string) => {
    setCurrentView(view);
    setSelectedCategory(category);
    setSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleViewClick = (view: string) => {
    setCurrentView(view as (typeof navLinks)[number]['view']);
    setSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // silent
    }
    useAppStore.getState().logout();
  };

  return (
    <AnimatePresence>
      {sidebarOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[90] bg-black/70 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />

          {/* Sidebar Panel */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed left-0 top-0 bottom-0 z-[95] w-[280px] bg-gray-950 border-r border-gray-800/50 shadow-2xl shadow-black/50 flex flex-col lg:hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800/50">
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-black tracking-tight text-red-600">XUPER</span>
                <span className="text-[10px] font-light text-gray-500 tracking-widest uppercase">
                  STREAM
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(false)}
                className="text-gray-400 hover:text-white hover:bg-white/10 h-8 w-8 rounded-full"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Navigation Links */}
            <nav className="flex-1 overflow-y-auto py-3 px-3">
              <div className="space-y-0.5">
                {navLinks.map((link) => {
                  const isActive =
                    (link.view === 'home' && currentView === 'home') ||
                    (link.view === 'category' &&
                      currentView === 'category' &&
                      useAppStore.getState().selectedCategory === link.category) ||
                    (link.view === 'favorites' && currentView === 'favorites');

                  return (
                    <button
                      key={link.label}
                      onClick={() => handleNavClick(link.view, link.category)}
                      className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-red-600/15 text-red-500'
                          : 'text-gray-300 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {link.icon && (
                        <link.icon
                          className={`h-[18px] w-[18px] ${
                            isActive ? 'text-red-500' : 'text-gray-500'
                          }`}
                        />
                      )}
                      <span>{link.label}</span>
                      {isActive && (
                        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-red-500" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Search */}
              <div className="mt-4 pt-4 border-t border-gray-800/50">
                <button
                  onClick={() => {
                    setCurrentView('search');
                    setSidebarOpen(false);
                  }}
                  className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-all"
                >
                  <Search className="h-[18px] w-[18px] text-gray-500" />
                  <span>Buscar</span>
                </button>
              </div>

              {/* Additional Links */}
              <div className="mt-2 pt-2 border-t border-gray-800/50 space-y-0.5">
                <button
                  onClick={() => handleViewClick('iptv')}
                  className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    currentView === 'iptv'
                      ? 'bg-red-600/15 text-red-500'
                      : 'text-gray-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Server
                    className={`h-[18px] w-[18px] ${
                      currentView === 'iptv' ? 'text-red-500' : 'text-gray-500'
                    }`}
                  />
                  <span>IPTV / Xuper</span>
                </button>

                <button
                  onClick={() => handleViewClick('iptvOrg')}
                  className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    currentView === 'iptvOrg'
                      ? 'bg-purple-600/15 text-purple-500'
                      : 'text-gray-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Globe
                    className={`h-[18px] w-[18px] ${
                      currentView === 'iptvOrg' ? 'text-purple-500' : 'text-gray-500'
                    }`}
                  />
                  <span>IPTV Mundial</span>
                  <Badge className="bg-purple-600/20 text-purple-400 border-purple-600/30 text-[10px] px-1.5 py-0 ml-auto">
                    NEW
                  </Badge>
                </button>

                <button
                  onClick={() => handleViewClick('torrent')}
                  className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    currentView === 'torrent'
                      ? 'bg-red-600/15 text-red-500'
                      : 'text-gray-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Magnet
                    className={`h-[18px] w-[18px] ${
                      currentView === 'torrent' ? 'text-red-500' : 'text-gray-500'
                    }`}
                  />
                  <span>Torrent</span>
                </button>

                <button
                  onClick={() => handleViewClick('watchHistory')}
                  className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    currentView === 'watchHistory'
                      ? 'bg-red-600/15 text-red-500'
                      : 'text-gray-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Clock
                    className={`h-[18px] w-[18px] ${
                      currentView === 'watchHistory' ? 'text-red-500' : 'text-gray-500'
                    }`}
                  />
                  <span>Historial</span>
                </button>

                <button
                  onClick={() => handleViewClick('pricing')}
                  className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    currentView === 'pricing'
                      ? 'bg-red-600/15 text-red-500'
                      : 'text-gray-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <CreditCard
                    className={`h-[18px] w-[18px] ${
                      currentView === 'pricing' ? 'text-red-500' : 'text-gray-500'
                    }`}
                  />
                  <span>Planes</span>
                </button>

                <button
                  onClick={() => handleViewClick('profile')}
                  className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    currentView === 'profile'
                      ? 'bg-red-600/15 text-red-500'
                      : 'text-gray-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Settings
                    className={`h-[18px] w-[18px] ${
                      currentView === 'profile' ? 'text-red-500' : 'text-gray-500'
                    }`}
                  />
                  <span>Perfil</span>
                </button>

                {userRole === 'admin' && (
                  <button
                    onClick={() => handleViewClick('admin')}
                    className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      currentView === 'admin'
                        ? 'bg-red-600/15 text-red-500'
                        : 'text-red-400 hover:text-red-300 hover:bg-red-600/10'
                    }`}
                  >
                    <Shield className="h-[18px] w-[18px] text-red-500" />
                    <span>Admin</span>
                  </button>
                )}
              </div>
            </nav>

            {/* User Info */}
            {isAuthenticated ? (
              <div className="border-t border-gray-800/50 px-4 py-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-red-600/20 text-red-500 text-sm font-bold">
                      {userName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{userName}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      {userPlan === 'vip' ? (
                        <Badge className="bg-yellow-600/20 text-yellow-500 border-yellow-600/30 text-[10px] px-1.5 py-0 font-bold">
                          <Crown className="h-2.5 w-2.5 mr-1" />
                          VIP
                        </Badge>
                      ) : (
                        <Badge
                          variant="secondary"
                          className="bg-gray-800 text-gray-400 text-[10px] px-1.5 py-0"
                        >
                          Gratis
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  onClick={handleLogout}
                  className="w-full mt-3 h-9 text-red-400 hover:text-red-300 hover:bg-red-600/10 text-xs justify-start"
                >
                  <LogOut className="h-3.5 w-3.5 mr-2" />
                  Cerrar Sesión
                </Button>
              </div>
            ) : (
              <div className="border-t border-gray-800/50 px-4 py-4">
                <Button
                  onClick={() => {
                    setCurrentView('auth');
                    setSidebarOpen(false);
                  }}
                  className="w-full h-10 bg-red-600 hover:bg-red-700 text-white text-sm"
                >
                  Iniciar Sesión
                </Button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
