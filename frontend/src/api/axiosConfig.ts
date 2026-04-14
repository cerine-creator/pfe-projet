import axios from 'axios';

/**
 * Instance Axios configurée pour toute l'application.
 *
 * withCredentials: true → le navigateur attache automatiquement les cookies
 * HttpOnly (access + refresh) à chaque requête. Le code JavaScript n'a jamais
 * accès direct aux tokens (anti-XSS).
 */
const api = axios.create({
  baseURL: 'http://127.0.0.1:8000/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Intercepteur de réponse ─────────────────────────────────────────────────

api.interceptors.response.use(
  // Succès — retourne la réponse telle quelle
  (response) => response,

  // Erreur — gestion centralisée
  async (error) => {
    const originalRequest = error.config;

    // 401 : session expirée ou inexistante
    if (error.response?.status === 401) {
      // Si c'est déjà une tentative de login, de refresh ou le check initial /me/ : on ne fait RIEN (on laisse échouer proprement)
      if (
        originalRequest.url?.includes('login') || 
        originalRequest.url?.includes('refresh') || 
        originalRequest.url?.includes('me')
      ) {
        return Promise.reject(error);
      }

      // Pour toutes les autres requêtes API métier : tentative de refresh unique
      if (!originalRequest._retry) {
        originalRequest._retry = true;
        try {
          await api.post('/auth/token/refresh/');
          return api(originalRequest);
        } catch (refreshError) {
          // Si le refresh échoue aussi, on redirige vers le login seulement si on n'y est pas
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
          return Promise.reject(refreshError);
        }
      }
    }

    // 403 : accès interdit → redirection vers page non autorisée
    if (error.response?.status === 403) {
      window.location.href = '/non-autorise';
    }

    // 500 : erreur serveur — le backend renvoie un JSON propre (custom_exception_handler)
    // Pas besoin de traitement spécial ici, le composant affichera error.response.data.error

    return Promise.reject(error);
  }
);

export default api;
