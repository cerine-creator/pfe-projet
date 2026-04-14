import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import api from '../api/axiosConfig';

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

  /**
   * Au montage de l'app, on interroge silencieusement /auth/me/.
   * Si le cookie est valide, Django renvoie le profil utilisateur.
   * Si non (pas de session), on reste sur null → redirection vers /login.
   */
  useEffect(() => {
    api.get<User>('/auth/me/')
      .then((res) => setUser(res.data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (username: string, password: string): Promise<void> => {
    setError(null);
    try {
      const res = await api.post<{ message: string; user: User }>('/auth/login/', {
        username,
        password,
      });
      setUser(res.data.user);
    } catch (err: unknown) {
      // Extrait le message d'erreur depuis la réponse Django
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
    await api.post('/auth/logout/').catch(() => null); // Ignore si déjà expiré
    setUser(null);
  };

  const clearError = () => setError(null);

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
