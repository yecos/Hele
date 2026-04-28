'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Menu,
  User,
  Heart,
  Film,
  Tv,
  Trophy,
  Radio,
  ChevronDown,
  Clock,
  CreditCard,
  Shield,
  LogOut,
  Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAppStore } from '@/lib/store';
import { useCastStore } from '@/lib/cast-store';
import CastButton from './CastButton';

const navLinks = [
  { label: 'Inicio', view: 'home' as const, category: 'all', icon: null },
  { label: 'Películas', view: 'category' as const, category: 'peliculas', icon: Film },
  { label: 'Series', view: 'category' as const, category: 'series', icon: Tv },
  { label: 'Deportes', view: 'category' as const, category: 'deportes', icon: Trophy },
  { label: 'TV en Vivo', view: 'category' as const, category: 'tv', icon: Radio },
  { label: 'Mi Lista', view: 'favorites' as const, category: 'all', icon: Heart },
];

export default function Navbar() {
  const {
    currentView,
    setCurrentView,
    setSelectedCategory,
    setSidebarOpen,
    userPlan,
    userName,
    userRole,
    isAuthenticated,
    setSelectedMovie,
  } = useAppStore();

  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavClick = (view: typeof navLinks[number]['view'], category: string) => {
    setCurrentView(view);
    setSelectedCategory(category);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleViewClick = (view: string) => {
    setCurrentView(view as typeof navLinks[number]['view']);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      useAppStore.getState().logout();
    } catch {
      // still logout locally
      useAppStore.getState().logout();
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <motion.nav
      initial={{ y: -80 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-black/90 backdrop-blur-xl shadow-lg shadow-black/30'
          : 'bg-gradient-to-b from-black/80 via-black/40 to-transparent backdrop-blur-sm'
      }`}
    >
      <div className="mx-auto max-w-[1800px] px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 sm:h-[68px] items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleNavClick('home', 'all')}
              className="flex items-center gap-1"
            >
              <span className="text-xl sm:text-2xl font-black tracking-tight text-red-600">
                XUPER
              </span>
              <span className="text-xs sm:text-sm font-light text-gray-400 tracking-widest uppercase">
                STREAM
              </span>
            </button>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => handleNavClick(link.view, link.category)}
                className={`relative px-3 py-2 text-sm font-medium transition-colors rounded-md ${
                  (currentView === link.view &&
                    (link.view !== 'category' ||
                      useAppStore.getState().selectedCategory === link.category)) ||
                  (link.view === 'home' && currentView === 'home')
                    ? 'text-white'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                {link.label}
                {((link.view === 'home' && currentView === 'home') ||
                  (link.view === 'category' &&
                    currentView === 'category' &&
                    useAppStore.getState().selectedCategory === link.category) ||
                  (link.view === 'favorites' && currentView === 'favorites')) && (
                  <motion.div
                    layoutId="nav-active"
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-6 bg-red-600 rounded-full"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Chromecast Button (connect from home screen) */}
            <CastButton
              size="md"
              onClick={() => {
                const store = useCastStore.getState();
                if (store.connected) {
                  store.stopCasting();
                } else {
                  store.requestSession();
                }
              }}
            />

            {/* Search Button */}
            {isAuthenticated && (
              <Button
                variant="ghost"
                size="icon"
                className="text-gray-300 hover:text-white hover:bg-white/10"
                onClick={() => {
                  setCurrentView('search');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                <Search className="h-5 w-5" />
              </Button>
            )}

            {/* User Menu */}
            {isAuthenticated && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex items-center gap-2 text-gray-300 hover:text-white hover:bg-white/10 px-2"
                  >
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="bg-red-600/20 text-red-500 text-xs font-bold">
                        {userName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:inline text-sm">{userName}</span>
                    <ChevronDown className="h-3 w-3 hidden sm:inline" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-52 bg-gray-900 border-gray-800 text-gray-200"
                >
                  <div className="flex items-center gap-2 px-2 py-2">
                    <User className="h-4 w-4 text-gray-400" />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium truncate block">{userName}</span>
                    </div>
                  </div>
                  <div className="px-2 pb-2">
                    <Badge
                      variant={userPlan === 'vip' ? 'default' : 'secondary'}
                      className={
                        userPlan === 'vip'
                          ? 'bg-yellow-600 text-white text-xs'
                          : userPlan === 'premium'
                          ? 'bg-red-600 text-white text-xs'
                          : 'bg-gray-700 text-gray-300 text-xs'
                      }
                    >
                      {userPlan === 'vip' ? '👑 VIP' : userPlan === 'premium' ? '⭐ Premium' : 'Gratis'}
                    </Badge>
                  </div>
                  <DropdownMenuSeparator className="bg-gray-800" />
                  <DropdownMenuItem
                    className="cursor-pointer focus:bg-gray-800 focus:text-white"
                    onClick={() => handleNavClick('favorites', 'all')}
                  >
                    <Heart className="h-4 w-4 mr-2" />
                    Mi Lista
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer focus:bg-gray-800 focus:text-white"
                    onClick={() => handleViewClick('watchHistory')}
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    Historial
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer focus:bg-gray-800 focus:text-white"
                    onClick={() => handleViewClick('profile')}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Mi Perfil
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer focus:bg-gray-800 focus:text-white"
                    onClick={() => handleViewClick('pricing')}
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Planes y Precios
                  </DropdownMenuItem>
                  {userRole === 'admin' && (
                    <>
                      <DropdownMenuSeparator className="bg-gray-800" />
                      <DropdownMenuItem
                        className="cursor-pointer focus:bg-gray-800 focus:text-red-400"
                        onClick={() => handleViewClick('admin')}
                      >
                        <Shield className="h-4 w-4 mr-2" />
                        Panel Admin
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator className="bg-gray-800" />
                  <DropdownMenuItem
                    className="cursor-pointer focus:bg-red-600/10 focus:text-red-400 text-red-400"
                    onClick={handleLogout}
                    disabled={loggingOut}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Cerrar Sesión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Mobile Hamburger */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-gray-300 hover:text-white hover:bg-white/10"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-black/95 backdrop-blur-xl border-t border-gray-800 overflow-hidden"
          >
            <div className="px-4 py-3 space-y-1">
              {navLinks.map((link) => (
                <button
                  key={link.label}
                  onClick={() => {
                    handleNavClick(link.view, link.category);
                    setMobileMenuOpen(false);
                  }}
                  className={`flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                    currentView === link.view
                      ? 'bg-red-600/20 text-red-500'
                      : 'text-gray-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {link.icon && <link.icon className="h-4 w-4" />}
                  {link.label}
                </button>
              ))}

              {isAuthenticated && (
                <>
                  <div className="border-t border-gray-800 my-2" />
                  <button
                    onClick={() => {
                      handleViewClick('watchHistory');
                      setMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                  >
                    <Clock className="h-4 w-4" />
                    Historial
                  </button>
                  <button
                    onClick={() => {
                      handleViewClick('pricing');
                      setMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                  >
                    <CreditCard className="h-4 w-4" />
                    Planes
                  </button>
                  <button
                    onClick={() => {
                      handleViewClick('profile');
                      setMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                  >
                    <Settings className="h-4 w-4" />
                    Perfil
                  </button>
                  {userRole === 'admin' && (
                    <button
                      onClick={() => {
                        handleViewClick('admin');
                        setMobileMenuOpen(false);
                      }}
                      className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-600/10 rounded-lg transition-colors"
                    >
                      <Shield className="h-4 w-4" />
                      Panel Admin
                    </button>
                  )}
                  <button
                    onClick={() => {
                      handleLogout();
                      setMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-600/10 rounded-lg transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Cerrar Sesión
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
