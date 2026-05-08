import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Demandes from './pages/Demandes'
import Profil from './pages/Profil'
import NouvelleDemande from './pages/NouvelleDemande'
import Validation from './pages/Validation'
import ValidationHistorique from './pages/ValidationHistorique'
import DashboardDRH from './pages/DashboardDRH'
import Archives from './pages/Archives'
import { WifiOff } from 'lucide-react'

/**
 * Redirection de racine :
 * - DRH (responsable_rh, directeur_rh) → /rh/statistiques
 * - Autres → /dashboard
 */
const RoleBasedRedirect = () => {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />

  // Redirection automatique pour les comptes DRH
  if (user.role === 'responsable_rh' || user.role === 'directeur_rh') {
    return <Navigate to="/rh/statistiques" replace />
  }

  return <Navigate to="/dashboard" replace />
}

export default function App() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <>
      {!isOnline && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#ef4444',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '30px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          boxShadow: '0 10px 25px -5px rgba(239, 68, 68, 0.4)',
          zIndex: 9999,
          fontWeight: 600,
          fontSize: '0.95rem',
          animation: 'slideUp 0.3s ease-out'
        }}>
          <WifiOff size={20} />
          Vous êtes hors ligne. Veuillez vérifier votre connexion.
        </div>
      )}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<RoleBasedRedirect />} />

        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          
          {/* Routes Communes */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/mon-compte" element={<Profil />} />
          
          {/* Gestion des Congés */}
          <Route path="/conges/mes-demandes" element={<Demandes />} />
          <Route path="/conges/archives" element={<Archives />} />
          <Route path="/conges/nouvelle-demande" element={<NouvelleDemande />} />
          <Route path="/conges/mon-solde" element={<Dashboard />} /> {/* Redirige vers dashboard (solde y est) */}

          {/* Validation (Manager/RH) */}
          <Route path="/validation/equipe" element={<Validation />} />
          <Route path="/validation/historique" element={<ValidationHistorique />} />
          
          {/* RH (Directeur) */}
          <Route path="/rh/statistiques" element={<DashboardDRH />} />
          
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
