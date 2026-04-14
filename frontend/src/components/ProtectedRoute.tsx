import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { User } from '../context/AuthContext';

interface ProtectedRouteProps {
  /** Rôles autorisés à accéder à cette route. Vide = tout utilisateur authentifié. */
  allowedRoles?: User['role'][];
  children: React.ReactNode;
}

/**
 * Wrapper de route sécurisé.
 *
 * Logique :
 * 1. En cours de chargement → spinner
 * 2. Non authentifié → /login (avec returnTo pour redirection post-login)
 * 3. Rôle non autorisé → /non-autorise
 * 4. OK → affiche le composant enfant
 *
 * Exemple d'usage :
 *   <ProtectedRoute allowedRoles={['responsable_rh', 'directeur_rh']}>
 *     <AllRequestsPage />
 *   </ProtectedRoute>
 */
const ProtectedRoute = ({ allowedRoles = [], children }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>Chargement de la session...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/non-autorise" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
