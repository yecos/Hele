// Xtream Codes API Service
// Compatible with any IPTV provider using Xtream Codes panel
// This is the same backend that Xuper TV, Magis TV, and similar apps use

export interface XtreamConfig {
  serverUrl: string;    // e.g. "http://example.com:8080"
  username: string;
  password: string;
}

export interface XtreamUserInfo {
  username: string;
  password: string;
  message: string;
  auth: number;
  status: string;
  exp_date: string;
  is_trial: string;
  active_cons: string;
  created_at: string;
  max_connections: string;
  allowed_output_formats: string[];
}

export interface XtreamServerInfo {
  url: string;
  port: string;
  https_port: string;
  server_protocol: string;
  rtmp_port: string;
  timezone: string;
  timestamp_now: number;
  time_now: string;
}

export interface XtreamCategory {
  category_id: string;
  category_name: string;
  parent_id: number;
}

export interface XtreamLiveItem {
  num: number;
  name: string;
  stream_type: string;
  stream_id: number;
  stream_icon: string;
  rating: string;
  rating_5based: number;
  added: string;
  category_id: string;
  custom_sid: string;
  tv_archive: number;
  direct_source: string;
  epg_channel_id: string;
}

export interface XtreamVODItem {
  num: number;
  name: string;
  rating: string;
  rating_5based: number;
  movie_data: {
    media_id: string;
    epg_id?: string;
    container_extension: string;
  };
  stream_type: string;
  stream_id: number;
  stream_icon: string;
  added: string;
  category_id: string;
  custom_sid: string;
  direct_source: string;
}

export interface XtreamSeriesItem {
  num: number;
  name: string;
  rating: string;
  rating_5based: number;
  series_id: number;
  cover: string;
  plot: string;
  cast: string;
  director: string;
  genre: string;
  releaseDate: string;
  last_modified: string;
  added: string;
  category_id: string;
}

export interface XtreamSeriesInfo {
  seasons: {
    air_date: string;
  }[];
  info: {
    name: string;
    cover: string;
    plot: string;
    cast: string;
    director: string;
    genre: string;
    releaseDate: string;
    rating: string;
    rating_5based: number;
  };
  episodes: Record<string, Record<string, {
    id: string;
    episode_num: number;
    title: string;
    container_extension: string;
    info: {
      duration_secs?: number;
    };
  }>>;
  epg: unknown;
}

// ─── Build authenticated URL ────────────────────────────────────

function buildUrl(config: XtreamConfig, endpoint: string, params: Record<string, string> = {}): string {
  const url = new URL(endpoint, config.serverUrl);
  url.searchParams.set('username', config.username);
  url.searchParams.set('password', config.password);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return url.toString();
}

// ─── Stream URL builders ────────────────────────────────────────

export function getLiveStreamUrl(config: XtreamConfig, streamId: number, ext: string = 'ts'): string {
  return `${config.serverUrl}/live/${config.username}/${config.password}/${streamId}.${ext}`;
}

export function getVODStreamUrl(config: XtreamConfig, streamId: number, ext: string): string {
  return `${config.serverUrl}/movie/${config.username}/${config.password}/${streamId}.${ext}`;
}

export function getSeriesStreamUrl(config: XtreamConfig, streamId: string, ext: string): string {
  return `${config.serverUrl}/series/${config.username}/${config.password}/${streamId}.${ext}`;
}

// ─── API Functions ──────────────────────────────────────────────

export async function getAuth(config: XtreamConfig): Promise<{
  user_info: XtreamUserInfo;
  server_info: XtreamServerInfo;
}> {
  const url = buildUrl(config, '/player_api.php', { action: 'get_user_info' });
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Auth failed: ${res.status}`);
  return res.json();
}

export async function getLiveCategories(config: XtreamConfig): Promise<XtreamCategory[]> {
  const url = buildUrl(config, '/player_api.php', { action: 'get_live_categories' });
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch live categories');
  return res.json();
}

export async function getLiveStreams(config: XtreamConfig, categoryId?: string): Promise<XtreamLiveItem[]> {
  const params: Record<string, string> = { action: 'get_live_streams' };
  if (categoryId) params.category_id = categoryId;
  const url = buildUrl(config, '/player_api.php', params);
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch live streams');
  return res.json();
}

export async function getVODCategories(config: XtreamConfig): Promise<XtreamCategory[]> {
  const url = buildUrl(config, '/player_api.php', { action: 'get_vod_categories' });
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch VOD categories');
  return res.json();
}

export async function getVODStreams(config: XtreamConfig, categoryId?: string): Promise<XtreamVODItem[]> {
  const params: Record<string, string> = { action: 'get_vod_streams' };
  if (categoryId) params.category_id = categoryId;
  const url = buildUrl(config, '/player_api.php', params);
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch VOD streams');
  return res.json();
}

export async function getSeriesCategories(config: XtreamConfig): Promise<XtreamCategory[]> {
  const url = buildUrl(config, '/player_api.php', { action: 'get_series_categories' });
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch series categories');
  return res.json();
}

export async function getSeriesList(config: XtreamConfig, categoryId?: string): Promise<XtreamSeriesItem[]> {
  const params: Record<string, string> = { action: 'get_series' };
  if (categoryId) params.category_id = categoryId;
  const url = buildUrl(config, '/player_api.php', params);
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch series');
  return res.json();
}

export async function getSeriesInfo(config: XtreamConfig, seriesId: number): Promise<XtreamSeriesInfo> {
  const url = buildUrl(config, '/player_api.php', {
    action: 'get_series_info',
    series_id: String(seriesId),
  });
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch series info');
  return res.json();
}

// ─── M3U Playlist Builder ───────────────────────────────────────

export function buildM3UUrl(config: XtreamConfig, type: 'live' | 'movie' | 'series' = 'live'): string {
  return `${config.serverUrl}/get.php?username=${config.username}&password=${config.password}&type=${type}&output=ts`;
}
