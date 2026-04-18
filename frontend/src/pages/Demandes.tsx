import { useState, useEffect } from 'react';
import api from '../api/axiosConfig';
import { FileText, Search, PlusCircle, Download, MoreHorizontal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Demandes() {
  const navigate = useNavigate();
  const [demandes, setDemandes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/demandes/')
      .then(res => {
        // DRF retourne { count, results: [...] } en mode paginé
        const list = Array.isArray(res.data) ? res.data : (res.data?.results ?? []);
        setDemandes(list);
      })
      .catch(e => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="demandes-v2">
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px'}}>
        <div>
          <h1 style={{fontSize: '2.2rem', fontWeight: 900}}>Archives des <span style={{color: 'var(--primary)'}}>Congés</span></h1>
          <p style={{color: 'var(--text-muted)', fontWeight: 600}}>Consultez et exportez l'historique de vos absences.</p>
        </div>
        <button 
          className="nav-item" 
          onClick={() => navigate('/conges/nouvelle-demande')}
          style={{background: 'var(--primary)', color: 'white', padding: '12px 24px'}}
        >
          <PlusCircle size={20} /> Nouvelle demande
        </button>
      </div>

      <div className="card-minimal" style={{padding: '0', overflow: 'hidden'}}>
        <div style={{padding: '25px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
           <div style={{display: 'flex', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '5px 15px', alignItems: 'center', gap: '10px', width: '350px'}}>
              <Search size={18} color="var(--text-muted)" />
              <input type="text" placeholder="Rechercher par date ou type..." style={{border: 'none', background: 'none', outline: 'none', padding: '8px', width: '100%', fontWeight: 600}} />
           </div>
        </div>

        <div style={{padding: '10px 30px 30px'}}>
          <table className="data-table">
            <thead>
              <tr style={{textAlign: 'left'}}>
                <th style={{padding: '15px 0', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)'}}>TYPE DE CONGÉ</th>
                <th style={{padding: '15px 0', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)'}}>PÉRIODE</th>
                <th style={{padding: '15px 0', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)'}}>DURÉE</th>
                <th style={{padding: '15px 0', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)'}}>STATUT</th>
                <th style={{padding: '15px 0', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textAlign: 'right'}}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{textAlign: 'center', padding: '50px', fontWeight: 600}}>Chargement de l'historique...</td></tr>
              ) : demandes.length === 0 ? (
                <tr><td colSpan={5} style={{textAlign: 'center', padding: '50px', color: 'var(--text-muted)', fontWeight: 600}}>Aucune demande enregistrée.</td></tr>
              ) : demandes.map(d => (
                <tr key={d.id} style={{borderBottom: '1px solid #f1f5f9'}}>
                  <td style={{padding: '20px 0'}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
                       <div style={{width: '40px', height: '40px', borderRadius: '10px', background: 'var(--sidebar-active-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                          <FileText size={20} color="var(--primary)" />
                       </div>
                       <span style={{fontWeight: 800, fontSize: '0.95rem'}}>{d.type_conge_nom}</span>
                    </div>
                  </td>
                  <td style={{fontWeight: 600}}>
                     Du <span style={{color: 'var(--primary)'}}>{d.date_debut}</span> au <span style={{color: 'var(--primary)'}}>{d.date_fin}</span>
                  </td>
                  <td style={{fontWeight: 900, fontSize: '1.1rem'}}>{d.duree} <span style={{fontSize: '0.8rem', fontWeight: 600}}>j</span></td>
                  <td>
                    <span className={`badge ${
                      d.statut === 'approuvee' ? 'badge-success' : 
                      d.statut === 'refusee' ? 'badge-danger' : 'badge-pending'
                    }`}>
                      {d.statut_display}
                    </span>
                  </td>
                  <td style={{textAlign: 'right'}}>
                     <div style={{display: 'flex', gap: '8px', justifyContent: 'flex-end'}}>
                        {d.statut === 'approuvee' && (
                          <button className="btn-icon" title="Télécharger le titre">
                             <Download size={18} />
                          </button>
                        )}
                        <button className="btn-icon">
                           <MoreHorizontal size={18} />
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
        .data-table { width: 100%; border-collapse: collapse; }
        .badge { padding: 6px 12px; border-radius: 6px; font-size: 0.75rem; font-weight: 800; display: inline-block; }
        .badge-success { background: #ecfdf5; color: #10b981; }
        .badge-danger { background: #fef2f2; color: #ef4444; }
        .badge-pending { background: #fffbeb; color: #f59e0b; }
        .btn-icon { padding: 8px; border-radius: 8px; background: #f8fafc; color: var(--text-muted); border: none; cursor: pointer; transition: 0.2s; }
        .btn-icon:hover { background: #f1f5f9; color: var(--primary); }
      `}</style>
    </div>
  );
}
