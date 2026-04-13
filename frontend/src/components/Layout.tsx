import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();
  
  // Sécurité: Ne rend rien si non connecté
  if (!user) return null;

  return (
    <div className="app-layout">
      {/* -- Le Menu Latéral (Sidebar) -- */}
      <aside className="sidebar">
        
        {/* Entête avec Logo */}
        <div className="sidebar-header">
          <img src="/logo.svg" alt="Air Algérie Logo" className="sidebar-logo" />
        </div>
        
        {/* Bloc Info Rapide Utilisateur */}
        <div className="sidebar-user">
          <div className="user-avatar">
            {user.username.charAt(0).toUpperCase()}
          </div>
          <div className="user-info">
            <div className="user-greeting">Bienvenue,</div>
            <div className="user-name">{user.username}</div>
            <div className="user-role">{user.role_display}</div>
          </div>
        </div>

        {/* Liens de Navigation */}
        <nav className="sidebar-nav">
          <NavLink 
            to={`/${user.role.split('_')[0]}/dashboard`} 
            className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}
          >
            Tableau de bord
          </NavLink>
        </nav>

        {/* Bouton de sortie */}
        <div className="sidebar-footer">
          <button onClick={logout} className="logout-btn">
            Déconnexion
          </button>
        </div>

      </aside>

      {/* -- Le contenu principal (Change à chaque clic de lien) -- */}
      <main className="main-content">
        <Outlet />
      </main>

    </div>
  );
}
