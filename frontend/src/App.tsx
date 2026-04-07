import { useState, useEffect } from 'react';
import type { Employe } from './api';
import { fetchEmployees } from './api';
import { Users, User, Settings, Calendar, LogOut, CheckSquare, Briefcase, FileText } from 'lucide-react';
import './index.css';

type Role = 'employe' | 'responsable_hierarchique' | 'responsable_rh' | 'super_admin';

function App() {
  const [currentRole, setCurrentRole] = useState<Role>('employe');
  const [employees, setEmployees] = useState<Employe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Fetch all employees to use for our mockup UI
        const data = await fetchEmployees();
        setEmployees(data);
      } catch (error) {
        console.error("Error fetching employees", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const renderDashboardContent = () => {
    if (loading) return <div className="loading">Chargement des données...</div>;

    switch (currentRole) {
      case 'employe':
        return (
          <div className="dashboard-card slide-up">
            <h2>Mon Espace Employé</h2>
            <p>Bienvenue dans votre espace. Voici la liste des collaborateurs (version test MVC).</p>
            <div className="stat-boxes">
              <div className="stat-box">
                <Calendar />
                <h3>Mon Solde</h3>
                <p>30 Jours</p>
              </div>
              <div className="stat-box">
                <FileText />
                <h3>Mes Demandes</h3>
                <p>0 En attente</p>
              </div>
            </div>
            <h3>Vos Collègues ({employees.length})</h3>
            <EmployeeList employees={employees} />
          </div>
        );
      
      case 'responsable_hierarchique':
        const team = employees.filter(e => e.role === 'employe'); // Mock: team is all employees
        return (
          <div className="dashboard-card slide-up">
            <h2>Espace Responsable</h2>
            <p>Gérez les demandes de congé de votre équipe.</p>
            <div className="stat-boxes">
              <div className="stat-box accent">
                <CheckSquare />
                <h3>Demandes en attente</h3>
                <p>2 à valider</p>
              </div>
            </div>
            <h3>Votre Équipe ({team.length})</h3>
            <EmployeeList employees={team} />
            <div className="action-panel">
               <span className="badge">Boutons Approuver/Refuser (À venir)</span>
            </div>
          </div>
        );

      case 'responsable_rh':
        return (
          <div className="dashboard-card slide-up">
            <h2>Espace Ressources Humaines</h2>
            <p>Validation finale et gestion globale des congés.</p>
            <div className="stat-boxes">
               <div className="stat-box premium">
                <Briefcase />
                <h3>Approbations Finales</h3>
                <p>5 à traiter</p>
              </div>
            </div>
            <h3>Tous les Employés ({employees.length})</h3>
            <EmployeeList employees={employees} />
            <div className="action-panel">
                 <span className="badge">Validation Finale (À venir)</span>
            </div>
          </div>
        );

      case 'super_admin':
        return (
          <div className="dashboard-card slide-up">
            <h2>Console d'Administration</h2>
            <p>Accès complet pour configurer le système.</p>
            <div className="system-status">
               <div className="status-item green">Système en ligne</div>
               <div className="status-item green">Base de données OK</div>
            </div>
            <h3>Gestion des Utilisateurs ({employees.length})</h3>
            <EmployeeList employees={employees} />
          </div>
        );
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar / Role Switcher for MVC testing */}
      <aside className="sidebar">
        <div className="logo-area">
          <h3>PFE Congés</h3>
        </div>
        
        <div className="role-switcher">
          <p className="sidebar-label">Mode Test (MVC)</p>
          <button 
            className={`role-btn ${currentRole === 'employe' ? 'active' : ''}`}
            onClick={() => setCurrentRole('employe')}
          >
            <User size={18} /> Employé
          </button>
          <button 
            className={`role-btn ${currentRole === 'responsable_hierarchique' ? 'active' : ''}`}
            onClick={() => setCurrentRole('responsable_hierarchique')}
          >
            <Users size={18} /> Manager
          </button>
          <button 
            className={`role-btn ${currentRole === 'responsable_rh' ? 'active' : ''}`}
            onClick={() => setCurrentRole('responsable_rh')}
          >
            <Briefcase size={18} /> Responsable RH
          </button>
          <button 
            className={`role-btn ${currentRole === 'super_admin' ? 'active' : ''}`}
            onClick={() => setCurrentRole('super_admin')}
          >
            <Settings size={18} /> Super Admin
          </button>
        </div>

        <div className="sidebar-footer">
          <button className="logout-btn">
            <LogOut size={18}/> Quitter
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <header className="topbar">
          <h1>Tableau de bord : <span className="highlight-role">{currentRole.replace('_', ' ').toUpperCase()}</span></h1>
          <div className="user-profile">
            <div className="avatar"></div>
            <span>Connecté(e) en tant que {currentRole.replace('_', ' ')}</span>
          </div>
        </header>

        <section className="dashboard-area">
          {renderDashboardContent()}
        </section>
      </main>
    </div>
  );
}

// Simple Reusable Component
function EmployeeList({ employees }: { employees: Employe[] }) {
  if (employees.length === 0) return <p className="empty-state">Aucun employé trouvé.</p>;
  
  return (
    <div className="custom-table-wrapper">
      <table className="custom-table">
        <thead>
          <tr>
            <th>Nom Complet</th>
            <th>Email</th>
            <th>Matricule</th>
            <th>Rôle</th>
            <th>Solde Jours</th>
          </tr>
        </thead>
        <tbody>
          {employees.map(emp => (
            <tr key={emp.id} className="table-row-animate">
              <td className="font-medium">{emp.prenom} {emp.nom}</td>
              <td>{emp.email}</td>
              <td><span className="badge-gray">{emp.matricule}</span></td>
              <td>
                <span className={`role-badge ${emp.role}`}>
                    {emp.role.replace('_', ' ')}
                </span>
              </td>
              <td className="font-bold">{emp.jours_conges_restants}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default App;
