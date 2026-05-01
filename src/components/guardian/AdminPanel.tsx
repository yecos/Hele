'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  X, RefreshCw, Search, Shield, Radio, Activity, Trash2,
  ChevronDown, ChevronUp, ExternalLink, CheckCircle, XCircle,
  Zap, Globe, Github, Radar, Loader2, AlertTriangle, Clock,
  Database, BarChart3, Eye, EyeOff
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
    { id: 'xuper' as const, label: 'Xuper', icon: Radio },
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

              {/* ===== XUPER TAB ===== */}
              {activeTab === 'xuper' && <XuperPanel />}

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

// ===== Xuper Panel Component =====
function XuperPanel() {
  const [status, setStatus] = useState<{
    available: boolean;
    dcsOk: boolean;
    portalOk: boolean;
    latencyMs: number;
    activePortal: string;
    client: { isLoggedIn: boolean; portalDomain: string; domainsCount: number; hasToken: boolean };
  } | null>(null);
  const [monitorData, setMonitorData] = useState<{
    timestamp: string;
    dcsAvailable: boolean;
    domainsChecked: number;
    domainsOk: number;
    portalLatencyMs: number;
    configOk: boolean;
    domains: Array<{ domain: string; type: string; ip: string; dnsOk: boolean; httpOk: boolean; latencyMs: number; error?: string }>;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginSuccess, setLoginSuccess] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/xuper/status');
      const data = await res.json();
      if (data.success) {
        setStatus({
          available: data.connectivity?.available || false,
          dcsOk: data.connectivity?.dcsOk || false,
          portalOk: data.connectivity?.portalOk || false,
          latencyMs: data.connectivity?.latencyMs || 0,
          activePortal: data.connectivity?.activePortal || '',
          client: data.client || {},
        });
      }
    } catch {}
  };

  const fetchMonitor = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/xuper/monitor');
      const data = await res.json();
      if (data.success && data.monitor) {
        setMonitorData(data.monitor);
      }
    } catch {}
    setLoading(false);
  };

  const handleLogin = async () => {
    setLoginLoading(true);
    setLoginError('');
    setLoginSuccess(false);
    try {
      const res = await fetch('/api/xuper/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm),
      });
      const data = await res.json();
      if (data.success) {
        setLoginSuccess(true);
        fetchStatus();
      } else {
        setLoginError(data.error || 'Login fallido');
      }
    } catch {
      setLoginError('Error de conexión');
    }
    setLoginLoading(false);
  };

  useEffect(() => {
    fetchStatus();
    fetchMonitor();
  }, []);

  return (
    <div className="space-y-4">
      {/* Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gray-900 rounded-xl p-3 border border-gray-800">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <Globe size={14} />
            <span className="text-[10px] uppercase tracking-wider">DCS</span>
          </div>
          <div className="flex items-center gap-2">
            {status?.dcsOk ? (
              <CheckCircle size={18} className="text-green-400" />
            ) : (
              <XCircle size={18} className="text-red-400" />
            )}
            <span className={`text-sm font-bold ${status?.dcsOk ? 'text-green-400' : 'text-red-400'}`}>
              {status?.dcsOk ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>

        <div className="bg-gray-900 rounded-xl p-3 border border-gray-800">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <Radio size={14} />
            <span className="text-[10px] uppercase tracking-wider">Portal</span>
          </div>
          <div className="flex items-center gap-2">
            {status?.portalOk ? (
              <CheckCircle size={18} className="text-green-400" />
            ) : (
              <XCircle size={18} className="text-red-400" />
            )}
            <span className={`text-sm font-bold ${status?.portalOk ? 'text-green-400' : 'text-red-400'}`}>
              {status?.portalOk ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>

        <div className="bg-gray-900 rounded-xl p-3 border border-gray-800">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <Zap size={14} />
            <span className="text-[10px] uppercase tracking-wider">Latencia</span>
          </div>
          <p className={`text-lg font-bold ${status?.latencyMs && status.latencyMs < 500 ? 'text-green-400' : status?.latencyMs && status.latencyMs < 2000 ? 'text-yellow-400' : 'text-red-400'}`}>
            {status?.latencyMs ? `${status.latencyMs}ms` : 'N/A'}
          </p>
        </div>

        <div className="bg-gray-900 rounded-xl p-3 border border-gray-800">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <Shield size={14} />
            <span className="text-[10px] uppercase tracking-wider">Sesión</span>
          </div>
          <div className="flex items-center gap-2">
            {status?.client?.isLoggedIn ? (
              <CheckCircle size={18} className="text-green-400" />
            ) : (
              <XCircle size={18} className="text-gray-600" />
            )}
            <span className={`text-sm font-bold ${status?.client?.isLoggedIn ? 'text-green-400' : 'text-gray-500'}`}>
              {status?.client?.isLoggedIn ? 'Activa' : 'Sin sesión'}
            </span>
          </div>
        </div>
      </div>

      {/* Active Portal Info */}
      {status?.activePortal && (
        <div className="bg-gray-900 rounded-xl p-3 border border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] text-gray-500 uppercase tracking-wider">Portal Activo</span>
              <p className="text-sm text-blue-400 font-mono">{status.activePortal}</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-gray-500 uppercase tracking-wider">Dominios DCS</span>
              <p className="text-sm text-white font-mono">{status.client?.domainsCount || 0}</p>
            </div>
          </div>
        </div>
      )}

      {/* Login Form */}
      <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
        <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
          <Shield size={14} className="text-blue-400" />
          Login Xuper TV
        </h3>
        
        {status?.client?.isLoggedIn ? (
          <div className="flex items-center justify-between bg-green-500/10 border border-green-500/20 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <CheckCircle size={16} className="text-green-400" />
              <span className="text-green-400 text-sm">Sesión activa en Xuper TV</span>
            </div>
            <button
              onClick={async () => {
                try { await fetch('/api/xuper/status'); } catch {}
                fetchStatus();
              }}
              className="text-xs text-gray-400 hover:text-white transition-colors"
            >
              Verificar
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <input
                type="text"
                placeholder="Username"
                value={loginForm.username}
                onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-600 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <input
                type="password"
                placeholder="Password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-600 focus:border-blue-500 focus:outline-none"
              />
            </div>
            {loginError && (
              <p className="text-red-400 text-xs">{loginError}</p>
            )}
            {loginSuccess && (
              <p className="text-green-400 text-xs">Login exitoso!</p>
            )}
            <button
              onClick={handleLogin}
              disabled={loginLoading || !loginForm.username || !loginForm.password}
              className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loginLoading ? <Loader2 size={14} className="animate-spin" /> : <Shield size={14} />}
              {loginLoading ? 'Conectando...' : 'Conectar a Xuper TV'}
            </button>
          </div>
        )}
      </div>

      {/* Monitor Results */}
      <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
            <Radar size={14} className="text-purple-400" />
            Monitor de Dominios
          </h3>
          <button
            onClick={fetchMonitor}
            disabled={loading}
            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            {loading ? 'Monitoreando...' : 'Ejecutar Monitor'}
          </button>
        </div>

        {monitorData ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3 text-xs">
              <div>
                <span className="text-gray-500">DCS</span>
                <p className={monitorData.dcsAvailable ? 'text-green-400' : 'text-red-400'}>
                  {monitorData.dcsAvailable ? 'Disponible' : 'Caído'}
                </p>
              </div>
              <div>
                <span className="text-gray-500">Dominios OK</span>
                <p className="text-white">{monitorData.domainsOk}/{monitorData.domainsChecked}</p>
              </div>
              <div>
                <span className="text-gray-500">Portal Latencia</span>
                <p className="text-white">{monitorData.portalLatencyMs}ms</p>
              </div>
              <div>
                <span className="text-gray-500">Config API</span>
                <p className={monitorData.configOk ? 'text-green-400' : 'text-red-400'}>
                  {monitorData.configOk ? 'OK' : 'Falló'}
                </p>
              </div>
            </div>

            {/* Domains table */}
            <div className="overflow-x-auto max-h-64 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-800/50 sticky top-0">
                  <tr className="text-gray-400">
                    <th className="text-left p-2">Tipo</th>
                    <th className="text-left p-2">Dominio</th>
                    <th className="text-center p-2">DNS</th>
                    <th className="text-center p-2">HTTP</th>
                    <th className="text-center p-2">Latencia</th>
                    <th className="text-left p-2">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {monitorData.domains.map((d) => (
                    <tr key={d.domain} className="border-t border-gray-800/50 hover:bg-gray-800/30">
                      <td className="p-2">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${
                          d.type === 'portal' ? 'bg-blue-500/20 text-blue-400' :
                          d.type === 'epg' ? 'bg-purple-500/20 text-purple-400' :
                          d.type === 'cdn' ? 'bg-emerald-500/20 text-emerald-400' :
                          'bg-gray-500/20 text-gray-400'
                        }`}>
                          {d.type}
                        </span>
                      </td>
                      <td className="p-2 text-gray-300 font-mono text-[10px] max-w-[180px] truncate" title={d.domain}>
                        {d.domain}
                      </td>
                      <td className="p-2 text-center">
                        {d.dnsOk ? <CheckCircle size={12} className="text-green-400 inline" /> : <XCircle size={12} className="text-red-400 inline" />}
                      </td>
                      <td className="p-2 text-center">
                        {d.httpOk ? <CheckCircle size={12} className="text-green-400 inline" /> : <XCircle size={12} className="text-red-400 inline" />}
                      </td>
                      <td className="p-2 text-center text-gray-400 font-mono">
                        {d.latencyMs > 0 ? `${d.latencyMs}ms` : '—'}
                      </td>
                      <td className="p-2 text-gray-500 font-mono text-[10px]">
                        {d.ip || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-[10px] text-gray-600 mt-2">
              Último monitoreo: {new Date(monitorData.timestamp).toLocaleString('es-CO')}
            </p>
          </>
        ) : (
          <p className="text-gray-600 text-xs text-center py-4">
            Haz clic en &quot;Ejecutar Monitor&quot; para verificar los dominios Xuper
          </p>
        )}
      </div>
    </div>
  );
}
