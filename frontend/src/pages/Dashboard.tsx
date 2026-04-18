import { useState, useEffect } from 'react';
import api from '../api/axiosConfig';
import { useAuth } from '../context/AuthContext';
import { 
  BarChart3, 
  CalendarCheck, 
  ArrowRightCircle,
  TrendingUp
} from 'lucide-react';


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

  if (loading) return <div style={{padding: '50px', textAlign: 'center', fontWeight: 700}}>Chargement de vos statistiques...</div>;

  return (
    <div className="dashboard-v2">
      <div style={{marginBottom: '40px'}}>
        <h1 style={{fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-0.02em'}}>Bonjour, <span style={{color: 'var(--primary)'}}>{user?.first_name}</span></h1>
        <p style={{color: 'var(--text-muted)', fontSize: '1.1rem', fontWeight: 600}}>Voici l'état de vos congés pour l'exercice en cours.</p>
      </div>

      {/* --- CARDS GRID --- */}
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '30px', marginBottom: '50px'}}>
        
        <div className="card-minimal" style={{position: 'relative', overflow: 'hidden'}}>
          <div style={{position: 'relative', zIndex: 1}}>
            <p style={{color: 'var(--text-muted)', fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '15px'}}>Solde Restant</p>
            <div style={{fontSize: '3.5rem', fontWeight: 900, color: 'var(--primary)', marginBottom: '10px'}}>{stats.solde} <span style={{fontSize: '1rem', color: 'var(--text-main)'}}>Jours</span></div>
            <div style={{display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontWeight: 700, fontSize: '0.9rem'}}>
               <TrendingUp size={16} /> +2.5j acquis ce mois
            </div>
          </div>
          <BarChart3 style={{position: 'absolute', right: '-20px', bottom: '-20px', width: '150px', height: '150px', opacity: 0.03}} />
        </div>

        <div className="card-minimal">
          <p style={{color: 'var(--text-muted)', fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '15px'}}>Demandes en cours</p>
          <div style={{fontSize: '3.5rem', fontWeight: 900, marginBottom: '10px'}}>{stats.attente} <span style={{fontSize: '1rem', color: 'var(--text-muted)'}}>Dossier(s)</span></div>
          <div style={{color: '#f59e0b', fontWeight: 700, fontSize: '0.9rem'}}>En attente de signature</div>
        </div>

        <div className="card-minimal" style={{background: 'var(--primary)', color: 'white'}}>
          <p style={{opacity: 0.8, fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '15px'}}>Consommés</p>
          <div style={{fontSize: '3.5rem', fontWeight: 900, marginBottom: '10px'}}>{stats.pris} <span style={{fontSize: '1rem', opacity: 0.8}}>Droit(s)</span></div>
          <div style={{fontSize: '0.9rem', opacity: 0.9}}>Approuvés par la hiérarchie</div>
        </div>

      </div>

      {/* --- INFO SECTION --- */}
      <div className="card-minimal" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #fee2e2', background: '#fffcfc'}}>
        <div style={{display: 'flex', gap: '20px', alignItems: 'center'}}>
          <div style={{width: '60px', height: '60px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white'}}>
             <CalendarCheck size={28} />
          </div>
          <div>
            <h3 style={{fontWeight: 800}}>Besoin de prendre des vacances ?</h3>
            <p style={{color: 'var(--text-muted)'}}>Planifiez votre prochaine absence en quelques clics.</p>
          </div>
        </div>
        <button className="nav-item" onClick={() => window.location.href='/conges/nouvelle-demande'} style={{background: 'var(--primary)', color: 'white', padding: '12px 30px'}}>
           Soumettre maintenant <ArrowRightCircle size={20} />
        </button>
      </div>

    </div>
  );
}
