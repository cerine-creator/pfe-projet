import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'

// ─── Composant générique très léger pour remplacer les longues pages ───
const DashboardPlaceholder = ({ title }: { title: string }) => (
  <div className="card-minimal">
    <h1 className="title-minimal">{title}</h1>
    <p className="desc-minimal">Cette interface sera gérée dans une prochaine étape de développement.</p>
  </div>
)

// ─── Composant de racine : Redirige vers le bon tableau de bord ───
const RoleBasedRedirect = () => {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  // Extrait le premier mot du rôle pour l'URL (ex: 'responsable_hierarchique' -> 'responsable')
  const prefix = user.role.split('_')[0]
  return <Navigate to={`/${prefix}/dashboard`} replace />
}

// ─── Routeur Minimaliste ───
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      {/* Redirection dynamique sur la racine '/' */}
      <Route path="/" element={<RoleBasedRedirect />} />

      {/* 
        Le Layout enveloppe TOUT le reste. 
        S'il y a Layout, ProtectedRoute est forcé. 
        On évite ainsi d'écrire <ProtectedRoute> 50 fois ! 
      */}
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        
        {/* Vues Employé */}
        <Route path="/employe/dashboard" element={<DashboardPlaceholder title="Espace Employé : Tableau de Bord" />} />
        
        {/* Vues Responsable Hiérarchique */}
        <Route path="/responsable/dashboard" element={<DashboardPlaceholder title="Espace Manager : Vue d'équipe" />} />
        
        {/* Vues RH (Responsable RH / Directeur) */}
        <Route path="/rh/dashboard" element={<DashboardPlaceholder title="Espace Ressources Humaines : Overview" />} />
        
      </Route>

      {/* Reste du code erroné renvoie vers l'accueil */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
