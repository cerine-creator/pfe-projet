import { useState, useEffect } from 'react';
import api from '../api/axiosConfig';
import { useAuth } from '../context/AuthContext';
import { CheckCircle, XCircle, FileText, Search, User, Calendar, Clock } from 'lucide-react';

export default function Validation() {
  const { user } = useAuth();
  const [demandes, setDemandes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);

  const isRH = user?.role === 'responsable_rh' || user?.role === 'directeur_rh';
  const isManager = user?.role === 'responsable_hierarchique';

  const fetchDemandes = () => {
    setLoading(true);
    api.get('/demandes/a_valider/')
      .then(res => {
        const list = Array.isArray(res.data) ? res.data : (res.data?.results ?? []);
        // On ne montre que ce qui concerne le rôle actif
        const filteredList = list.filter((d: any) => {
            if (isManager) return d.statut === 'en_attente_resp';
            if (isRH) return d.statut === 'en_attente_rh';
            return false;
        });
        setDemandes(filteredList);
      })
      .catch(e => console.error(e))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDemandes();
  }, [user]);

  const handleAction = async (id: number, action: 'approve' | 'reject') => {
    setProcessingId(id);
    try {
        let endpoint = '';
        let payload = {};
        
        if (action === 'approve') {
            endpoint = isRH ? `/demandes/${id}/approuver_rh/` : `/demandes/${id}/valider_responsable/`;
        } else {
            const raison = window.prompt("Veuillez saisir le motif du refus :");
            if (raison === null) {
                setProcessingId(null);
                return; // Annulé par l'utilisateur
            }
            endpoint = isRH ? `/demandes/${id}/refuser/` : `/demandes/${id}/refuser_responsable/`;
            payload = { raison: raison || 'Raison non spécifiée' };
        }

        await api.post(endpoint, payload);
        fetchDemandes(); // Rafraîchir la liste
    } catch (e: any) {
        alert(e.response?.data?.detail || "Une erreur est survenue lors de l'opération.");
    } finally {
        setProcessingId(null);
    }
  };

  return (
    <div className="validation-page fade-in">
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px'}}>
        <div>
          <h1 style={{fontSize: '2.2rem', fontWeight: 900}}>
            Portail de <span style={{color: 'var(--primary)'}}>Validation</span>
          </h1>
          <p style={{color: 'var(--text-muted)', fontWeight: 600, marginTop: '8px'}}>
            Examinez et gérez les demandes de congé de votre équipe.
          </p>
        </div>
      </div>

      <div className="card-minimal" style={{padding: '0', overflow: 'hidden'}}>
        <div style={{padding: '25px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc'}}>
           <div style={{display: 'flex', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '8px 15px', alignItems: 'center', gap: '10px', width: '350px', background: 'white'}}>
              <Search size={18} color="var(--text-muted)" />
              <input type="text" placeholder="Rechercher un employé..." style={{border: 'none', background: 'none', outline: 'none', padding: '4px', width: '100%', fontWeight: 600}} />
           </div>
           
           <div className="badge-count">
             {demandes.length} demande(s) en attente
           </div>
        </div>

        <div style={{padding: '20px 30px 30px'}}>
          <table className="data-table">
            <thead>
              <tr style={{textAlign: 'left'}}>
                <th style={{padding: '15px 0', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)'}}>EMPLOYÉ</th>
                <th style={{padding: '15px 0', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)'}}>TYPE DE CONGÉ</th>
                <th style={{padding: '15px 0', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)'}}>PÉRIODE</th>
                <th style={{padding: '15px 0', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)'}}>DURÉE</th>
                <th style={{padding: '15px 0', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textAlign: 'right'}}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{textAlign: 'center', padding: '60px', fontWeight: 600}}>Recherche des demandes...</td></tr>
              ) : demandes.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{textAlign: 'center', padding: '80px', color: 'var(--text-muted)'}}>
                    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px'}}>
                      <div style={{background: '#f1f5f9', padding: '20px', borderRadius: '50%'}}>
                        <CheckCircle size={40} color="#94a3b8" />
                      </div>
                      <span style={{fontWeight: 700, fontSize: '1.1rem'}}>Aucune demande en attente.</span>
                      <span style={{fontSize: '0.9rem'}}>Vous êtes à jour dans vos validations !</span>
                    </div>
                  </td>
                </tr>
              ) : demandes.map(d => (
                <tr key={d.id} className="row-hover" style={{borderBottom: '1px solid #f1f5f9'}}>
                  <td style={{padding: '20px 0'}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
                       <div className="avatar-placeholder">
                          <User size={20} color="var(--primary)" />
                       </div>
                       <div>
                         <div style={{fontWeight: 800, fontSize: '1rem'}}>ID Employé: {d.employe}</div>
                       </div>
                    </div>
                  </td>
                  <td>
                    <div style={{display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700}}>
                       <FileText size={16} color="var(--text-muted)" />
                       {d.type_conge_nom}
                    </div>
                  </td>
                  <td>
                     <div style={{display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: '#475569'}}>
                        <Calendar size={16} />
                        Du {d.date_debut} au {d.date_fin}
                     </div>
                  </td>
                  <td>
                    <span className="duration-badge">
                      <Clock size={14} />
                      {d.duree} jours
                    </span>
                  </td>
                  <td style={{textAlign: 'right'}}>
                     <div style={{display: 'flex', gap: '10px', justifyContent: 'flex-end'}}>
                        <button 
                          className="btn-action btn-reject" 
                          onClick={() => handleAction(d.id, 'reject')}
                          disabled={processingId === d.id}
                        >
                           <XCircle size={18} />
                           Refuser
                        </button>
                        <button 
                          className="btn-action btn-approve"
                          onClick={() => handleAction(d.id, 'approve')}
                          disabled={processingId === d.id}
                        >
                           <CheckCircle size={18} />
                           {processingId === d.id ? 'En cours...' : 'Valider'}
                        </button>
                     </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        .validation-page { animation: fadeIn 0.4s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        
        .data-table { width: 100%; border-collapse: collapse; }
        .row-hover { transition: background-color 0.2s; }
        .row-hover:hover { background-color: #f8fafc; }
        
        .avatar-placeholder { width: 45px; height: 45px; border-radius: 12px; background: #eff6ff; display: flex; alignItems: center; justify-content: center; }
        
        .badge-count { background: var(--primary); color: white; padding: 6px 14px; border-radius: 20px; font-weight: 700; font-size: 0.85rem; box-shadow: 0 4px 10px rgba(43, 84, 203, 0.2); }
        .duration-badge { display: inline-flex; align-items: center; gap: 6px; background: #f1f5f9; padding: 6px 12px; border-radius: 8px; font-weight: 800; color: #334155; font-size: 0.9rem; }
        
        .btn-action { display: flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 8px; font-weight: 700; border: none; cursor: pointer; transition: all 0.2s; font-size: 0.85rem; }
        .btn-action:disabled { opacity: 0.6; cursor: not-allowed; }
        
        .btn-reject { background: #fff1f2; color: #e11d48; }
        .btn-reject:hover:not(:disabled) { background: #ffe4e6; transform: translateY(-1px); }
        
        .btn-approve { background: #ecfdf5; color: #059669; }
        .btn-approve:hover:not(:disabled) { background: #d1fae5; transform: translateY(-1px); }
      `}</style>
    </div>
  );
}
