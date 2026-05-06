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
  return (
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
  )
}
