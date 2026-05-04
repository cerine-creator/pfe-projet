import axios from 'axios';

/**
 * Instance Axios configurée pour toute l'application.
 *
 * Stratégie d'authentification cross-origin (dev) :
 * - Le token d'accès est stocké EN MÉMOIRE uniquement (pas localStorage/sessionStorage).
 * - Chaque requête reçoit automatiquement le header Authorization: Bearer <token>.
 * - Anti-XSS : le token n'est jamais exposé à l'URL ni persisté dans le DOM.
 * - withCredentials: true est conservé pour que les cookies HttpOnly soient envoyés
 *   sur les navigateurs/environnements où ils fonctionnent (same-origin).
 */

// ─── Token store en mémoire ──────────────────────────────────────────────────
// Ces variables sont inaccessibles depuis l'extérieur du module.

let _accessToken: string | null = null;
let _refreshToken: string | null = null;

export const tokenStore = {
  getAccess: () => _accessToken,
  getRefresh: () => _refreshToken,
  set: (access: string, refresh: string) => {
    _accessToken = access;
    _refreshToken = refresh;
  },
  clear: () => {
    _accessToken = null;
    _refreshToken = null;
  },
};

// ─── Instance Axios ──────────────────────────────────────────────────────────

const api = axios.create({
  baseURL: 'http://127.0.0.1:8000/api',
  withCredentials: true,
});

// ─── Intercepteur de requête : injecte le Bearer token et gère FormData ───

api.interceptors.request.use((config) => {
  const token = tokenStore.getAccess();
  if (token && config.headers) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }

  if (config.headers) {
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    } else {
      config.headers['Content-Type'] = 'application/json';
    }
  }

  return config;
});

// ─── Intercepteur de réponse : refresh automatique sur 401 ──────────────────

let _isRefreshing = false;
let _refreshSubscribers: Array<(token: string) => void> = [];

function subscribeTokenRefresh(cb: (token: string) => void) {
  _refreshSubscribers.push(cb);
}

function onTokenRefreshed(newToken: string) {
  _refreshSubscribers.forEach((cb) => cb(newToken));
  _refreshSubscribers = [];
}

api.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401) {
      // Endpoints qui ne doivent pas déclencher de refresh
      const skipRefresh =
        originalRequest.url?.includes('/auth/login/') ||
        originalRequest.url?.includes('/auth/token/refresh/') ||
        originalRequest.url?.includes('/auth/me/');

      if (skipRefresh) {
        return Promise.reject(error);
      }

      // Tentative de refresh unique
      if (!originalRequest._retry) {
        originalRequest._retry = true;

        if (_isRefreshing) {
          // D'autres requêtes attendent le refresh
          return new Promise((resolve) => {
            subscribeTokenRefresh((newToken) => {
              originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
              resolve(api(originalRequest));
            });
          });
        }

        _isRefreshing = true;
        const refresh = tokenStore.getRefresh();

        try {
          const res = await api.post<{ access: string; refresh: string }>(
            '/auth/token/refresh/',
            { refresh }
          );
          const newAccess = res.data.access;
          const newRefresh = res.data.refresh || refresh || '';
          tokenStore.set(newAccess, newRefresh);
          onTokenRefreshed(newAccess);
          originalRequest.headers['Authorization'] = `Bearer ${newAccess}`;
          return api(originalRequest);
        } catch (refreshError) {
          tokenStore.clear();
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
          return Promise.reject(refreshError);
        } finally {
          _isRefreshing = false;
        }
      }
    }

    // 403 : accès interdit
    if (error.response?.status === 403) {
      window.location.href = '/non-autorise';
    }

    return Promise.reject(error);
  }
);

export default api;
