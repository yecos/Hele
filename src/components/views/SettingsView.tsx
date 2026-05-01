'use client';

import { useState } from 'react';
import { useFavoritesStore } from '@/lib/store';
import { Heart, Trash2, Wifi, WifiOff, Loader2, ExternalLink, Check, X as XIcon } from 'lucide-react';
import { useI18nStore, useT, LOCALE_FLAGS, LOCALE_LABELS, type AppLocale } from '@/lib/i18n';
import { TMDB_SERVERS, LATINO_SERVERS, SUBTITLED_SERVERS, LANG_LABELS } from '@/lib/sources';

export function SettingsView() {
  const { t } = useT();
  const { locale, setLocale } = useI18nStore();

  const [castAppId, setCastAppId] = useState(() => {
    try { return localStorage.getItem('xs-cast-app-id') || ''; } catch { return ''; }
  });
  const [castAppIdSaved, setCastAppIdSaved] = useState(false);
  const [castAppIdError, setCastAppIdError] = useState('');

  const clearFavorites = () => {
    if (confirm(t('settings.clearFavoritesConfirm'))) {
      localStorage.removeItem('xuper-favorites');
      window.location.reload();
    }
  };

  const clearHistory = () => {
    if (confirm(t('settings.clearHistoryConfirm'))) {
      localStorage.removeItem('xuper-history');
      window.location.reload();
    }
  };

  const clearData = () => {
    if (confirm(t('settings.clearAllConfirm'))) {
      localStorage.removeItem('xuper-favorites');
      localStorage.removeItem('xuper-history');
      localStorage.removeItem('xs-auth');
      localStorage.removeItem('xs-cast-app-id');
      window.location.reload();
    }
  };

  const saveCastAppId = () => {
    const trimmed = castAppId.trim();
    if (trimmed && !/^[A-Fa-f0-9]{12}$/.test(trimmed)) {
      setCastAppIdError(t('settings.castAppIdError'));
      return;
    }
    setCastAppIdError('');
    if (trimmed) {
      localStorage.setItem('xs-cast-app-id', trimmed);
      setCastAppIdSaved(true);
      setTimeout(() => setCastAppIdSaved(false), 2000);
    } else {
      localStorage.removeItem('xs-cast-app-id');
      setCastAppIdSaved(true);
      setTimeout(() => setCastAppIdSaved(false), 2000);
    }
  };

  const clearCastAppId = () => {
    setCastAppId('');
    localStorage.removeItem('xs-cast-app-id');
    setCastAppIdError('');
  };

  const isCustomReceiver = castAppId.trim().length > 0;

  return (
    <div className="pt-20 px-4 max-w-[600px] mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">{t('settings.title')}</h1>

      <div className="space-y-4">
        {/* Language */}
        <div className="bg-white/5 rounded-xl p-6 space-y-3">
          <h2 className="text-white font-semibold text-base flex items-center gap-2">
            <span className="text-red-500">●</span> {t('settings.language')}
          </h2>
          <div className="flex flex-wrap gap-2">
            {(['es', 'en', 'pt'] as AppLocale[]).map(loc => (
              <button
                key={loc}
                onClick={() => setLocale(loc)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  locale === loc
                    ? 'bg-red-600 text-white shadow-lg shadow-red-600/20'
                    : 'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className="text-base">{LOCALE_FLAGS[loc]}</span>
                {LOCALE_LABELS[loc]}
              </button>
            ))}
          </div>
        </div>

        {/* About */}
        <div className="bg-white/5 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="XuperStream" className="w-10 h-10" />
            <div>
              <h2 className="text-white font-semibold text-base">XuperStream</h2>
              <p className="text-gray-500 text-xs">{t('settings.version')}</p>
            </div>
          </div>
          <p className="text-gray-400 text-sm leading-relaxed">
            {t('settings.about')}
          </p>
        </div>

        {/* Servers */}
        <div className="bg-white/5 rounded-xl p-6 space-y-3">
          <h2 className="text-white font-semibold text-base flex items-center gap-2">
            <span className="text-red-500">●</span> {t('settings.servers')}
          </h2>
          <div className="space-y-3">
            {/* Latino servers */}
            <div>
              <p className="text-xs text-gray-500 mb-1.5 font-medium">{LANG_LABELS.latino} ({LATINO_SERVERS.length})</p>
              <div className="space-y-1">
                {LATINO_SERVERS.map((server, index) => (
                  <div key={server.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-300">{server.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      index === 0
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-green-500/20 text-green-400'
                    }`}>
                      {index === 0 ? '★ Principal' : t('settings.active')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            {/* Subtitled servers */}
            <div>
              <p className="text-xs text-gray-500 mb-1.5 font-medium">{LANG_LABELS.subtitulada} ({SUBTITLED_SERVERS.length})</p>
              <div className="space-y-1">
                {SUBTITLED_SERVERS.map((server) => (
                  <div key={server.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-300">{server.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
                      {t('settings.active')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <p className="text-gray-500 text-xs">{TMDB_SERVERS.length} {t('settings.serversDesc')}</p>
        </div>

        {/* Chromecast — Enhanced Settings */}
        <div className="bg-white/5 rounded-xl p-6 space-y-4">
          <h2 className="text-white font-semibold text-base flex items-center gap-2">
            <span className="text-red-500">●</span> {t('settings.chromecast')}
          </h2>

          {/* Current mode indicator */}
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/5">
            {isCustomReceiver ? (
              <>
                <Wifi className="text-green-400 shrink-0" size={18} />
                <div>
                  <p className="text-green-400 text-sm font-medium">{t('settings.customReceiverActive')}</p>
                  <p className="text-gray-500 text-xs">{t('settings.customReceiverDesc')}</p>
                </div>
              </>
            ) : (
              <>
                <WifiOff className="text-yellow-500 shrink-0" size={18} />
                <div>
                  <p className="text-yellow-400 text-sm font-medium">{t('settings.standardMode')}</p>
                  <p className="text-gray-500 text-xs">{t('settings.standardModeDesc')}</p>
                </div>
              </>
            )}
          </div>

          {/* App ID input */}
          <div className="space-y-2">
            <label className="text-gray-300 text-sm font-medium block">
              {t('settings.castReceiverAppId')}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={castAppId}
                onChange={(e) => { setCastAppId(e.target.value); setCastAppIdError(''); setCastAppIdSaved(false); }}
                placeholder={t('settings.castAppIdPlaceholder')}
                maxLength={12}
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm font-mono uppercase outline-none focus:border-red-500/50 transition-colors placeholder:text-gray-600 placeholder:normal-case"
              />
              {castAppId.trim() && (
                <button
                  onClick={clearCastAppId}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all"
                  title={t('settings.clear')}
                >
                  <XIcon size={16} />
                </button>
              )}
              <button
                onClick={saveCastAppId}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                  castAppIdSaved
                    ? 'bg-green-600/20 text-green-400'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
              >
                {castAppIdSaved ? (
                  <><Check size={14} /> {t('settings.saved')}</>
                ) : (
                  t('settings.save')
                )}
              </button>
            </div>
            {castAppIdError && (
              <p className="text-red-400 text-xs">{castAppIdError}</p>
            )}
          </div>

          {/* How to register */}
          <div className="border border-white/10 rounded-lg p-4 space-y-3">
            <h3 className="text-white text-sm font-semibold flex items-center gap-2">
              {t('settings.howToGetAppId')}
            </h3>
            <ol className="text-gray-400 text-xs space-y-2 leading-relaxed list-decimal list-inside">
              <li>
                {t('settings.step1')}{' '}
                <a
                  href="https://cast.google.com/publish"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-red-400 hover:text-red-300 underline inline-flex items-center gap-1"
                >
                  Google Cast Developer Console <ExternalLink size={10} />
                </a>
              </li>
              <li>{t('settings.step2')}</li>
              <li>{t('settings.step3')}</li>
              <li>{t('settings.step4')}</li>
              <li>{t('settings.step5')}</li>
              <li>{t('settings.step6')}</li>
            </ol>
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
              <p className="text-green-400 text-xs font-medium">{t('settings.whatChanges')}</p>
              <p className="text-green-400/70 text-xs mt-1">
                {t('settings.whatChangesDesc')}
              </p>
            </div>
          </div>

          {/* Troubleshooting */}
          <div className="space-y-2">
            <h3 className="text-gray-300 text-sm font-medium">{t('settings.troubleshooting')}</h3>
            <div className="text-gray-500 text-xs space-y-1.5">
              <p>• {t('settings.troubleshoot1')}</p>
              <p>• {t('settings.troubleshoot2')}</p>
              <p>• {t('settings.troubleshoot3')}</p>
              <p>• {t('settings.troubleshoot4')}</p>
              <p>• {t('settings.troubleshoot5')}</p>
            </div>
          </div>
        </div>

        {/* IPTV */}
        <div className="bg-white/5 rounded-xl p-6 space-y-3">
          <h2 className="text-white font-semibold text-base flex items-center gap-2">
            <span className="text-red-500">●</span> {t('settings.iptv')}
          </h2>
          <p className="text-gray-400 text-sm">{t('settings.iptvDesc')}</p>
          <div className="text-gray-500 text-xs space-y-1">
            <p>{t('settings.iptvSources')}</p>
            <p>{t('settings.iptvOnlyWorking')}</p>
            <p>{t('settings.chromecastIPTV')}</p>
          </div>
        </div>

        {/* PWA */}
        <div className="bg-white/5 rounded-xl p-6 space-y-3">
          <h2 className="text-white font-semibold text-base flex items-center gap-2">
            <span className="text-red-500">●</span> {t('settings.pwa')}
          </h2>
          <p className="text-gray-400 text-sm">{t('settings.pwaDesc')}</p>
          <div className="text-gray-500 text-xs space-y-1">
            <p>{t('settings.pwaOffline')}</p>
            <p>{t('settings.pwaCompat')}</p>
          </div>
        </div>

        {/* Data source */}
        <div className="bg-white/5 rounded-xl p-6 space-y-3">
          <h2 className="text-white font-semibold text-base flex items-center gap-2">
            <span className="text-red-500">●</span> {t('settings.data')}
          </h2>
          <p className="text-gray-400 text-sm">{t('settings.dataDesc')}</p>
        </div>

        {/* Storage management */}
        <div className="bg-white/5 rounded-xl p-6 space-y-3">
          <h2 className="text-white font-semibold text-base flex items-center gap-2">
            <span className="text-red-500">●</span> {t('settings.storage')}
          </h2>
          <p className="text-gray-400 text-sm">{t('settings.storageDesc')}</p>
          <div className="space-y-2 pt-2">
            <button
              onClick={clearFavorites}
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-red-400 transition-colors"
            >
              <Heart size={14} />
              {t('settings.clearFavorites')}
            </button>
            <button
              onClick={clearHistory}
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-red-400 transition-colors"
            >
              <Trash2 size={14} />
              {t('settings.clearHistory')}
            </button>
            <button
              onClick={clearData}
              className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 transition-colors font-medium"
            >
              {t('settings.clearAllData')}
            </button>
          </div>
        </div>
      </div>

      <div className="h-20" />
    </div>
  );
}
