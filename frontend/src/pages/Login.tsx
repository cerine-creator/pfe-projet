import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Login.css';

const ROLE_REDIRECTS: Record<string, string> = {
  employe: '/employe/dashboard',
  responsable_hierarchique: '/responsable/dashboard',
  responsable_rh: '/rh/dashboard',
  directeur_rh: '/rh/dashboard',
};

const Login: React.FC = () => {
  const { login, user, loading, error, clearError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Titre dynamique de la page
  useEffect(() => {
    document.title = "Connexion | Air Algérie";
  }, []);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Si déjà authentifié → redirection immédiate
  useEffect(() => {
    if (!loading && user) {
      const returnTo = (location.state as { from?: Location })?.from?.pathname;
      navigate(returnTo || ROLE_REDIRECTS[user.role] || '/', { replace: true });
    }
  }, [user, loading, navigate, location.state]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;

    setSubmitting(true);
    try {
      await login(username.trim(), password);
      // La redirection est gérée par le useEffect ci-dessus
    } catch {
      // L'erreur est déjà dans le contexte via setError
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = () => {
    if (error) clearError();
  };

  if (loading) {
    return (
      <div className="login-loading">
        <div className="login-spinner" />
      </div>
    );
  }

  return (
    <div className="login-page">


      <div className="login-container">
        {/* Logo / Branding */}
        <div className="login-header">
          <div className="login-logo">
            <img 
              src="/logo.svg" 
              alt="Air Algérie Logo" 
              style={{ width: '180px', height: 'auto', filter: 'drop-shadow(0 0 10px rgba(218, 0, 39, 0.4))' }} 
            />
          </div>
          <p className="login-subtitle">Connectez-vous à votre espace personnel</p>
        </div>

        {/* Formulaire */}
        <form className="login-form" onSubmit={handleSubmit} noValidate>
          {/* Message d'erreur */}
          {error && (
            <div className="login-error" role="alert">
              <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Champ identifiant */}
          <div className={`login-field ${error ? 'login-field--error' : ''}`}>
            <label htmlFor="login-username" className="login-label">
              Nom d'utilisateur
            </label>
            <div className="login-input-wrapper">
              <svg className="login-input-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
              <input
                id="login-username"
                type="text"
                className="login-input"
                value={username}
                onChange={(e) => { setUsername(e.target.value); handleInputChange(); }}
                placeholder="Votre identifiant"
                autoComplete="username"
                autoFocus
                disabled={submitting}
                required
              />
            </div>
          </div>

          {/* Champ mot de passe */}
          <div className={`login-field ${error ? 'login-field--error' : ''}`}>
            <label htmlFor="login-password" className="login-label">
              Mot de passe
            </label>
            <div className="login-input-wrapper">
              <svg className="login-input-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                className="login-input login-input--password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); handleInputChange(); }}
                placeholder="••••••••"
                autoComplete="current-password"
                disabled={submitting}
                required
              />
              <button
                type="button"
                className="login-toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                    <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.064 7 9.542 7 .817 0 1.614-.107 2.454-.303z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Bouton de connexion */}
          <button
            type="submit"
            className="login-btn"
            disabled={submitting || !username.trim() || !password}
            id="login-submit-btn"
          >
            {submitting ? (
              <>
                <span className="login-btn-spinner" />
                Connexion en cours...
              </>
            ) : (
              'Se connecter'
            )}
          </button>
        </form>

        {/* Footer */}
        <p className="login-footer">
          Problème de connexion ? Contactez votre administrateur système.
        </p>
      </div>
    </div>
  );
};

export default Login;
