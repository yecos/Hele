'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/store';
import { useT } from '@/lib/i18n';
import { Eye, EyeOff, LogIn, Loader2 } from 'lucide-react';

export function LoginView() {
  const { login, isLoading } = useAuthStore();
  const { t } = useT();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  // Clean up NextAuth error parameters from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('error')) {
      // Remove error param from URL without reload
      params.delete('error');
      const newUrl = params.toString()
        ? `${window.location.pathname}?${params.toString()}`
        : window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError(t('login.fillAll'));
      return;
    }

    const success = await login(username.trim(), password);
    if (!success) {
      setError(t('login.invalidCredentials'));
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      {/* Background gradient effect */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-600/10 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-red-700/8 rounded-full blur-[128px]" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <img src="/logo.svg" alt="XuperStream" className="w-20 h-20 drop-shadow-lg shadow-red-600/20" />
          </div>
          <h1 className="text-3xl font-bold text-white">
            Xuper<span className="text-red-500">Stream</span>
          </h1>
          <p className="text-gray-500 text-sm mt-2">{t('login.subtitle')}</p>
        </div>

        {/* Login form */}
        <form onSubmit={handleSubmit} className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-8 space-y-5">
          {/* Error message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm text-center">
              {error}
            </div>
          )}
          {/* Username */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">{t('login.username')}</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder={t('login.usernamePlaceholder')}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-red-500/50 transition-colors placeholder:text-gray-500"
              autoComplete="username"
            />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">{t('login.password')}</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={t('login.passwordPlaceholder')}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-red-500/50 transition-colors placeholder:text-gray-500 pr-12"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-600/20"
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                {t('login.loggingIn')}
              </>
            ) : (
              <>
                <LogIn size={18} />
                {t('login.submit')}
              </>
            )}
          </button>
        </form>

        {/* Secure login hint */}
        <div className="mt-6 text-center">
          <p className="text-gray-600 text-xs">
            {t('login.secureHint') || 'Accede con tu usuario y contraseña'}
          </p>
        </div>
      </div>
    </div>
  );
}
