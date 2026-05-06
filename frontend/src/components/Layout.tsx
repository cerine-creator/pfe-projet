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
  Menu,
  Sun,
  Moon,
  History,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import './layout.css';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCongesOpen, setIsCongesOpen] = useState(location.pathname.startsWith('/conges'));
  const [isValidationOpen, setIsValidationOpen] = useState(location.pathname.startsWith('/validation'));
  const { theme, toggleTheme } = useTheme();
  
  if (!user) return null;

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const toggleConges = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsCongesOpen(!isCongesOpen);
  };

  const toggleValidation = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsValidationOpen(!isValidationOpen);
  };

  useEffect(() => {
    document.body.classList.toggle('mobile-menu-open', isMobileMenuOpen);
    return () => document.body.classList.remove('mobile-menu-open');
  }, [isMobileMenuOpen]);

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <div className="app-layout">
      {/* ─── EN-TÊTE MOBILE ─── */}
      <header className="mobile-header">
        <img src="/logo.svg" alt="Air Algérie" className="mobile-logo" />
        <div className="mobile-header-right">
          <button
            type="button"
            className="notif-btn theme-toggle-btn"
            onClick={toggleTheme}
            aria-label="Changer le thème"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <NotificationBell />
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

      {/* ─── BARRE LATÉRALE (SIDEBAR) ─── */}
      <aside className="sidebar">
        
        <div className="sidebar-top">
          <img src="/logo.svg" alt="Air Algérie" className="sidebar-logo" />
          
          <nav className="sidebar-links">
            <NavLink to="/dashboard" className={({isActive}) => `sidebar-item ${isActive ? 'active' : ''}`} onClick={closeMobileMenu}>
              <Home size={18} /> Accueil
            </NavLink>
            
            <div className={`submenu-wrapper ${isCongesOpen ? 'is-open' : ''}`}>
              <button type="button" className="sidebar-item submenu-trigger" onClick={toggleConges}>
                <Send size={18} /> Mes Congés
                <ChevronDown size={16} className="chevron" />
              </button>
              
              <div className="submenu-items">
                <NavLink to="/conges/mes-demandes" className={({isActive}) => `sidebar-item sub-item ${isActive ? 'active' : ''}`} onClick={closeMobileMenu}>
                  Congés Actuels
                </NavLink>
                <NavLink to="/conges/archives" className={({isActive}) => `sidebar-item sub-item ${isActive ? 'active' : ''}`} onClick={closeMobileMenu}>
                  Archives
                </NavLink>
              </div>
            </div>
            
            {(user.role !== 'employe') && (
              <div className={`submenu-wrapper ${isValidationOpen ? 'is-open' : ''}`}>
                <button type="button" className="sidebar-item submenu-trigger" onClick={toggleValidation}>
                  <ShieldCheck size={18} /> Validation
                  <ChevronDown size={16} className="chevron" />
                </button>
                
                <div className="submenu-items">
                  <NavLink to="/validation/equipe" className={({isActive}) => `sidebar-item sub-item ${isActive ? 'active' : ''}`} onClick={closeMobileMenu}>
                    À Traiter
                  </NavLink>
                  <NavLink to="/validation/historique" className={({isActive}) => `sidebar-item sub-item ${isActive ? 'active' : ''}`} onClick={closeMobileMenu}>
                    Historique
                  </NavLink>
                </div>
              </div>
            )}

            {(user.role === 'responsable_rh' || user.role === 'directeur_rh') && (
              <NavLink to="/rh/statistiques" className={({isActive}) => `sidebar-item ${isActive ? 'active' : ''}`} onClick={closeMobileMenu}>
                <PieChart size={18} /> Stats RH
              </NavLink>
            )}
          </nav>
        </div>

        <div className="sidebar-actions">
          <button
            type="button"
            className="sidebar-account"
            onClick={() => navigate('/mon-compte')}
          >
            <UserCircle size={20} />
            Mon compte
          </button>
          <button
            type="button"
            className="sidebar-logout"
            onClick={logout}
          >
            <LogOut size={18} />
            Déconnexion
          </button>
        </div>
      </aside>

      {isMobileMenuOpen && (
        <div className="mobile-nav-panel" onClick={closeMobileMenu}>
          <div className="mobile-nav-content" onClick={(e) => e.stopPropagation()}>
            <nav className="mobile-nav-links">
              <NavLink to="/dashboard" className={({isActive}) => `sidebar-item ${isActive ? 'active' : ''}`} onClick={closeMobileMenu}>
                <Home size={18} /> Tableau de bord
              </NavLink>
              
              <div className={`submenu-wrapper ${isCongesOpen ? 'is-open' : ''}`}>
                <button type="button" className="sidebar-item submenu-trigger" onClick={toggleConges}>
                  <Send size={18} /> Mes Congés
                  <ChevronDown size={16} className="chevron" />
                </button>
                
                <div className="submenu-items">
                  <NavLink to="/conges/mes-demandes" className={({isActive}) => `sidebar-item sub-item ${isActive ? 'active' : ''}`} onClick={closeMobileMenu}>
                    Congés Actuels
                  </NavLink>
                  <NavLink to="/conges/archives" className={({isActive}) => `sidebar-item sub-item ${isActive ? 'active' : ''}`} onClick={closeMobileMenu}>
                    Archives
                  </NavLink>
                </div>
              </div>
              
              {(user.role !== 'employe') && (
                <div className={`submenu-wrapper ${isValidationOpen ? 'is-open' : ''}`}>
                  <button type="button" className="sidebar-item submenu-trigger" onClick={toggleValidation}>
                    <ShieldCheck size={18} /> Validation
                    <ChevronDown size={16} className="chevron" />
                  </button>
                  
                  <div className="submenu-items">
                    <NavLink to="/validation/equipe" className={({isActive}) => `sidebar-item sub-item ${isActive ? 'active' : ''}`} onClick={closeMobileMenu}>
                      À Traiter
                    </NavLink>
                    <NavLink to="/validation/historique" className={({isActive}) => `sidebar-item sub-item ${isActive ? 'active' : ''}`} onClick={closeMobileMenu}>
                      Historique
                    </NavLink>
                  </div>
                </div>
              )}

              {user.role === 'directeur_rh' && (
                <NavLink to="/rh/statistiques" className={({isActive}) => `sidebar-item ${isActive ? 'active' : ''}`} onClick={closeMobileMenu}>
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
      <div className="content-wrapper">
        <header className="content-header">
          <div className="content-header-right">
            <button
              type="button"
              className="notif-btn theme-toggle-btn"
              onClick={toggleTheme}
              aria-label="Changer le thème"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <NotificationBell />
          </div>
        </header>
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
