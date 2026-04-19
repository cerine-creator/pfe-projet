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

/**
 * Redirection de racine : 
 * Tout le monde va vers /dashboard, car le Dashboard s'adapte au rôle.
 */
const RoleBasedRedirect = () => {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
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
        <Route path="/conges/nouvelle-demande" element={<NouvelleDemande />} />
        <Route path="/conges/mon-solde" element={<Dashboard />} /> {/* Redirige vers dashboard (solde y est) */}

        {/* Validation (Manager/RH) */}
        <Route path="/validation/equipe" element={<Validation />} />
        
        {/* RH (Directeur) */}
        <Route path="/rh/statistiques" element={<div className="card-minimal"><h1>Statistiques Globales RH</h1><p>En cours de développement...</p></div>} />
        
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
