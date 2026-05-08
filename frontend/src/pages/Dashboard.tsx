import { useState, useEffect } from 'react';
import api from '../api/axiosConfig';
import { useAuth } from '../context/AuthContext';
import { 
  BarChart3, 
  CalendarCheck, 
  ArrowRightCircle,
  TrendingUp
} from 'lucide-react';
import './dashboard.css';


export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ solde: 0, attente: 0, pris: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // /employes/me/ peut retourner 404 si le compte n'est pas lié à un profil employé
        const [resEmp, resDem] = await Promise.allSettled([
          api.get('/employes/me/'),
          api.get('/demandes/?page_size=1000'),
        ]);

        // Réponse paginée : { count, results: [...] } ou tableau direct
        const demList =
          resDem.status === 'fulfilled'
            ? Array.isArray(resDem.value.data)
              ? resDem.value.data
              : resDem.value.data?.results ?? []
            : [];

        setStats({
          solde:
            resEmp.status === 'fulfilled'
              ? resEmp.value.data?.solde_affichage ?? 0
              : 0,
          attente: demList.filter((d: any) => d.statut?.includes('attente')).length,
          pris: demList.filter((d: any) => d.statut === 'approuvee').length,
        });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="dashboard-v2">
        <div className="page-header">
          <div className="skeleton-block" style={{ width: '250px', height: '35px', marginBottom: '10px' }}></div>
          <div className="skeleton-block" style={{ width: '350px', height: '15px' }}></div>
        </div>
        <div className="stats-grid" style={{ marginTop: '30px' }}>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card-minimal" style={{ padding: '25px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div className="skeleton-block" style={{ width: '120px', height: '14px' }}></div>
              <div className="skeleton-block" style={{ width: '80px', height: '32px' }}></div>
              <div className="skeleton-block" style={{ width: '150px', height: '12px', marginTop: '10px' }}></div>
            </div>
          ))}
        </div>
        <div className="card-minimal info-section" style={{ marginTop: '30px' }}>
          <div className="info-section-left">
            <div className="skeleton-avatar" style={{ width: '56px', height: '56px', borderRadius: '14px' }}></div>
            <div className="info-text">
              <div className="skeleton-block" style={{ width: '250px', height: '22px', marginBottom: '10px' }}></div>
              <div className="skeleton-block" style={{ width: '300px', height: '14px' }}></div>
            </div>
          </div>
          <div className="skeleton-block" style={{ width: '200px', height: '48px', borderRadius: '12px' }}></div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-v2">
      <div className="page-header">
        <h1 className="page-title-lg">Bonjour, <span className="text-primary">{user?.first_name}</span></h1>
        <p className="page-subtitle page-subtitle-lg">Voici l'état de vos congés pour l'exercice en cours.</p>
      </div>

      {/* --- CARDS GRID --- */}
      <div className="stats-grid">
        
        <div className="card-minimal card-relative">
          <div className="card-content">
            <p className="stat-label">Solde Restant</p>
            <div className="stat-value text-primary">{stats.solde} <span className="stat-unit stat-unit-main">Jours</span></div>
            <div className="trending-row">
               <TrendingUp size={16} /> +2.5j acquis ce mois
            </div>
          </div>
          <BarChart3 className="bg-icon" />
        </div>

        <div className="card-minimal">
          <p className="stat-label">Demandes en cours</p>
          <div className="stat-value">{stats.attente} <span className="stat-unit stat-unit-muted">Dossier(s)</span></div>
          <div className="pending-text">En attente de signature</div>
        </div>

        <div className="card-minimal card-blue">
          <p className="stat-label">Consommés</p>
          <div className="stat-value">{stats.pris} <span className="stat-unit">Droit(s)</span></div>
          <div className="card-footer-text">Approuvés par la hiérarchie</div>
        </div>

      </div>

      {/* --- INFO SECTION --- */}
      <div className="card-minimal info-section">
        <div className="info-section-left">
          <div className="icon-box-lg">
             <CalendarCheck size={28} />
          </div>
          <div className="info-text">
            <h3>Besoin de prendre des vacances ?</h3>
            <p>Planifiez votre prochaine absence en quelques clics.</p>
          </div>
        </div>
        <button className="btn-primary" onClick={() => window.location.href='/conges/nouvelle-demande'}>
           Soumettre maintenant <ArrowRightCircle size={20} />
        </button>
      </div>

    </div>
  );
}
