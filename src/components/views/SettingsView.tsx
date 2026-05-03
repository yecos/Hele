'use client';

import { useState, useEffect } from 'react';
import { useFavoritesStore } from '@/lib/store';
import { Heart, Trash2, Wifi, WifiOff, ExternalLink, Check, X as XIcon, Download, Upload, Database, Monitor, Volume2, Subtitles, RefreshCw, HardDrive, Info, ChevronDown, ChevronUp } from 'lucide-react';
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

  // Storage info
  const [storageInfo, setStorageInfo] = useState<{ used: string; items: { key: string; size: string }[] }>({ used: '0 B', items: [] });
  const [showStorageDetails, setShowStorageDetails] = useState(false);

  // Playback preferences
  const [defaultLang, setDefaultLang] = useState(() => {
    try { return localStorage.getItem('xs-default-lang') || 'latino'; } catch { return 'latino'; }
  });
  const [autoPlay, setAutoPlay] = useState(() => {
    try { return localStorage.getItem('xs-autoplay') !== 'false'; } catch { return true; }
  });
  const [showProbeResults, setShowProbeResults] = useState(() => {
    try { return localStorage.getItem('xs-show-probe') !== 'false'; } catch { return true; }
  });

  // Expandable sections
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Calculate storage info
  useEffect(() => {
    const calculateStorage = () => {
      const items: { key: string; size: string }[] = [];
      let totalBytes = 0;

      const keysToCheck = [
        'xuper-favorites',
        'xuper-history',
        'xs-auth',
        'xs-cast-app-id',
        'xs-iptv-favorites',
        'xs-iptv-recent',
        'xs-onboarding-done',
        'xs-default-lang',
        'xs-autoplay',
        'xs-show-probe',
        'xuper-session',
        'xs-i18n-locale',
      ];

      try {
        // Check known keys
        for (const key of keysToCheck) {
          const value = localStorage.getItem(key);
          if (value) {
            const bytes = new Blob([value]).size;
            totalBytes += bytes;
            items.push({ key, size: formatBytes(bytes) });
          }
        }

        // Check for working-server cache keys
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('xs-working-') && !keysToCheck.includes(key)) {
            const value = localStorage.getItem(key);
            if (value) {
              const bytes = new Blob([value]).size;
              totalBytes += bytes;
              items.push({ key, size: formatBytes(bytes) });
            }
          }
        }
      } catch {}

      setStorageInfo({ used: formatBytes(totalBytes), items });
    };

    calculateStorage();
  }, []);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

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

  const clearCache = () => {
    if (confirm(t('settings.clearCacheConfirm', { default: '¿Borrar la caché de servidores? Esto no afecta tus favoritos ni historial.' }))) {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('xs-working-')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      window.location.reload();
    }
  };

  const clearData = () => {
    if (confirm(t('settings.clearAllConfirm'))) {
      localStorage.clear();
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
      localStorage.setItem('xs-cast-app-id', trimmed.toUpperCase());
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

  const saveDefaultLang = (lang: string) => {
    setDefaultLang(lang);
    localStorage.setItem('xs-default-lang', lang);
  };

  const saveAutoPlay = (value: boolean) => {
    setAutoPlay(value);
    localStorage.setItem('xs-autoplay', value ? 'true' : 'false');
  };

  const saveShowProbe = (value: boolean) => {
    setShowProbeResults(value);
    localStorage.setItem('xs-show-probe', value ? 'true' : 'false');
  };

  // Export data
  const exportData = () => {
    try {
      const data: Record<string, any> = {};
      const keysToExport = [
        'xuper-favorites', 'xuper-history', 'xs-auth', 'xs-cast-app-id',
        'xs-iptv-favorites', 'xs-iptv-recent', 'xs-default-lang',
        'xs-autoplay', 'xs-show-probe', 'xs-i18n-locale',
      ];

      for (const key of keysToExport) {
        const value = localStorage.getItem(key);
        if (value) data[key] = value;
      }

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `xuperstream-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {}
  };

  // Import data
  const importData = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);

        if (confirm(t('settings.importConfirm', { default: '¿Importar datos? Esto reemplazará los datos actuales.' }))) {
          for (const [key, value] of Object.entries(data)) {
            localStorage.setItem(key, value as string);
          }
          window.location.reload();
        }
      } catch {
        alert(t('settings.importError', { default: 'Error al importar. Asegúrate de que el archivo es válido.' }));
      }
    };
    input.click();
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

        {/* Playback Preferences */}
        <div className="bg-white/5 rounded-xl p-6 space-y-4">
          <h2 className="text-white font-semibold text-base flex items-center gap-2">
            <span className="text-red-500">●</span> {t('settings.playback', { default: 'Reproducción' })}
          </h2>

          {/* Default audio language */}
          <div className="space-y-2">
            <label className="text-gray-300 text-sm font-medium flex items-center gap-2">
              <Volume2 size={14} />
              {t('settings.defaultAudio', { default: 'Idioma de audio predeterminado' })}
            </label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(LANG_LABELS).map(([lang, label]) => (
                <button
                  key={lang}
                  onClick={() => saveDefaultLang(lang)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    defaultLang === lang
                      ? 'bg-red-600 text-white'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Autoplay */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Monitor size={14} className="text-gray-400" />
              <div>
                <p className="text-gray-300 text-sm font-medium">{t('settings.autoPlay', { default: 'Reproducción automática' })}</p>
                <p className="text-gray-500 text-xs">{t('settings.autoPlayDesc', { default: 'Reproducir automáticamente al seleccionar' })}</p>
              </div>
            </div>
            <button
              onClick={() => saveAutoPlay(!autoPlay)}
              className={`w-11 h-6 rounded-full transition-all relative ${
                autoPlay ? 'bg-red-600' : 'bg-white/10'
              }`}
            >
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${
                autoPlay ? 'left-[22px]' : 'left-0.5'
              }`} />
            </button>
          </div>

          {/* Show probe results */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Subtitles size={14} className="text-gray-400" />
              <div>
                <p className="text-gray-300 text-sm font-medium">{t('settings.showServerStatus', { default: 'Mostrar estado de servidores' })}</p>
                <p className="text-gray-500 text-xs">{t('settings.showServerStatusDesc', { default: 'Indicadores de disponibilidad en los servidores' })}</p>
              </div>
            </div>
            <button
              onClick={() => saveShowProbe(!showProbeResults)}
              className={`w-11 h-6 rounded-full transition-all relative ${
                showProbeResults ? 'bg-red-600' : 'bg-white/10'
              }`}
            >
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${
                showProbeResults ? 'left-[22px]' : 'left-0.5'
              }`} />
            </button>
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
          <button
            onClick={() => toggleSection('servers')}
            className="w-full flex items-center justify-between"
          >
            <h2 className="text-white font-semibold text-base flex items-center gap-2">
              <span className="text-red-500">●</span> {t('settings.servers')}
            </h2>
            {expandedSections['servers'] ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
          </button>

          {expandedSections['servers'] && (
            <div className="space-y-3 pt-1">
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
          )}
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

          {/* Quick mode comparison */}
          <div className="grid grid-cols-2 gap-2">
            <div className={`p-3 rounded-lg border text-center text-xs ${
              !isCustomReceiver ? 'border-yellow-500/50 bg-yellow-500/10' : 'border-white/5 bg-white/[0.02]'
            }`}>
              <p className="font-semibold mb-1 {!isCustomReceiver ? 'text-yellow-400' : 'text-gray-500'}">
                {t('settings.standardMode')}
              </p>
              <p className="text-gray-500 text-[10px]">{t('settings.chromecastIPTV')}</p>
            </div>
            <div className={`p-3 rounded-lg border text-center text-xs ${
              isCustomReceiver ? 'border-green-500/50 bg-green-500/10' : 'border-white/5 bg-white/[0.02]'
            }`}>
              <p className={`font-semibold mb-1 ${isCustomReceiver ? 'text-green-400' : 'text-gray-500'}`}>
                {t('settings.customReceiverActive')}
              </p>
              <p className="text-gray-500 text-[10px]">{t('settings.customReceiverDesc')}</p>
            </div>
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
            <button
              onClick={() => toggleSection('cast-help')}
              className="w-full flex items-center justify-between text-sm"
            >
              <h3 className="text-white text-sm font-semibold flex items-center gap-2">
                {t('settings.howToGetAppId')}
              </h3>
              {expandedSections['cast-help'] ? <ChevronUp size={14} className="text-gray-500" /> : <ChevronDown size={14} className="text-gray-500" />}
            </button>

            {expandedSections['cast-help'] && (
              <>
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
                  <li>{t('settings.step4')} <code className="bg-white/10 px-1.5 py-0.5 rounded text-red-400">https://tu-app.com/cast-receiver.html</code></li>
                  <li>{t('settings.step5')}</li>
                  <li>{t('settings.step6')}</li>
                </ol>
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
                  <p className="text-green-400 text-xs font-medium">{t('settings.whatChanges')}</p>
                  <p className="text-green-400/70 text-xs mt-1">
                    {t('settings.whatChangesDesc')}
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Troubleshooting */}
          <div className="space-y-2">
            <button
              onClick={() => toggleSection('troubleshoot')}
              className="w-full flex items-center justify-between"
            >
              <h3 className="text-gray-300 text-sm font-medium">{t('settings.troubleshooting')}</h3>
              {expandedSections['troubleshoot'] ? <ChevronUp size={14} className="text-gray-500" /> : <ChevronDown size={14} className="text-gray-500" />}
            </button>

            {expandedSections['troubleshoot'] && (
              <div className="text-gray-500 text-xs space-y-1.5">
                <p>• {t('settings.troubleshoot1')}</p>
                <p>• {t('settings.troubleshoot2')}</p>
                <p>• {t('settings.troubleshoot3')}</p>
                <p>• {t('settings.troubleshoot4')}</p>
                <p>• {t('settings.troubleshoot5')}</p>
              </div>
            )}
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

        {/* Backup & Restore */}
        <div className="bg-white/5 rounded-xl p-6 space-y-3">
          <h2 className="text-white font-semibold text-base flex items-center gap-2">
            <span className="text-red-500">●</span> {t('settings.backup', { default: 'Respaldo' })}
          </h2>
          <p className="text-gray-400 text-sm">{t('settings.backupDesc', { default: 'Exporta o importa tus datos para respaldar tu configuración.' })}</p>
          <div className="flex gap-2">
            <button
              onClick={exportData}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-all"
            >
              <Download size={14} />
              {t('settings.export', { default: 'Exportar' })}
            </button>
            <button
              onClick={importData}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-all"
            >
              <Upload size={14} />
              {t('settings.import', { default: 'Importar' })}
            </button>
          </div>
        </div>

        {/* Storage management */}
        <div className="bg-white/5 rounded-xl p-6 space-y-3">
          <h2 className="text-white font-semibold text-base flex items-center gap-2">
            <span className="text-red-500">●</span> {t('settings.storage')}
          </h2>

          {/* Storage usage bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400 flex items-center gap-2">
                <HardDrive size={14} />
                {t('settings.storageUsed', { default: 'Espacio utilizado' })}
              </span>
              <span className="text-white font-medium">{storageInfo.used}</span>
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-red-600 rounded-full" style={{ width: '15%', minWidth: '2%' }} />
            </div>
          </div>

          {/* Storage details toggle */}
          <button
            onClick={() => setShowStorageDetails(!showStorageDetails)}
            className="text-gray-500 text-xs flex items-center gap-1 hover:text-gray-300 transition-colors"
          >
            <Info size={10} />
            {showStorageDetails ? t('settings.hideDetails', { default: 'Ocultar detalles' }) : t('settings.showDetails', { default: 'Ver detalles' })}
          </button>

          {showStorageDetails && storageInfo.items.length > 0 && (
            <div className="space-y-1 border border-white/5 rounded-lg p-3">
              {storageInfo.items.map(item => (
                <div key={item.key} className="flex items-center justify-between text-xs">
                  <span className="text-gray-400 truncate mr-2">{item.key}</span>
                  <span className="text-gray-500 shrink-0">{item.size}</span>
                </div>
              ))}
            </div>
          )}

          <p className="text-gray-500 text-xs">{t('settings.storageDesc')}</p>

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
              onClick={clearCache}
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-yellow-400 transition-colors"
            >
              <RefreshCw size={14} />
              {t('settings.clearCache', { default: 'Borrar caché de servidores' })}
            </button>
            <button
              onClick={clearData}
              className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 transition-colors font-medium"
            >
              <Database size={14} />
              {t('settings.clearAllData')}
            </button>
          </div>
        </div>
      </div>

      <div className="h-20" />
    </div>
  );
}
