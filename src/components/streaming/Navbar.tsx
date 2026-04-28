'use client';

import { useState } from 'react';
import { useViewStore } from '@/lib/store';
import { Search, Heart, Home, Settings, Menu, X } from 'lucide-react';

export function Navbar() {
  const { currentView, setView, setSearchQuery } = useViewStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setSearchQuery(searchInput.trim());
      setView('search');
      setMobileMenuOpen(false);
    }
  };

  const navItems = [
    { id: 'home' as const, label: 'Inicio', icon: Home },
    { id: 'search' as const, label: 'Buscar', icon: Search },
    { id: 'favorites' as const, label: 'Mi Lista', icon: Heart },
    { id: 'settings' as const, label: 'Ajustes', icon: Settings },
  ];

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-md border-b border-white/5">
        <div className="max-w-[1400px] mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <button onClick={() => { setView('home'); setMobileMenuOpen(false); }} className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-white font-black text-sm group-hover:scale-105 transition-transform">
              XS
            </div>
            <span className="text-xl font-bold text-white hidden sm:block">
              Xuper<span className="text-red-500">Stream</span>
            </span>
          </button>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const active = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setView(item.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                    active
                      ? 'bg-white/10 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon size={16} />
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="hidden sm:flex items-center bg-white/5 rounded-full px-4 py-2 border border-white/10 focus-within:border-red-500/50 transition-colors w-64 lg:w-80">
            <Search size={16} className="text-gray-400 mr-2 shrink-0" />
            <input
              type="text"
              placeholder="Buscar películas o series..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              className="bg-transparent text-white text-sm outline-none w-full placeholder:text-gray-500"
            />
          </form>

          {/* Mobile menu button */}
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden text-white p-2">
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile search */}
        <div className="sm:hidden px-4 pb-3">
          <form onSubmit={handleSearch} className="flex items-center bg-white/5 rounded-full px-4 py-2 border border-white/10">
            <Search size={16} className="text-gray-400 mr-2 shrink-0" />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              className="bg-transparent text-white text-sm outline-none w-full placeholder:text-gray-500"
            />
          </form>
        </div>
      </nav>

      {/* Mobile dropdown menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 pt-28 md:hidden" onClick={() => setMobileMenuOpen(false)}>
          <div className="absolute top-16 left-0 right-0 bg-black/95 backdrop-blur-lg border-b border-white/5 p-4 space-y-1" onClick={e => e.stopPropagation()}>
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
          </div>
        </div>
      )}
    </>
  );
}
