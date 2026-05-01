'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useAuthStore } from '@/lib/store';
import { useT } from '@/lib/i18n';
import { Eye, EyeOff, LogIn, Loader2 } from 'lucide-react';

export function LoginView() {
  const { isLoading } = useAuthStore();
  const { t } = useT();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError(t('login.fillAll'));
      return;
    }

    try {
      const result = await signIn('credentials', {
        username: username.trim().toLowerCase(),
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(t('login.invalidCredentials'));
      }
      // If successful, AuthSync will update the store automatically
    } catch {
      setError(t('login.invalidCredentials'));
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      // signIn with redirect:false so we can handle errors
      const result = await signIn('google', {
        callbackUrl: '/',
        redirect: false,
      });
      
      if (result?.error) {
        setError(result.error === 'CallbackRouteError' 
          ? 'Error al conectar con Google. Verifica la configuración OAuth.' 
          : t('login.googleFailed'));
        setGoogleLoading(false);
      } else if (result?.url) {
        // NextAuth returned a URL — redirect manually
        window.location.href = result.url;
      } else {
        // No error and no URL — redirect might have happened
        // or signIn succeeded for some reason
        setGoogleLoading(false);
      }
    } catch (err) {
      console.error('[Google Login] Error:', err);
      setError(t('login.googleFailed'));
      setGoogleLoading(false);
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

          {/* Google login button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading || isLoading}
            className="w-full flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white py-3 rounded-xl font-medium transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {googleLoading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            )}
            {googleLoading ? 'Conectando con Google...' : t('login.google')}
          </button>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-transparent text-gray-500">{t('login.orAccount')}</span>
            </div>
          </div>

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

        {/* Default credentials hint */}
        <div className="mt-6 text-center">
          <p className="text-gray-600 text-xs">
            {t('login.availableUsers')} <span className="text-gray-400">admin</span> / <span className="text-gray-400">hele</span> / <span className="text-gray-400">usuario</span>
          </p>
          <p className="text-gray-700 text-xs mt-1">
            {t('login.defaultPassword')} <span className="text-gray-500">admin123</span> / <span className="text-gray-500">hele123</span> / <span className="text-gray-500">usuario123</span>
          </p>
        </div>
      </div>
    </div>
  );
}
