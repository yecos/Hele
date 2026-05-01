'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  X, RefreshCw, Search, Shield, Radio, Activity, Trash2,
  ChevronDown, ChevronUp, ExternalLink, CheckCircle, XCircle,
  Zap, Globe, Github, Radar, Loader2, AlertTriangle, Clock,
  Database, BarChart3, Eye, EyeOff, Wifi, WifiOff, Bell, Server,
  Play, Key, LogIn, Send, FileJson, Lock
} from 'lucide-react';

// ===== Types =====
interface DiscoveryEngineStats {
  seed: { sources: number; valid: number; newSources: number };
  web: { queries: number; pagesFetched: number; urlsFound: number; validated: number; newSources: number };
  github: { queries: number; urlsFound: number; validated: number; newSources: number };
  xtream: { probes: number; working: number; newSources: number };
}

interface DashboardData {
  guardian: {
    totalSources: number;
    totalVerified: number;
    isScanning: boolean;
    latestScan: { status: string; workingChannels: number; totalChannels: number; completedAt: string } | null;
    totalScans: number;
  } | null;
  scheduler: { initialized: boolean; activeTasks: number; tasks: any[] };
  discovery: {
    isDiscovering: boolean;
    lastDiscovery: {
      status: string;
      engines: DiscoveryEngineStats;
      totalNewSources: number;
      totalDuration: number;
      timestamp: string;
    } | null;
    stats: {
      totalDiscovered: number;
      validSources: number;
      addedToGuardian: number;
      totalChannelsInValidSources: number;
    };
  };
  recentScans: Array<{
    id: string;
    status: string;
    totalChannels: number;
    workingChannels: number;
    durationMs: number;
    trigger: string;
    startedAt: string;
    completedAt: string | null;
  }>;
  discoveredSources: Array<{
    id: string;
    url: string;
    name: string;
    sourceUrl: string;
    discoveryEngine: string;
    channelCount: number;
    isValid: boolean;
    addedToGuardian: boolean;
    lastChecked: string;
    createdAt: string;
  }>;
  verifiedChannelCount: number;
}

// ===== Admin Auth Hook =====
function useAdminAuth() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [authData, setAuthData] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('xs-auth');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.username?.toLowerCase() === 'admin' && parsed.token) {
          setIsAdmin(true);
          setAuthData(stored);
        }
      }
    } catch {}
  }, []);

  const adminFetch = useCallback(async (url: string, options?: RequestInit) => {
    if (!authData) throw new Error('No auth token');
    return fetch(url, {
      ...options,
      headers: {
        ...options?.headers,
        'X-Admin-Auth': authData,
        'Content-Type': 'application/json',
      },
    });
  }, [authData]);

  return { isAdmin, authData, adminFetch };
}

// ===== Engine Icon =====
function EngineIcon({ engine }: { engine: string }) {
  switch (engine) {
    case 'seed': return <Database size={14} className="text-emerald-400" />;
    case 'web': return <Globe size={14} className="text-blue-400" />;
    case 'github': return <Github size={14} className="text-purple-400" />;
    case 'xtream': return <Zap size={14} className="text-yellow-400" />;
    default: return <Search size={14} className="text-gray-400" />;
  }
}

// ===== Main Component =====
export default function AdminPanel({ onClose }: { onClose: () => void }) {
  const { isAdmin, adminFetch } = useAdminAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'discovery' | 'sources' | 'scans' | 'xuper'>('overview');
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await adminFetch('/api/guardian/admin');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setDashboard(data.dashboard);
        } else {
          showToast(data.error || 'Error de permisos', 'error');
        }
      } else if (res.status === 403) {
        showToast('Acceso denegado', 'error');
      }
    } catch (err) {
      console.error('Error fetching dashboard:', err);
    }
  }, [adminFetch]);

  const refreshData = useCallback(async () => {
    setLoading(true);
    await fetchDashboard();
    setLoading(false);
  }, [fetchDashboard]);

  useEffect(() => {
    if (isAdmin) refreshData();
  }, [isAdmin, refreshData]);

  const executeAction = async (action: string, params?: Record<string, any>) => {
    setActionLoading(action);
    try {
      const res = await adminFetch('/api/guardian/admin', {
        method: 'POST',
        body: JSON.stringify({ action, ...params }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || `Acción "${action}" completada`);
        setTimeout(refreshData, 2000);
      } else {
        showToast(data.error || `Error en "${action}"`, 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error de conexión', 'error');
    }
    setActionLoading(null);
  };

  if (!isAdmin) {
    return (
      <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
        <div className="bg-gray-900 border border-red-500/30 rounded-2xl p-8 max-w-md w-full text-center">
          <AlertTriangle size={48} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Acceso Restringido</h2>
          <p className="text-gray-400 mb-6">Esta sección es solo para administradores.</p>
          <button onClick={onClose} className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors">
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: BarChart3 },
    { id: 'discovery' as const, label: 'Discovery', icon: Search },
    { id: 'sources' as const, label: 'Fuentes', icon: Database },
    { id: 'scans' as const, label: 'Scans', icon: Activity },
    { id: 'xuper' as const, label: 'Xuper', icon: Shield },
  ];

  const d = dashboard;
  const isDiscovering = d?.discovery?.isDiscovering ?? false;
  const isScanning = d?.guardian?.isScanning ?? false;

  return (
    <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[200] px-4 py-3 rounded-lg shadow-lg text-sm font-medium animate-in slide-in-from-right
          ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.message}
        </div>
      )}

      <div className="bg-gray-950 border border-gray-800 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800 shrink-0">
          <div className="flex items-center gap-3">
            <Shield size={22} className="text-green-400" />
            <h2 className="text-lg font-bold text-white">Guardian Admin</h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
              Admin
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={refreshData}
              disabled={loading}
              className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors disabled:opacity-50"
              title="Refrescar datos"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-800 px-4 shrink-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors
                ${activeTab === tab.id
                  ? 'border-green-500 text-green-400'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
                }`}
            >
              <tab.icon size={15} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading && !d ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={32} className="animate-spin text-green-400" />
            </div>
          ) : !d ? (
            <p className="text-gray-500 text-center py-20">No hay datos disponibles</p>
          ) : (
            <>
              {/* ===== OVERVIEW TAB ===== */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <StatCard icon={<Radio size={18} />} label="Canales Verificados" value={d.verifiedChannelCount} color="green" />
                    <StatCard icon={<Database size={18} />} label="Fuentes Guardian" value={d.guardian?.totalSources ?? 0} color="blue" />
                    <StatCard icon={<Search size={18} />} label="Fuentes Descubiertas" value={d.discovery.stats.totalDiscovered} color="purple" />
                    <StatCard icon={<CheckCircle size={18} />} label="Fuentes Válidas" value={d.discovery.stats.validSources} color="emerald" />
                  </div>

                  {/* Quick Stats Row 2 */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <StatCard icon={<BarChart3 size={18} />} label="Canales en Fuentes Válidas" value={d.discovery.stats.totalChannelsInValidSources} color="cyan" />
                    <StatCard icon={<Activity size={18} />} label="Total Scans" value={d.guardian?.totalScans ?? 0} color="amber" />
                    <StatCard icon={<Clock size={18} />} label="Promovidas al Guardian" value={d.discovery.stats.addedToGuardian} color="teal" />
                    <StatCard icon={<Shield size={18} />} label="Scheduler" value={d.scheduler.initialized ? 'Activo' : 'Inactivo'} color={d.scheduler.initialized ? 'green' : 'red'} />
                  </div>

                  {/* Quick Actions */}
                  <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                    <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                      <Zap size={14} className="text-yellow-400" />
                      Acciones Rápidas
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      <ActionButton
                        label="Ejecutar Discovery"
                        icon={<Search size={14} />}
                        loading={actionLoading === 'runDiscovery' || isDiscovering}
                        disabled={isDiscovering}
                        onClick={() => executeAction('runDiscovery')}
                        variant="green"
                        subtitle={isDiscovering ? 'Ejecutando...' : '4 motores'}
                      />
                      <ActionButton
                        label="Ejecutar Scan"
                        icon={<Radio size={14} />}
                        loading={actionLoading === 'runScan' || isScanning}
                        disabled={isScanning}
                        onClick={() => executeAction('runScan')}
                        variant="blue"
                        subtitle={isScanning ? 'Escaneando...' : 'Validar fuentes'}
                      />
                      <ActionButton
                        label="Limpiar Inválidas"
                        icon={<Trash2 size={14} />}
                        loading={actionLoading === 'clearDiscovered'}
                        onClick={() => executeAction('clearDiscovered')}
                        variant="red"
                        subtitle="Fuentes descubiertas"
                      />
                      <ActionButton
                        label="Limpiar Canales"
                        icon={<Trash2 size={14} />}
                        loading={actionLoading === 'clearChannels'}
                        onClick={() => executeAction('clearChannels')}
                        variant="red"
                        subtitle="VerifiedChannels"
                      />
                    </div>
                  </div>

                  {/* Last Discovery */}
                  {d.discovery.lastDiscovery && (
                    <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                      <h3 className="text-sm font-semibold text-gray-300 mb-3">Último Discovery</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        <div>
                          <span className="text-gray-500">Estado</span>
                          <p className={d.discovery.lastDiscovery.status === 'completed' ? 'text-green-400' : 'text-red-400'}>
                            {d.discovery.lastDiscovery.status}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500">Duración</span>
                          <p className="text-white">{(d.discovery.lastDiscovery.totalDuration / 1000).toFixed(1)}s</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Nuevas Fuentes</span>
                          <p className="text-green-400">{d.discovery.lastDiscovery.totalNewSources}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Fecha</span>
                          <p className="text-gray-300">{new Date(d.discovery.lastDiscovery.timestamp).toLocaleString('es-CO')}</p>
                        </div>
                      </div>
                      {/* Engine breakdown */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
                        <EngineCard name="Seed Sources" engine="seed" stats={d.discovery.lastDiscovery.engines.seed} />
                        <EngineCard name="Web Scraper" engine="web" stats={d.discovery.lastDiscovery.engines.web} />
                        <EngineCard name="GitHub Scanner" engine="github" stats={d.discovery.lastDiscovery.engines.github} />
                        <EngineCard name="Xtream Prober" engine="xtream" stats={d.discovery.lastDiscovery.engines.xtream} />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ===== DISCOVERY TAB ===== */}
              {activeTab === 'discovery' && (
                <div className="space-y-4">
                  {/* Discovery Action */}
                  <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="text-sm font-semibold text-white">Motor de Descubrimiento v3.0</h3>
                        <p className="text-xs text-gray-500 mt-1">4 motores: Seed Sources, Web Scraper, GitHub Scanner, Xtream Codes Prober</p>
                      </div>
                      <button
                        onClick={() => executeAction('runDiscovery')}
                        disabled={isDiscovering || !!actionLoading}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm rounded-lg transition-colors"
                      >
                        {isDiscovering ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                        {isDiscovering ? 'Ejecutando...' : 'Ejecutar Discovery'}
                      </button>
                    </div>

                    {/* Engine Stats */}
                    {d.discovery.lastDiscovery && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
                        <EngineCard name="Seed Sources" engine="seed" stats={d.discovery.lastDiscovery.engines.seed} />
                        <EngineCard name="Web Scraper" engine="web" stats={d.discovery.lastDiscovery.engines.web} />
                        <EngineCard name="GitHub Scanner" engine="github" stats={d.discovery.lastDiscovery.engines.github} />
                        <EngineCard name="Xtream Prober" engine="xtream" stats={d.discovery.lastDiscovery.engines.xtream} />
                      </div>
                    )}
                  </div>

                  {/* Discovered Sources Table */}
                  <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
                    <div className="flex items-center justify-between p-4 border-b border-gray-800">
                      <h3 className="text-sm font-semibold text-gray-300">
                        Fuentes Descubiertas ({d.discoveredSources.length})
                      </h3>
                      <button
                        onClick={() => executeAction('clearDiscovered')}
                        disabled={!!actionLoading}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-colors"
                      >
                        <Trash2 size={12} /> Limpiar Inválidas
                      </button>
                    </div>
                    <div className="overflow-x-auto max-h-96 overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-800/50 sticky top-0">
                          <tr className="text-gray-400">
                            <th className="text-left p-3">Motor</th>
                            <th className="text-left p-3">Nombre</th>
                            <th className="text-left p-3">URL</th>
                            <th className="text-center p-3">Canales</th>
                            <th className="text-center p-3">Estado</th>
                            <th className="text-center p-3">Guardian</th>
                            <th className="text-center p-3">Verificado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {d.discoveredSources.length === 0 ? (
                            <tr><td colSpan={7} className="p-8 text-center text-gray-600">No hay fuentes descubiertas</td></tr>
                          ) : (
                            d.discoveredSources.map((src) => (
                              <tr key={src.id} className="border-t border-gray-800/50 hover:bg-gray-800/30">
                                <td className="p-3"><EngineIcon engine={src.discoveryEngine} /></td>
                                <td className="p-3 text-gray-300 max-w-[150px] truncate">{src.name || '—'}</td>
                                <td className="p-3 text-gray-500 max-w-[200px] truncate" title={src.url}>
                                  <a href={src.url} target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors">
                                    {src.url.replace(/https?:\/\//, '').substring(0, 30)}...
                                  </a>
                                </td>
                                <td className="p-3 text-center text-white font-mono">{src.channelCount}</td>
                                <td className="p-3 text-center">
                                  {src.isValid
                                    ? <CheckCircle size={14} className="text-green-400 inline" />
                                    : <XCircle size={14} className="text-red-400 inline" />
                                  }
                                </td>
                                <td className="p-3 text-center">
                                  {src.addedToGuardian
                                    ? <CheckCircle size={14} className="text-blue-400 inline" />
                                    : <button
                                        onClick={() => executeAction('promoteSource', { url: src.url })}
                                        disabled={!!actionLoading}
                                        className="text-gray-600 hover:text-green-400 transition-colors"
                                        title="Promover al Guardian"
                                      >
                                        <ExternalLink size={14} />
                                      </button>
                                  }
                                </td>
                                <td className="p-3 text-center text-gray-500 text-[10px]">
                                  {new Date(src.lastChecked).toLocaleString('es-CO', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ===== SOURCES TAB ===== */}
              {activeTab === 'sources' && (
                <div className="space-y-4">
                  <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                    <h3 className="text-sm font-semibold text-gray-300 mb-1">
                      Fuentes del Guardian
                    </h3>
                    <p className="text-xs text-gray-600">
                      {d.guardian?.totalSources ?? 0} fuentes registradas | {d.verifiedChannelCount} canales verificados
                    </p>
                  </div>

                  {/* Sources will show in a future update - for now show discovery sources that are in guardian */}
                  <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
                    <div className="p-4 border-b border-gray-800">
                      <h3 className="text-sm font-semibold text-gray-300">
                        Fuentes con Auto-Promoción ({d.discoveredSources.filter(s => s.addedToGuardian).length})
                      </h3>
                    </div>
                    <div className="overflow-x-auto max-h-96 overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-800/50 sticky top-0">
                          <tr className="text-gray-400">
                            <th className="text-left p-3">Motor</th>
                            <th className="text-left p-3">Nombre</th>
                            <th className="text-center p-3">Canales</th>
                            <th className="text-center p-3">Válida</th>
                            <th className="text-center p-3">Último Check</th>
                          </tr>
                        </thead>
                        <tbody>
                          {d.discoveredSources.filter(s => s.addedToGuardian).length === 0 ? (
                            <tr><td colSpan={5} className="p-8 text-center text-gray-600">No hay fuentes promovidas al Guardian</td></tr>
                          ) : (
                            d.discoveredSources.filter(s => s.addedToGuardian).map((src) => (
                              <tr key={src.id} className="border-t border-gray-800/50 hover:bg-gray-800/30">
                                <td className="p-3"><div className="flex items-center gap-1"><EngineIcon engine={src.discoveryEngine} /><span className="text-gray-500">{src.discoveryEngine}</span></div></td>
                                <td className="p-3 text-gray-300 max-w-[200px] truncate">{src.name || '—'}</td>
                                <td className="p-3 text-center text-white font-mono">{src.channelCount}</td>
                                <td className="p-3 text-center">
                                  {src.isValid
                                    ? <span className="text-green-400">Sí</span>
                                    : <span className="text-red-400">No</span>
                                  }
                                </td>
                                <td className="p-3 text-center text-gray-500 text-[10px]">
                                  {new Date(src.lastChecked).toLocaleString('es-CO', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ===== XUPER MONITOR TAB ===== */}
              {activeTab === 'xuper' && <XuperMonitorTab adminFetch={adminFetch} showToast={showToast} />}

              {/* ===== SCANS TAB ===== */}
              {activeTab === 'scans' && (
                <div className="space-y-4">
                  <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="text-sm font-semibold text-white">Scanner del Guardian</h3>
                        <p className="text-xs text-gray-500 mt-1">
                          Valida streams de todas las fuentes Guardian y genera VerifiedChannels
                        </p>
                      </div>
                      <button
                        onClick={() => executeAction('runScan')}
                        disabled={isScanning || !!actionLoading}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm rounded-lg transition-colors"
                      >
                        {isScanning ? <Loader2 size={14} className="animate-spin" /> : <Radio size={14} />}
                        {isScanning ? 'Escaneando...' : 'Ejecutar Scan'}
                      </button>
                    </div>

                    {/* Latest Scan */}
                    {d.guardian?.latestScan && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        <div>
                          <span className="text-gray-500">Estado</span>
                          <p className={d.guardian.latestScan.status === 'completed' ? 'text-green-400' : 'text-yellow-400'}>
                            {d.guardian.latestScan.status}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500">Canales Totales</span>
                          <p className="text-white">{d.guardian.latestScan.totalChannels}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Funcionales</span>
                          <p className="text-green-400">{d.guardian.latestScan.workingChannels}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Tasa de Éxito</span>
                          <p className={d.guardian.latestScan.totalChannels > 0
                            ? (d.guardian.latestScan.workingChannels / d.guardian.latestScan.totalChannels * 100 > 50 ? 'text-green-400' : 'text-red-400')
                            : 'text-gray-400'}>
                            {d.guardian.latestScan.totalChannels > 0
                              ? `${(d.guardian.latestScan.workingChannels / d.guardian.latestScan.totalChannels * 100).toFixed(1)}%`
                              : 'N/A'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Recent Scans */}
                  <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
                    <div className="p-4 border-b border-gray-800">
                      <h3 className="text-sm font-semibold text-gray-300">Scans Recientes</h3>
                    </div>
                    <div className="overflow-x-auto max-h-96 overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-800/50 sticky top-0">
                          <tr className="text-gray-400">
                            <th className="text-left p-3">ID</th>
                            <th className="text-center p-3">Estado</th>
                            <th className="text-center p-3">Total</th>
                            <th className="text-center p-3">Funcionales</th>
                            <th className="text-center p-3">Tasa</th>
                            <th className="text-center p-3">Duración</th>
                            <th className="text-center p-3">Trigger</th>
                            <th className="text-left p-3">Fecha</th>
                          </tr>
                        </thead>
                        <tbody>
                          {d.recentScans.length === 0 ? (
                            <tr><td colSpan={8} className="p-8 text-center text-gray-600">No hay scans registrados</td></tr>
                          ) : (
                            d.recentScans.map((scan) => (
                              <tr key={scan.id} className="border-t border-gray-800/50 hover:bg-gray-800/30">
                                <td className="p-3 text-gray-500 font-mono text-[10px]">{scan.id.substring(0, 8)}</td>
                                <td className="p-3 text-center">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px]
                                    ${scan.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                                      scan.status === 'running' ? 'bg-yellow-500/20 text-yellow-400' :
                                      'bg-red-500/20 text-red-400'}`}>
                                    {scan.status}
                                  </span>
                                </td>
                                <td className="p-3 text-center text-white font-mono">{scan.totalChannels}</td>
                                <td className="p-3 text-center text-green-400 font-mono">{scan.workingChannels}</td>
                                <td className="p-3 text-center font-mono">
                                  {scan.totalChannels > 0
                                    ? <span className={scan.workingChannels / scan.totalChannels > 0.5 ? 'text-green-400' : 'text-red-400'}>
                                        {(scan.workingChannels / scan.totalChannels * 100).toFixed(1)}%
                                      </span>
                                    : <span className="text-gray-600">—</span>}
                                </td>
                                <td className="p-3 text-center text-gray-400">{(scan.durationMs / 1000).toFixed(1)}s</td>
                                <td className="p-3 text-center text-gray-500">{scan.trigger}</td>
                                <td className="p-3 text-gray-500 text-[10px]">
                                  {new Date(scan.startedAt).toLocaleString('es-CO', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-3 border-t border-gray-800 text-[10px] text-gray-600 shrink-0">
          <span>Guardian Admin Panel — Acceso exclusivo administrador</span>
          <span className="flex items-center gap-1">
            <Activity size={10} className={isDiscovering || isScanning ? 'text-green-400 animate-pulse' : 'text-gray-600'} />
            {isDiscovering ? 'Discovery activo' : isScanning ? 'Scan activo' : 'Inactivo'}
          </span>
        </div>
      </div>
    </div>
  );
}

// ===== Sub-components =====

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number | string; color: string }) {
  const colors: Record<string, string> = {
    green: 'text-green-400', blue: 'text-blue-400', purple: 'text-purple-400',
    emerald: 'text-emerald-400', cyan: 'text-cyan-400', amber: 'text-amber-400',
    teal: 'text-teal-400', red: 'text-red-400',
  };
  return (
    <div className="bg-gray-900 rounded-xl p-3 border border-gray-800">
      <div className="flex items-center gap-2 text-gray-500 mb-1">
        {icon}
        <span className="text-[10px] uppercase tracking-wider">{label}</span>
      </div>
      <p className={`text-xl font-bold ${colors[color] || 'text-white'}`}>{value}</p>
    </div>
  );
}

function ActionButton({ label, icon, loading, disabled, onClick, variant, subtitle }: {
  label: string; icon: React.ReactNode; loading?: boolean; disabled?: boolean;
  onClick: () => void; variant: 'green' | 'blue' | 'red'; subtitle?: string;
}) {
  const variants = {
    green: 'bg-green-600/20 hover:bg-green-600/30 border-green-600/30 text-green-400 disabled:border-gray-700 disabled:text-gray-600',
    blue: 'bg-blue-600/20 hover:bg-blue-600/30 border-blue-600/30 text-blue-400 disabled:border-gray-700 disabled:text-gray-600',
    red: 'bg-red-600/20 hover:bg-red-600/30 border-red-600/30 text-red-400 disabled:border-gray-700 disabled:text-gray-600',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`flex flex-col items-center gap-1 p-3 rounded-xl border text-xs transition-colors ${variants[variant]}`}
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : icon}
      <span className="font-medium">{label}</span>
      {subtitle && <span className="text-[9px] opacity-60">{subtitle}</span>}
    </button>
  );
}

function EngineCard({ name, engine, stats }: { name: string; engine: string; stats: any }) {
  const mainValue = stats.queries ?? stats.probes ?? stats.pagesRead ?? 0;
  const subValue = stats.urlsFound ?? stats.working ?? stats.urlsExtracted ?? 0;
  const newSources = stats.newSources ?? 0;
  return (
    <div className="bg-gray-800/50 rounded-lg p-2.5">
      <div className="flex items-center gap-1.5 mb-1.5">
        <EngineIcon engine={engine} />
        <span className="text-[10px] text-gray-400 font-medium">{name}</span>
      </div>
      <div className="grid grid-cols-3 gap-1 text-[10px]">
        <div>
          <span className="text-gray-600">Ejec</span>
          <p className="text-white font-mono">{mainValue}</p>
        </div>
        <div>
          <span className="text-gray-600">Hall</span>
          <p className="text-gray-300 font-mono">{subValue}</p>
        </div>
        <div>
          <span className="text-gray-600">Nuevas</span>
          <p className="text-green-400 font-mono">{newSources}</p>
        </div>
      </div>
    </div>
  );
}

// ===== XUPER MONITOR TAB =====

const XUPER_SERVICE_COLORS: Record<string, string> = {
  portal: '#8b5cf6', epg: '#06b6d4', notice: '#f59e0b', bigbee: '#ec4899',
  ads: '#ef4444', h5: '#22c55e', upgrade: '#f97316', cdn: '#3b82f6', download: '#6366f1',
};

const XUPER_SERVICE_LABELS: Record<string, string> = {
  portal: 'Portal API', epg: 'EPG', notice: 'Notificaciones', bigbee: 'Analytics',
  ads: 'Ads', h5: 'Web H5', upgrade: 'Updates', cdn: 'CDN Imagenes', download: 'Download',
};

interface XuperDomain {
  id: string; domain: string; service: string; role: string;
  ipAddresses: string[]; isUp: boolean; responseMs: number; checkedAt: string;
}

interface XuperAlertItem {
  id: string; type: string; severity: string; title: string;
  description: string; isRead: boolean; createdAt: string;
}

interface XuperDCSHistoryItem {
  id: string; changed: boolean; diffSummary: string | null; fetchedAt: string;
}

interface XuperData {
  domains: XuperDomain[];
  alerts: XuperAlertItem[];
  dcsHistory: XuperDCSHistoryItem[];
  stats: { totalDomains: number; upDomains: number; downDomains: number; unreadAlerts: number; lastCheck: string | null };
  isChecking: boolean;
}

function XuperMonitorTab({ adminFetch, showToast }: {
  adminFetch: (url: string, options?: RequestInit) => Promise<Response>;
  showToast: (msg: string, type: 'success' | 'error') => void;
}) {
  const [data, setData] = useState<XuperData | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [expandedService, setExpandedService] = useState<string | null>(null);
  const [subTab, setSubTab] = useState<'monitor' | 'client'>('monitor');

  const fetchData = useCallback(async () => {
    try {
      const res = await adminFetch('/api/guardian/xuper/domains');
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setData({
            domains: json.domains || [],
            alerts: json.alerts || [],
            dcsHistory: json.dcsHistory || [],
            stats: json.stats || { totalDomains: 0, upDomains: 0, downDomains: 0, unreadAlerts: 0, lastCheck: null },
            isChecking: json.isChecking || false,
          });
        }
      }
    } catch (e) {
      console.error('Error fetching Xuper data:', e);
    } finally {
      setLoading(false);
    }
  }, [adminFetch]);

  const runCheck = useCallback(async () => {
    setChecking(true);
    try {
      const res = await adminFetch('/api/guardian/xuper/monitor');
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          const alertCount = json.newAlerts?.length || 0;
          showToast(alertCount > 0 ? `Chequeo completado: ${alertCount} alertas nuevas` : 'Chequeo completado: Sin cambios', alertCount > 0 ? 'error' : 'success');
        } else {
          showToast(json.message || 'Error en chequeo', 'error');
        }
      }
    } catch (e) {
      showToast('Error de conexión', 'error');
    } finally {
      setChecking(false);
      fetchData();
    }
  }, [adminFetch, fetchData, showToast]);

  const markAllRead = useCallback(async () => {
    try {
      await adminFetch('/api/guardian/xuper/alerts', { method: 'POST' });
      fetchData();
    } catch {}
  }, [adminFetch, fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-purple-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Sub-tabs: Monitor / Client */}
      <div className="flex gap-2">
        <button
          onClick={() => setSubTab('monitor')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg transition-colors
            ${subTab === 'monitor' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-gray-300'}`}
        >
          <Shield size={13} /> Monitor
        </button>
        <button
          onClick={() => setSubTab('client')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg transition-colors
            ${subTab === 'client' ? 'bg-cyan-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-gray-300'}`}
        >
          <Key size={13} /> Client
        </button>
      </div>

      {subTab === 'monitor' ? (
        <XuperMonitorContent
          data={data}
          checking={checking}
          runCheck={runCheck}
          markAllRead={markAllRead}
          expandedService={expandedService}
          setExpandedService={setExpandedService}
        />
      ) : (
        <XuperClientTab adminFetch={adminFetch} showToast={showToast} />
      )}
    </div>
  );
}

// ===== XUPER MONITOR CONTENT (extracted from old XuperMonitorTab) =====

function XuperMonitorContent({ data, checking, runCheck, markAllRead, expandedService, setExpandedService }: {
  data: XuperData | null;
  checking: boolean;
  runCheck: () => void;
  markAllRead: () => void;
  expandedService: string | null;
  setExpandedService: (s: string | null) => void;
}) {
  const stats = data?.stats || { totalDomains: 0, upDomains: 0, downDomains: 0, unreadAlerts: 0, lastCheck: null };
  const domains = data?.domains || [];
  const alerts = data?.alerts || [];
  const dcsHistory = data?.dcsHistory || [];

  const groupedDomains: Record<string, XuperDomain[]> = {};
  for (const d of domains) {
    if (!groupedDomains[d.service]) groupedDomains[d.service] = [];
    groupedDomains[d.service].push(d);
  }

  return (
    <div className="space-y-4">
      {/* Stats + Action */}
      <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Shield size={16} className="text-purple-400" />
            Xuper TV Monitor
          </h3>
          <button onClick={runCheck} disabled={checking || data?.isChecking}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm rounded-lg transition-colors">
            {checking ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            {checking ? 'Chequeando...' : 'Chequear Ahora'}
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={<Globe size={18} />} label="Dominios" value={stats.totalDomains} color="purple" />
          <StatCard icon={<CheckCircle size={18} />} label="En Linea" value={stats.upDomains} color="green" />
          <StatCard icon={<XCircle size={18} />} label="Caidos" value={stats.downDomains} color="red" />
          <StatCard icon={<Bell size={18} />} label="Alertas" value={stats.unreadAlerts} color="amber" />
        </div>
        {stats.lastCheck && (
          <div className="flex items-center gap-2 text-xs text-gray-500 mt-2">
            <Clock size={12} /> Ultimo chequeo: {new Date(stats.lastCheck).toLocaleString('es-CO')}
          </div>
        )}
      </div>

      {/* Domain Status */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <div className="p-4 border-b border-gray-800">
          <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
            <Server size={14} className="text-purple-400" /> Estado de Dominios
          </h3>
        </div>
        <div className="divide-y divide-gray-800/50">
          {Object.entries(XUPER_SERVICE_LABELS).map(([service, label]) => {
            const serviceDomains = groupedDomains[service] || [];
            const up = serviceDomains.filter(d => d.isUp).length;
            const total = serviceDomains.length;
            return (
              <div key={service}>
                <div className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-800/30 transition-colors"
                  onClick={() => setExpandedService(expandedService === service ? null : service)}>
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: XUPER_SERVICE_COLORS[service] || '#737373' }} />
                  <span className="text-xs font-medium text-gray-300">{label}</span>
                  <div className="flex items-center gap-1 ml-auto mr-2">
                    {serviceDomains.map((d, i) => d.isUp ? <Wifi key={i} size={12} className="text-green-400" /> : <WifiOff key={i} size={12} className="text-red-400" />)}
                  </div>
                  <span className="text-[10px] text-gray-500">{up}/{total} up</span>
                  {expandedService === service ? <ChevronUp size={14} className="text-gray-600" /> : <ChevronDown size={14} className="text-gray-600" />}
                </div>
                {expandedService === service && serviceDomains.length > 0 && (
                  <div className="px-3 pb-3 space-y-1.5">
                    {serviceDomains.map(d => (
                      <div key={d.id} className="flex items-start gap-2 p-2 rounded-lg bg-gray-800/40">
                        {d.isUp ? <CheckCircle size={14} className="text-green-400 mt-0.5 shrink-0" /> : <XCircle size={14} className="text-red-400 mt-0.5 shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-mono text-gray-300 truncate">{d.domain}</span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ backgroundColor: `${XUPER_SERVICE_COLORS[d.service] || '#737373'}20`, color: XUPER_SERVICE_COLORS[d.service] || '#737373' }}>{d.role}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-[10px] text-gray-600">IPs: {d.ipAddresses.length > 0 ? d.ipAddresses.join(', ') : 'N/A'}</span>
                            {d.responseMs > 0 && <span className="text-[10px] text-gray-600">{d.responseMs}ms</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {expandedService === service && serviceDomains.length === 0 && (
                  <div className="px-3 pb-3"><p className="text-[10px] text-gray-600 text-center py-2">Sin datos. Ejecuta un chequeo.</p></div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Alerts + DCS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          <div className="flex items-center justify-between p-3 border-b border-gray-800">
            <h3 className="text-xs font-semibold text-gray-300 flex items-center gap-2">
              <Bell size={13} className="text-yellow-400" /> Alertas
              {stats.unreadAlerts > 0 && <span className="bg-red-600 text-white text-[9px] px-1.5 py-0.5 rounded-full">{stats.unreadAlerts}</span>}
            </h3>
            {stats.unreadAlerts > 0 && <button onClick={markAllRead} className="text-[9px] text-purple-400 hover:text-purple-300">Marcar leidas</button>}
          </div>
          <div className="max-h-48 overflow-y-auto p-2">
            {alerts.length === 0 ? <p className="text-[10px] text-gray-600 text-center py-4">Sin alertas.</p> : alerts.map(alert => (
              <div key={alert.id} className={`p-2 rounded-lg mb-1 ${alert.isRead ? 'bg-gray-800/30' : 'bg-gray-800/30 border-l-2'}`}
                style={{ borderLeftColor: alert.severity === 'critical' ? '#ef4444' : '#f59e0b' }}>
                <div className="flex items-start gap-1.5">
                  {alert.severity === 'critical' ? <XCircle size={12} className="text-red-400 mt-0.5 shrink-0" /> : <AlertTriangle size={12} className="text-yellow-400 mt-0.5 shrink-0" />}
                  <div><p className="text-[10px] font-medium text-gray-300">{alert.title}</p><p className="text-[9px] text-gray-600 mt-0.5">{alert.description}</p></div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          <div className="p-3 border-b border-gray-800">
            <h3 className="text-xs font-semibold text-gray-300 flex items-center gap-2"><Zap size={13} className="text-cyan-400" /> Historial DCS</h3>
          </div>
          <div className="max-h-48 overflow-y-auto p-2">
            {dcsHistory.length === 0 ? <p className="text-[10px] text-gray-600 text-center py-4">Sin datos DCS.</p> : dcsHistory.map(dcs => (
              <div key={dcs.id} className="flex items-center gap-2 p-2 rounded-lg bg-gray-800/30 mb-1">
                {dcs.changed ? <AlertTriangle size={12} className="text-yellow-400" /> : <CheckCircle size={12} className="text-green-400" />}
                <div className="flex-1"><span className="text-[10px] text-gray-300">{dcs.changed ? 'Cambiado' : 'Sin cambios'}</span>{dcs.diffSummary && <p className="text-[9px] text-gray-600">{dcs.diffSummary}</p>}</div>
                <span className="text-[9px] text-gray-700">{new Date(dcs.fetchedAt).toLocaleString('es-CO', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Infrastructure Map */}
      <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
        <h3 className="text-xs font-semibold text-gray-300 flex items-center gap-2 mb-3"><Globe size={13} className="text-purple-400" /> Mapa de Infraestructura</h3>
        <div className="space-y-2">
          {Object.entries(XUPER_SERVICE_LABELS).map(([key, label]) => {
            const serviceDomains = groupedDomains[key] || [];
            const up = serviceDomains.filter(d => d.isUp).length;
            const total = serviceDomains.length;
            const pct = total > 0 ? (up / total) * 100 : 0;
            return (
              <div key={key} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: XUPER_SERVICE_COLORS[key] || '#737373' }} />
                <span className="text-[10px] text-gray-400 w-24 truncate">{label}</span>
                <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: pct === 100 ? '#22c55e' : pct > 0 ? '#f59e0b' : '#ef4444' }} />
                </div>
                <span className="text-[9px] text-gray-600 w-8 text-right">{up}/{total}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ===== XUPER CLIENT TAB =====

function XuperClientTab({ adminFetch, showToast }: {
  adminFetch: (url: string, options?: RequestInit) => Promise<Response>;
  showToast: (msg: string, type: 'success' | 'error') => void;
}) {
  const [clientStatus, setClientStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [loginSN, setLoginSN] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [customEndpoint, setCustomEndpoint] = useState('/api/portalCore/config/get');
  const [customBody, setCustomBody] = useState('{}');
  const [customEncrypted, setCustomEncrypted] = useState(false);
  const [customDomain, setCustomDomain] = useState('');

  const fetchClientStatus = useCallback(async () => {
    try {
      const res = await adminFetch('/api/guardian/xuper/client');
      if (res.ok) {
        const json = await res.json();
        if (json.success) setClientStatus(json);
      }
    } catch (e) {
      console.error('Error fetching client status:', e);
    } finally {
      setLoading(false);
    }
  }, [adminFetch]);

  useEffect(() => { fetchClientStatus(); }, [fetchClientStatus]);

  const executeClientAction = async (action: string, params: Record<string, any> = {}) => {
    setActionLoading(action);
    setApiResponse(null);
    try {
      const res = await adminFetch('/api/guardian/xuper/client', {
        method: 'POST',
        body: JSON.stringify({ action, ...params }),
      });
      const json = await res.json();
      setApiResponse(json);
      if (json.success) {
        showToast(`Accion "${action}" completada`, 'success');
      } else {
        showToast(json.error || `Error en "${action}"`, 'error');
      }
      fetchClientStatus();
    } catch (err: any) {
      showToast(err.message || 'Error de conexion', 'error');
    }
    setActionLoading(null);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={32} className="animate-spin text-cyan-400" /></div>;
  }

  const status = clientStatus?.status;
  const encTest = clientStatus?.encryptionTest;
  const endpoints = clientStatus?.endpoints || [];
  const domains = clientStatus?.domains || [];

  return (
    <div className="space-y-4">
      {/* Client Status */}
      <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Key size={16} className="text-cyan-400" /> Xuper TV Client
          </h3>
          <span className={`text-[10px] px-2 py-0.5 rounded-full ${encTest?.match ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
            <Lock size={9} className="inline mr-1" /> 3DES {encTest?.match ? 'OK' : 'FAIL'}
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-gray-500">Dominio Activo</span>
            <p className="text-cyan-400 font-mono text-[11px] truncate">{status?.activeDomain || 'Sin conectar'}</p>
          </div>
          <div>
            <span className="text-gray-500">Sesion</span>
            <p className={status?.session ? 'text-green-400' : 'text-gray-500'}>{status?.session ? `Activa (${status.session.authType})` : 'No autenticado'}</p>
          </div>
          <div>
            <span className="text-gray-500">DCS Cache</span>
            <p className="text-white">{status?.lastDCS ? `${status.lastDCS.domainCount} dominios` : 'Sin datos'}</p>
          </div>
          <div>
            <span className="text-gray-500">Endpoints</span>
            <p className="text-white">{endpoints.length} conocidos</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
        <h3 className="text-xs font-semibold text-gray-300 flex items-center gap-2 mb-3">
          <Zap size={13} className="text-yellow-400" /> Acciones Rapidas
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <button onClick={() => executeClientAction('fetchDCS')} disabled={!!actionLoading}
            className="flex flex-col items-center gap-1 p-3 rounded-xl border bg-cyan-600/20 hover:bg-cyan-600/30 border-cyan-600/30 text-cyan-400 text-xs transition-colors disabled:opacity-50">
            {actionLoading === 'fetchDCS' ? <Loader2 size={16} className="animate-spin" /> : <Globe size={16} />}
            <span className="font-medium">Fetch DCS</span>
            <span className="text-[9px] opacity-60">Obtener dominios</span>
          </button>
          <button onClick={() => executeClientAction('getAppConfig')} disabled={!!actionLoading}
            className="flex flex-col items-center gap-1 p-3 rounded-xl border bg-green-600/20 hover:bg-green-600/30 border-green-600/30 text-green-400 text-xs transition-colors disabled:opacity-50">
            {actionLoading === 'getAppConfig' ? <Loader2 size={16} className="animate-spin" /> : <FileJson size={16} />}
            <span className="font-medium">App Config</span>
            <span className="text-[9px] opacity-60">Sin encriptar</span>
          </button>
          <button onClick={() => executeClientAction('getHome')} disabled={!!actionLoading}
            className="flex flex-col items-center gap-1 p-3 rounded-xl border bg-purple-600/20 hover:bg-purple-600/30 border-purple-600/30 text-purple-400 text-xs transition-colors disabled:opacity-50">
            {actionLoading === 'getHome' ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
            <span className="font-medium">Get Home</span>
            <span className="text-[9px] opacity-60">Encriptado</span>
          </button>
          <button onClick={() => executeClientAction('testEncrypt')} disabled={!!actionLoading}
            className="flex flex-col items-center gap-1 p-3 rounded-xl border bg-amber-600/20 hover:bg-amber-600/30 border-amber-600/30 text-amber-400 text-xs transition-colors disabled:opacity-50">
            {actionLoading === 'testEncrypt' ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
            <span className="font-medium">Test 3DES</span>
            <span className="text-[9px] opacity-60">Verificar clave</span>
          </button>
        </div>
      </div>

      {/* Login Section */}
      <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
        <h3 className="text-xs font-semibold text-gray-300 flex items-center gap-2 mb-3">
          <LogIn size={13} className="text-blue-400" /> Autenticacion
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-2">
            <label className="text-[10px] text-gray-500 block">Login con SN</label>
            <input type="text" value={loginSN} onChange={(e) => setLoginSN(e.target.value)} placeholder="Serial Number del dispositivo"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-cyan-500" />
            <button onClick={() => executeClientAction('loginSN', { sn: loginSN })} disabled={!!actionLoading || !loginSN}
              className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white text-xs rounded-lg transition-colors disabled:opacity-50">Login SN</button>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] text-gray-500 block">Login con Email</label>
            <input type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} placeholder="email@ejemplo.com"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-cyan-500" />
            <input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="Contrasena"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-cyan-500" />
            <button onClick={() => executeClientAction('loginEmail', { email: loginEmail, password: loginPassword })} disabled={!!actionLoading || !loginEmail || !loginPassword}
              className="w-full px-3 py-2 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 text-white text-xs rounded-lg transition-colors disabled:opacity-50">Login Email</button>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] text-gray-500 block">Activar Dispositivo</label>
            <input type="text" placeholder="Device ID (SN/MAC)" onChange={(e) => setLoginSN(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-cyan-500" />
            <div className="h-4" />
            <button onClick={() => executeClientAction('activateDevice', { deviceId: loginSN })} disabled={!!actionLoading || !loginSN}
              className="w-full px-3 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-gray-700 text-white text-xs rounded-lg transition-colors disabled:opacity-50">Activar</button>
            {status?.session && (
              <button onClick={() => executeClientAction('logout')} disabled={!!actionLoading}
                className="w-full px-3 py-2 bg-red-600/30 hover:bg-red-600/50 text-red-400 text-xs rounded-lg transition-colors mt-1">Cerrar Sesion</button>
            )}
          </div>
        </div>
      </div>

      {/* Custom API Call */}
      <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
        <h3 className="text-xs font-semibold text-gray-300 flex items-center gap-2 mb-3">
          <Send size={13} className="text-green-400" /> Llamada API Personalizada
        </h3>
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-gray-500 block mb-1">Endpoint</label>
              <select value={customEndpoint} onChange={(e) => { setCustomEndpoint(e.target.value); const ep = endpoints.find((ep: any) => ep.path === e.target.value); if (ep) setCustomEncrypted(ep.encrypted); }}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-xs text-gray-300 focus:outline-none focus:border-cyan-500">
                <option value="">Seleccionar endpoint...</option>
                {['content', 'streaming', 'auth', 'dcs', 'account', 'subs', 'favorites', 'epg', 'device', 'feedback', 'misc'].map(cat => (
                  <optgroup key={cat} label={cat.toUpperCase()}>
                    {endpoints.filter((ep: any) => ep.category === cat).map((ep: any) => (
                      <option key={ep.path} value={ep.path}>{ep.path} {!ep.encrypted ? '(sin enc.)' : ''}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-gray-500 block mb-1">Dominio (vacio = auto)</label>
              <input type="text" value={customDomain} onChange={(e) => setCustomDomain(e.target.value)} placeholder="dtgrd.txhnojlbu.com"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-cyan-500" />
            </div>
          </div>
          <div>
            <label className="text-[10px] text-gray-500 block mb-1">Body (JSON)</label>
            <textarea value={customBody} onChange={(e) => setCustomBody(e.target.value)} rows={3}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-xs text-gray-300 font-mono focus:outline-none focus:border-cyan-500" />
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
              <input type="checkbox" checked={customEncrypted} onChange={(e) => setCustomEncrypted(e.target.checked)} className="rounded border-gray-600 bg-gray-800" />
              <Lock size={12} /> Encriptar request
            </label>
            <button onClick={() => { let body = {}; try { body = JSON.parse(customBody); } catch {} executeClientAction('callAPI', { path: customEndpoint, params: body, encrypted: customEncrypted, domain: customDomain || undefined }); }}
              disabled={!!actionLoading || !customEndpoint}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-700 text-white text-xs rounded-lg transition-colors disabled:opacity-50">
              {actionLoading?.startsWith('callAPI') ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Ejecutar
            </button>
          </div>
        </div>
      </div>

      {/* 3DES Tool */}
      <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
        <h3 className="text-xs font-semibold text-gray-300 flex items-center gap-2 mb-3">
          <Lock size={13} className="text-amber-400" /> Herramienta 3DES
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] text-gray-500 block">Encriptar</label>
            <textarea placeholder='{"appId":"3"}' rows={2} onChange={(e) => setLoginSN(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-xs text-gray-300 font-mono focus:outline-none focus:border-cyan-500" />
            <button onClick={() => executeClientAction('encrypt', { text: loginSN })} disabled={!!actionLoading}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:bg-gray-700 text-white text-xs rounded-lg transition-colors disabled:opacity-50">Encriptar</button>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] text-gray-500 block">Desencriptar</label>
            <textarea placeholder="Base64 ciphertext..." rows={2} onChange={(e) => setLoginEmail(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-xs text-gray-300 font-mono focus:outline-none focus:border-cyan-500" />
            <button onClick={() => executeClientAction('decrypt', { text: loginEmail })} disabled={!!actionLoading}
              className="px-3 py-1.5 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 text-white text-xs rounded-lg transition-colors disabled:opacity-50">Desencriptar</button>
          </div>
        </div>
      </div>

      {/* API Response */}
      {apiResponse && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          <div className="flex items-center justify-between p-3 border-b border-gray-800">
            <h3 className="text-xs font-semibold text-gray-300 flex items-center gap-2">
              <FileJson size={13} className="text-cyan-400" /> Respuesta API
            </h3>
            <div className="flex items-center gap-2">
              {apiResponse.result?.statusCode !== undefined && (
                <span className={`text-[9px] px-2 py-0.5 rounded-full ${apiResponse.result.statusCode < 400 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                  HTTP {apiResponse.result.statusCode}
                </span>
              )}
              {apiResponse.result?.responseMs !== undefined && <span className="text-[9px] text-gray-500">{apiResponse.result.responseMs}ms</span>}
              {apiResponse.result?.encrypted && <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">Encriptado</span>}
            </div>
          </div>
          <pre className="p-3 text-[10px] font-mono text-gray-300 max-h-80 overflow-y-auto whitespace-pre-wrap break-all">
            {JSON.stringify(apiResponse.result?.data || apiResponse, null, 2)}
          </pre>
        </div>
      )}

      {/* Known Domains */}
      <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
        <h3 className="text-xs font-semibold text-gray-300 flex items-center gap-2 mb-3">
          <Server size={13} className="text-purple-400" /> Dominios Conocidos
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
          {domains.map((d: any) => (
            <div key={d.domain} className="flex items-center gap-2 px-2 py-1.5 bg-gray-800/30 rounded text-[10px]">
              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: XUPER_SERVICE_COLORS[d.service] || '#737373' }} />
              <span className="text-gray-500 truncate">{XUPER_SERVICE_LABELS[d.service] || d.service}</span>
              <span className="text-gray-400 font-mono ml-auto truncate max-w-[100px]">{d.domain}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
