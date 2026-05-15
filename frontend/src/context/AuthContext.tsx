import { createContext, useContext, useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import api, { tokenStore } from '../api/axiosConfig';

// ─── Types ────────────────────────────────────────────────────────────────────

export type User = {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'employe' | 'responsable_hierarchique' | 'responsable_rh' | 'directeur_rh';
  role_display: string;
  is_staff: boolean;
  is_superuser: boolean;
  employe_id: number | null;
  employe_matricule: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Évite un double-appel en StrictMode React 18
  const initialized = useRef(false);

  /**
   * Au montage de l'app, on tente de restaurer la session depuis le cookie HttpOnly.
   * Si le cookie est valide (même-origine), Django renvoie le profil.
   * Si non, loading passe à false → redirection vers /login.
   *
   * Note: en cross-origin dev (localhost:5173 → 127.0.0.1:8000),
   * les cookies ne sont pas envoyés → 401 attendu et silencieux.
   */
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Nettoyage des anciens tokens localStorage (migration vers tokenStore en mémoire)
    localStorage.removeItem('pfe_access_token');
    localStorage.removeItem('pfe_refresh_token');

    api.get<User>('/auth/me/')
      .then((res) => setUser(res.data))
      .catch(() => {
        // 401 silencieux : pas de session active, l'utilisateur doit se connecter
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (username: string, password: string): Promise<void> => {
    setError(null);
    try {
      const res = await api.post<{ message: string; user: User; access: string; refresh: string }>(
        '/auth/login/',
        { username, password }
      );
      // Stocke les tokens en mémoire → active le header Authorization pour toutes les requêtes suivantes
      tokenStore.set(res.data.access, res.data.refresh);
      setUser(res.data.user);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { detail?: string; non_field_errors?: string[] } } };
        const detail =
          axiosErr.response?.data?.detail ||
          axiosErr.response?.data?.non_field_errors?.[0] ||
          'Identifiants invalides.';
        setError(detail);
      } else {
        setError('Erreur de connexion. Vérifiez votre réseau.');
      }
      throw err;
    }
  };

  const logout = async (): Promise<void> => {
    await api.post('/auth/logout/').catch(() => null);
    tokenStore.clear();
    setUser(null);
  };

  const clearError = () => setError(null);

  // ─── Heartbeat (Battement de cœur) ──────────────────────────────────────────
  // Envoie un signal au serveur toutes les 30 secondes pour dire "je suis toujours là"
  // Cela permet au backend de savoir si la fenêtre est toujours ouverte.
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    if (user) {
      // Premier ping immédiat
      api.post('/auth/heartbeat/').catch(() => {});

      // Puis toutes les 30 secondes
      interval = setInterval(() => {
        api.post('/auth/heartbeat/').catch(() => {});
      }, 30000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout, clearError }}>
      {children}
    </AuthContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error(`useAuth doit être utilisé à l'intérieur de <AuthProvider>.`);
  return ctx;
};
