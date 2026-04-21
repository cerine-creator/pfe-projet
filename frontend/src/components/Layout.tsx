import { useNavigate, Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';
import { 
  Home, 
  Send, 
  UserCircle, 
  ShieldCheck, 
  PieChart, 
  LogOut
} from 'lucide-react';
import './layout.css';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  if (!user) return null;

  return (
    <div className="app-layout">
      {/* ─── BARRE HORIZONTALE (TOP NAV) ─── */}
      <header className="top-nav">
        
        <div className="nav-left">
          <img src="/logo.svg" alt="Air Algérie" className="nav-logo" />
          
          <nav className="nav-links">
            <NavLink to="/dashboard" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
              <Home size={18} /> Tableau de bord
            </NavLink>
            
            <NavLink to="/conges/mes-demandes" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
              <Send size={18} /> Mes Congés
            </NavLink>
            
            {(user.role !== 'employe') && (
              <NavLink to="/validation/equipe" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
                <ShieldCheck size={18} /> Validation
              </NavLink>
            )}

            {user.role === 'directeur_rh' && (
              <NavLink to="/rh/statistiques" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
                <PieChart size={18} /> Stats RH
              </NavLink>
            )}
          </nav>
        </div>

        <div className="nav-right">
          {/* ── Cloche de notifications ── */}
          <NotificationBell />

          <div className="user-badge user-badge-clickable" onClick={() => navigate('/mon-compte')}>
            <div className="user-badge-info">
              <span className="user-badge-name">{user.first_name} {user.last_name}</span>
              <span className="user-badge-role">{user.role_display}</span>
            </div>
            <UserCircle size={24} color="var(--primary)" />
          </div>

          <LogOut className="logout-icon" size={22} onClick={logout} />
        </div>

      </header>

      {/* ─── CONTENU PRINCIPAL ─── */}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
