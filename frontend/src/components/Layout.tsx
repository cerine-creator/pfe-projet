import { useEffect, useState } from 'react';
import { useNavigate, Outlet, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';
import { 
  Home, 
  Send, 
  UserCircle, 
  ShieldCheck, 
  PieChart, 
  LogOut,
  Menu
} from 'lucide-react';
import './layout.css';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  if (!user) return null;

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.classList.toggle('mobile-menu-open', isMobileMenuOpen);
    return () => document.body.classList.remove('mobile-menu-open');
  }, [isMobileMenuOpen]);

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <div className="app-layout">
      {/* ─── BARRE HORIZONTALE (TOP NAV) ─── */}
      <header className="top-nav">
        
        <div className="nav-left">
          <img src="/logo.svg" alt="Air Algérie" className="nav-logo" />
          
          <nav className="nav-links">
            <NavLink to="/dashboard" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`} onClick={closeMobileMenu}>
              <Home size={18} /> Tableau de bord
            </NavLink>
            
            <NavLink to="/conges/mes-demandes" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`} onClick={closeMobileMenu}>
              <Send size={18} /> Mes Congés
            </NavLink>
            
            {(user.role !== 'employe') && (
              <NavLink to="/validation/equipe" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`} onClick={closeMobileMenu}>
                <ShieldCheck size={18} /> Validation
              </NavLink>
            )}

            {user.role === 'directeur_rh' && (
              <NavLink to="/rh/statistiques" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`} onClick={closeMobileMenu}>
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

          <button
            type="button"
            className={`mobile-menu-btn ${isMobileMenuOpen ? 'is-open' : ''}`}
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            aria-label={isMobileMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            aria-expanded={isMobileMenuOpen}
          >
            <Menu size={22} />
          </button>
        </div>
      </header>

      {isMobileMenuOpen && (
        <div className="mobile-nav-panel" onClick={closeMobileMenu}>
          <div className="mobile-nav-content" onClick={(e) => e.stopPropagation()}>
            <nav className="mobile-nav-links">
              <NavLink to="/dashboard" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`} onClick={closeMobileMenu}>
                <Home size={18} /> Tableau de bord
              </NavLink>
              
              <NavLink to="/conges/mes-demandes" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`} onClick={closeMobileMenu}>
                <Send size={18} /> Mes Congés
              </NavLink>
              
              {(user.role !== 'employe') && (
                <NavLink to="/validation/equipe" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`} onClick={closeMobileMenu}>
                  <ShieldCheck size={18} /> Validation
                </NavLink>
              )}

              {user.role === 'directeur_rh' && (
                <NavLink to="/rh/statistiques" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`} onClick={closeMobileMenu}>
                  <PieChart size={18} /> Stats RH
                </NavLink>
              )}
            </nav>

            <div className="mobile-nav-actions">
              <button
                type="button"
                className="mobile-nav-account"
                onClick={() => {
                  navigate('/mon-compte');
                  closeMobileMenu();
                }}
              >
                <UserCircle size={20} />
                Mon compte
              </button>
              <button
                type="button"
                className="mobile-nav-logout"
                onClick={() => {
                  closeMobileMenu();
                  logout();
                }}
              >
                <LogOut size={18} />
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── CONTENU PRINCIPAL ─── */}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
