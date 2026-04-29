'use client';

import { useState, useEffect, useRef } from 'react';
import { useViewStore, useAuthStore, useCastStore } from '@/lib/store';
import { useChromecast } from '@/hooks/use-chromecast';
import { useT } from '@/lib/i18n';
import { Search, Heart, Home, Settings, Menu, X, Film, Tv, Radio, LogOut, User, Cast, Clock } from 'lucide-react';

export function Navbar() {
  const { currentView, setView, setSearchQuery } = useViewStore();
  const { isLoggedIn, username, logout } = useAuthStore();
  const { setCastState } = useCastStore();
  const cast = useChromecast();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { t } = useT();

  // Close user menu on click outside
  useEffect(() => {
    if (!showUserMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showUserMenu]);

  // Sync cast state to global store
  useEffect(() => {
    setCastState(cast.isCasting, cast.device?.friendlyName || null);
  }, [cast.isCasting, cast.device?.friendlyName, setCastState]);

  const isActivelyCasting = cast.isConnected;
  const castStatus = cast.status;

  const handleCastClick = async () => {
    if (isActivelyCasting) {
      cast.disconnect();
    } else {
      await cast.connect();
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setSearchQuery(searchInput.trim());
      setView('search');
      setMobileMenuOpen(false);
    }
  };

  const navItems = [
    { id: 'home' as const, label: t('nav.home'), icon: Home },
    { id: 'movies' as const, label: t('nav.movies'), icon: Film },
    { id: 'series' as const, label: t('nav.series'), icon: Tv },
    { id: 'iptv' as const, label: t('nav.iptv'), icon: Radio },
    { id: 'search' as const, label: t('nav.search'), icon: Search },
    { id: 'history' as const, label: t('nav.history'), icon: Clock },
    { id: 'favorites' as const, label: t('nav.favorites'), icon: Heart },
    { id: 'settings' as const, label: t('nav.settings'), icon: Settings },
  ];

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-md border-b border-white/5">
        <div className="max-w-[1400px] mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <button onClick={() => { setView('home'); setMobileMenuOpen(false); }} className="flex items-center gap-2 group">
            <img src="/logo.svg" alt="X" className="w-9 h-9 group-hover:scale-105 transition-transform" />
            <span className="text-xl font-bold text-white hidden sm:block">
              Xuper<span className="text-red-500">Stream</span>
            </span>
          </button>

          {/* Desktop nav */}
          <div className="hidden lg:flex items-center gap-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const active = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setView(item.id)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                    active
                      ? 'bg-white/10 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon size={15} />
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* Right side: search + cast + user */}
          <div className="flex items-center gap-2">
            {/* Chromecast button */}
            <button
              onClick={handleCastClick}
              className={`p-2 rounded-full transition-all relative ${
                castStatus === 'connected'
                  ? 'bg-green-600/20 text-green-400 hover:bg-green-600/30'
                  : castStatus === 'connecting'
                  ? 'bg-yellow-500/20 text-yellow-400 animate-pulse'
                  : castStatus === 'error'
                  ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                  : castStatus === 'loading'
                  ? 'bg-white/5 text-gray-500'
                  : 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white'
              }`}
              title={cast.statusMessage || (isActivelyCasting ? `${t('nav.connectedTo')} ${cast.device?.friendlyName || 'Chromecast'}` : t('nav.chromecast'))}
            >
              <Cast size={18} />
              {castStatus === 'connecting' && (
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-yellow-500 rounded-full animate-ping" />
              )}
              {castStatus === 'connected' && (
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full" />
              )}
            </button>
            {/* Search bar - desktop */}
            <form onSubmit={handleSearch} className="hidden sm:flex items-center bg-white/5 rounded-full px-4 py-2 border border-white/10 focus-within:border-red-500/50 transition-colors w-52 lg:w-64">
              <Search size={16} className="text-gray-400 mr-2 shrink-0" />
              <input
                type="text"
                placeholder={t('nav.searchPlaceholder')}
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                className="bg-transparent text-white text-sm outline-none w-full placeholder:text-gray-500"
              />
            </form>

            {/* User button */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-all"
              >
                <div className="w-7 h-7 rounded-full bg-red-600 flex items-center justify-center">
                  <User size={14} className="text-white" />
                </div>
                <span className="text-sm font-medium hidden sm:block">{username}</span>
              </button>

              {/* User dropdown */}
              {showUserMenu && (
                <div className="absolute right-0 top-12 bg-gray-900 border border-white/10 rounded-xl shadow-2xl p-2 w-48 z-50">
                  <div className="px-3 py-2 border-b border-white/5 mb-1">
                    <p className="text-white text-sm font-medium">{username}</p>
                    <p className="text-gray-500 text-xs">{t('nav.personalAccount')}</p>
                  </div>
                  <button
                    onClick={() => { setView('settings'); setShowUserMenu(false); }}
                    className="w-full px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-white/5 hover:text-white flex items-center gap-2 transition-all"
                  >
                    <Settings size={14} />
                    {t('nav.settings')}
                  </button>
                  <button
                    onClick={() => { logout(); setShowUserMenu(false); }}
                    className="w-full px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 flex items-center gap-2 transition-all"
                  >
                    <LogOut size={14} />
                    {t('nav.logout')}
                  </button>
                </div>
              )}
            </div>

            {/* Mobile menu button */}
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="lg:hidden text-white p-2">
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile search */}
        <div className="sm:hidden px-4 pb-3">
          <form onSubmit={handleSearch} className="flex items-center bg-white/5 rounded-full px-4 py-2 border border-white/10">
            <Search size={16} className="text-gray-400 mr-2 shrink-0" />
            <input
              type="text"
              placeholder={t('nav.searchPlaceholder')}
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              className="bg-transparent text-white text-sm outline-none w-full placeholder:text-gray-500"
            />
          </form>
        </div>
      </nav>

      {/* Mobile dropdown menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 pt-32 lg:hidden" onClick={() => setMobileMenuOpen(false)}>
          <div className="absolute top-16 left-0 right-0 bg-black/95 backdrop-blur-lg border-b border-white/5 p-4 space-y-1 max-h-[70vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {navItems.map(item => {
              const Icon = item.icon;
              const active = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => { setView(item.id); setMobileMenuOpen(false); }}
                  className={`w-full px-4 py-3 rounded-lg text-left text-sm font-medium transition-all flex items-center gap-3 ${
                    active ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon size={18} />
                  {item.label}
                </button>
              );
            })}

            {/* Logout in mobile */}
            <div className="border-t border-white/5 mt-3 pt-3">
              <button
                onClick={async () => { await handleCastClick(); setMobileMenuOpen(false); }}
                className={`w-full px-4 py-3 rounded-lg text-left text-sm font-medium transition-all flex items-center gap-3 mb-1 ${
                  isActivelyCasting
                    ? 'text-green-400 bg-green-600/10'
                    : cast.status === 'loading'
                    ? 'text-gray-500'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Cast size={18} />
                {cast.status === 'loading'
                  ? t('nav.chromecastLoading')
                  : isActivelyCasting
                  ? t('iptv.castingOn', { device: cast.device?.friendlyName || 'Chromecast' })
                  : cast.isAvailable
                  ? t('nav.chromecast')
                  : t('nav.chromecastUnavailable')}
              </button>
              <button
                onClick={() => { logout(); setMobileMenuOpen(false); }}
                className="w-full px-4 py-3 rounded-lg text-left text-sm font-medium text-red-400 hover:bg-red-500/10 flex items-center gap-3 transition-all"
              >
                <LogOut size={18} />
                {t('nav.logout')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
