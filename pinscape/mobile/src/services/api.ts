import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

// API_BASE is set in app.json → expo.extra.apiBase so you never have to
// edit source code when switching between simulator (localhost) and a
// physical device (your machine's LAN IP) or a deployed server.
//
// app.json example:
//   "extra": { "apiBase": "http://192.168.1.42:8000" }
//
// Falls back to localhost for convenience when the key is not set.
export const API_BASE: string =
  (Constants.expoConfig?.extra as { apiBase?: string } | undefined)?.apiBase ??
  'http://localhost:8000';

const api = axios.create({ baseURL: API_BASE, timeout: 60_000 });

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('pinscape_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const getPinterestLoginUrl = () => `${API_BASE}/auth/pinterest/login`;

// ── Types ────────────────────────────────────────────────────────────────────

export interface Board {
  id: string;
  name: string;
  pin_count: number;
  cover_image_url?: string;
}

export interface Pin {
  id: string;
  title?: string;
  image_url: string;
  board_id: string;
}

export interface PinterestUser {
  id: string;
  username: string;
  profile_image?: string;
}

export interface AnalysisResult {
  rank: number;
  title: string;
  description: string;
  tags: string[];
  badge: string;
  reasoning: string;
}

// ── API calls ────────────────────────────────────────────────────────────────

export const getBoards =
  () => api.get<{ boards: Board[]; user: PinterestUser }>('/pinterest/boards');

export const getBoardPins =
  (boardId: string) => api.get<{ pins: Pin[] }>(`/pinterest/boards/${boardId}/pins`);

/**
 * Upload one or more image files to the backend and get back storage keys.
 * Used for both user photos (UploadScreen) and locally-picked pin images
 * (PinsScreen). The returned keys are what the backend expects in
 * photo_keys / pin_image_urls — never raw file:// URIs.
 */
export const uploadPhotos = (
  files: Array<{ uri: string; name: string; type: string }>,
  category: string,
) => {
  const form = new FormData();
  files.forEach(f => form.append('files', f as any));
  form.append('category', category);
  return api.post<{ keys: string[]; count: number }>(
    '/analyze/upload-photos',
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
};

/**
 * Run the Claude vision analysis.
 * pin_image_urls must contain either:
 *   • https:// CDN URLs  (Pinterest board pins selected in BoardPinsScreen)
 *   • storage keys       (images uploaded via uploadPhotos())
 * Never pass raw file:// URIs — they are local to the device and
 * invisible to the backend.
 */
export const analyzeRequest = (payload: {
  category:       string;
  photo_keys:     string[];
  pin_image_urls: string[];
  angles_covered: string[];
}) => api.post<{ results: AnalysisResult[] }>('/analyze/analyze', payload);

export default api;
