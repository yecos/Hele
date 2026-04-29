'use client';

import { useState } from 'react';
import { useFavoritesStore } from '@/lib/store';
import { Heart, Trash2, Wifi, WifiOff, Loader2, ExternalLink, Check, X as XIcon } from 'lucide-react';

export function SettingsView() {
  const [castAppId, setCastAppId] = useState(() => {
    try { return localStorage.getItem('xs-cast-app-id') || ''; } catch { return ''; }
  });
  const [castAppIdSaved, setCastAppIdSaved] = useState(false);
  const [castAppIdError, setCastAppIdError] = useState('');

  const clearFavorites = () => {
    if (confirm('¿Borrar toda la lista de favoritos?')) {
      localStorage.removeItem('xuper-favorites');
      window.location.reload();
    }
  };

  const clearHistory = () => {
    if (confirm('¿Borrar todo el historial?')) {
      localStorage.removeItem('xuper-history');
      window.location.reload();
    }
  };

  const clearData = () => {
    if (confirm('¿Borrar TODOS los datos locales? (favoritos, historial, sesión)')) {
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
      setCastAppIdError('El App ID debe tener 12 caracteres hexadecimales');
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
      <h1 className="text-2xl font-bold text-white mb-6">Ajustes</h1>

      <div className="space-y-4">
        {/* About */}
        <div className="bg-white/5 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="XuperStream" className="w-10 h-10" />
            <div>
              <h2 className="text-white font-semibold text-base">XuperStream</h2>
              <p className="text-gray-500 text-xs">Versión 0.2.0</p>
            </div>
          </div>
          <p className="text-gray-400 text-sm leading-relaxed">
            XuperStream es tu plataforma personal de streaming. Disfruta de películas, series y canales en vivo desde un solo lugar.
          </p>
        </div>

        {/* Servers */}
        <div className="bg-white/5 rounded-xl p-6 space-y-3">
          <h2 className="text-white font-semibold text-base flex items-center gap-2">
            <span className="text-red-500">●</span> Servidores
          </h2>
          <div className="space-y-2">
            {[
              { name: 'VidSrc IO', url: 'vidsrc.io', status: 'Activo' },
              { name: 'VidLink', url: 'vidlink.pro', status: 'Activo' },
              { name: 'MoviesAPI', url: 'moviesapi.to', status: 'Activo' },
              { name: 'MoviesAPI Club', url: 'moviesapi.club', status: 'Backup' },
              { name: 'VidSrc PM', url: 'vidsrc.pm', status: 'Backup' },
            ].map(server => (
              <div key={server.name} className="flex items-center justify-between text-sm">
                <span className="text-gray-300">{server.name}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  server.status === 'Activo'
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-white/5 text-gray-500'
                }`}>
                  {server.status}
                </span>
              </div>
            ))}
          </div>
          <p className="text-gray-500 text-xs">Se cargan automáticamente al reproducir contenido.</p>
        </div>

        {/* Chromecast — Enhanced Settings */}
        <div className="bg-white/5 rounded-xl p-6 space-y-4">
          <h2 className="text-white font-semibold text-base flex items-center gap-2">
            <span className="text-red-500">●</span> Chromecast
          </h2>

          {/* Current mode indicator */}
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/5">
            {isCustomReceiver ? (
              <>
                <Wifi className="text-green-400 shrink-0" size={18} />
                <div>
                  <p className="text-green-400 text-sm font-medium">Custom Receiver activado</p>
                  <p className="text-gray-500 text-xs">Películas, series e IPTV funcionarán en TV</p>
                </div>
              </>
            ) : (
              <>
                <WifiOff className="text-yellow-500 shrink-0" size={18} />
                <div>
                  <p className="text-yellow-400 text-sm font-medium">Modo estándar</p>
                  <p className="text-gray-500 text-xs">Solo IPTV funciona en TV. Películas necesitan Custom Receiver.</p>
                </div>
              </>
            )}
          </div>

          {/* App ID input */}
          <div className="space-y-2">
            <label className="text-gray-300 text-sm font-medium block">
              Cast Receiver App ID
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={castAppId}
                onChange={(e) => { setCastAppId(e.target.value); setCastAppIdError(''); setCastAppIdSaved(false); }}
                placeholder="Ej: A1B2C3D4E5F6"
                maxLength={12}
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm font-mono uppercase outline-none focus:border-red-500/50 transition-colors placeholder:text-gray-600 placeholder:normal-case"
              />
              {castAppId.trim() && (
                <button
                  onClick={clearCastAppId}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all"
                  title="Limpiar"
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
                  <><Check size={14} /> Guardado</>
                ) : (
                  'Guardar'
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
              ¿Cómo obtener el App ID?
            </h3>
            <ol className="text-gray-400 text-xs space-y-2 leading-relaxed list-decimal list-inside">
              <li>
                Ve a{' '}
                <a
                  href="https://cast.google.com/publish"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-red-400 hover:text-red-300 underline inline-flex items-center gap-1"
                >
                  Google Cast Developer Console <ExternalLink size={10} />
                </a>
              </li>
              <li>Registra una nueva aplicación de Cast</li>
              <li>En &quot;Receiver URL&quot;, ingresa la URL de tu app seguida de <code className="bg-white/10 px-1 rounded text-[11px]">/cast-receiver.html</code></li>
              <li>Ejemplo: <code className="bg-white/10 px-1 rounded text-[11px] break-all">https://tudominio.com/cast-receiver.html</code></li>
              <li>Copia el App ID que Google te asigna y pégalo arriba</li>
              <li>Recarga la página para que los cambios surtan efecto</li>
            </ol>
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
              <p className="text-green-400 text-xs font-medium">¿Qué cambia al activar el Custom Receiver?</p>
              <p className="text-green-400/70 text-xs mt-1">
                Las películas y series se enviarán a tu TV mediante un iframe en el receptor personalizado,
                además de los canales IPTV que ya funcionan. Sin el Custom Receiver, solo IPTV se reproduce en TV.
              </p>
            </div>
          </div>

          {/* Troubleshooting */}
          <div className="space-y-2">
            <h3 className="text-gray-300 text-sm font-medium">Solución de problemas</h3>
            <div className="text-gray-500 text-xs space-y-1.5">
              <p>• Asegúrate de estar en HTTPS (requerido por Chromecast)</p>
              <p>• Tu teléfono y el Chromecast deben estar en la misma red WiFi</p>
              <p>• Si no aparecen dispositivos, recarga la página y espera 10 segundos</p>
              <p>• En iOS: usa Chrome o Safari (no funciona en otras apps)</p>
              <p>• En Android: usa Chrome (el cast se integra en el menú del sistema)</p>
            </div>
          </div>
        </div>

        {/* IPTV */}
        <div className="bg-white/5 rounded-xl p-6 space-y-3">
          <h2 className="text-white font-semibold text-base flex items-center gap-2">
            <span className="text-red-500">●</span> IPTV
          </h2>
          <p className="text-gray-400 text-sm">Canales en vivo verificados de Colombia y el mundo.</p>
          <div className="text-gray-500 text-xs space-y-1">
            <p>Fuentes: iptv-org, TDTChannels</p>
            <p>Solo se muestran canales funcionales.</p>
            <p>IPTV funciona con Chromecast sin configuración adicional.</p>
          </div>
        </div>

        {/* PWA */}
        <div className="bg-white/5 rounded-xl p-6 space-y-3">
          <h2 className="text-white font-semibold text-base flex items-center gap-2">
            <span className="text-red-500">●</span> App Instalable (PWA)
          </h2>
          <p className="text-gray-400 text-sm">Instalable como app en Android, iOS y Desktop.</p>
          <div className="text-gray-500 text-xs space-y-1">
            <p>Funciona sin conexión con contenido en caché.</p>
            <p>Compatible con Chrome, Safari, Edge y Firefox.</p>
          </div>
        </div>

        {/* Data source */}
        <div className="bg-white/5 rounded-xl p-6 space-y-3">
          <h2 className="text-white font-semibold text-base flex items-center gap-2">
            <span className="text-red-500">●</span> Datos
          </h2>
          <p className="text-gray-400 text-sm">Metadatos proporcionados por TMDB (The Movie Database).</p>
        </div>

        {/* Storage management */}
        <div className="bg-white/5 rounded-xl p-6 space-y-3">
          <h2 className="text-white font-semibold text-base flex items-center gap-2">
            <span className="text-red-500">●</span> Almacenamiento
          </h2>
          <p className="text-gray-400 text-sm">Tus datos se guardan localmente en tu navegador.</p>
          <div className="space-y-2 pt-2">
            <button
              onClick={clearFavorites}
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-red-400 transition-colors"
            >
              <Heart size={14} />
              Borrar favoritos
            </button>
            <button
              onClick={clearHistory}
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-red-400 transition-colors"
            >
              <Trash2 size={14} />
              Borrar historial
            </button>
            <button
              onClick={clearData}
              className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 transition-colors font-medium"
            >
              Borrar todos los datos
            </button>
          </div>
        </div>
      </div>

      <div className="h-20" />
    </div>
  );
}
