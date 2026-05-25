import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// ⚠️  Change this to your computer's local IP when testing on a physical device
// e.g. 'http://192.168.1.42:8000'
// For Expo Go on simulator, localhost works fine.
export const API_BASE = 'http://10.0.0.150:8000';

const api = axios.create({ baseURL: API_BASE, timeout: 60_000 });

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('pinscape_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const getPinterestLoginUrl = () => `${API_BASE}/auth/pinterest/login`;

export interface Board { id: string; name: string; pin_count: number; cover_image_url?: string; }
export interface Pin   { id: string; title?: string; image_url: string; board_id: string; }
export interface PinterestUser { id: string; username: string; profile_image?: string; }
export interface AnalysisResult { rank: number; title: string; description: string; tags: string[]; badge: string; reasoning: string; }

export const getBoards    = () => api.get<{ boards: Board[]; user: PinterestUser }>('/pinterest/boards');
export const getBoardPins = (boardId: string) => api.get<{ pins: Pin[] }>(`/pinterest/boards/${boardId}/pins`);

export const uploadPhotos = (files: Array<{ uri: string; name: string; type: string }>, category: string) => {
  const form = new FormData();
  files.forEach((f) => form.append('files', f as any));
  form.append('category', category);
  return api.post<{ keys: string[] }>('/analyze/upload-photos', form, { headers: { 'Content-Type': 'multipart/form-data' } });
};

export const analyzeRequest = (payload: { category: string; photo_keys: string[]; pin_image_urls: string[]; angles_covered: string[] }) =>
  api.post<{ results: AnalysisResult[] }>('/analyze/analyze', payload);

export default api;
