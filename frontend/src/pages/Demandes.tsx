import { useState, useEffect } from 'react';
import api from '../api/axiosConfig';
import { FileText, Search, PlusCircle, Download, MoreHorizontal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './demandes.css';

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
      <div className="demandes-header">
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1 className="page-title">Archives des <span className="text-primary">Congés</span></h1>
          <p className="page-subtitle">Consultez et exportez l'historique de vos absences.</p>
        </div>
        <button 
          className="nav-item new-demande-btn" 
          onClick={() => navigate('/conges/nouvelle-demande')}
        >
          <PlusCircle size={20} /> Nouvelle demande
        </button>
      </div>

      <div className="card-minimal card-no-padding">
        <div className="table-toolbar-plain">
           <div className="search-bar">
              <Search size={18} color="var(--text-muted)" />
              <input type="text" placeholder="Rechercher par date ou type..." className="search-input" />
           </div>
        </div>

        <div className="table-body">
          <table className="data-table">
            <thead>
              <tr>
                <th className="th-cell">TYPE DE CONGÉ</th>
                <th className="th-cell">PÉRIODE</th>
                <th className="th-cell">DURÉE</th>
                <th className="th-cell">STATUT</th>
                <th className="th-cell-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="td-loading">Chargement de l'historique...</td></tr>
              ) : demandes.length === 0 ? (
                <tr><td colSpan={5} className="td-empty">Aucune demande enregistrée.</td></tr>
              ) : demandes.map(d => (
                <tr key={d.id} className="table-row">
                  <td className="td-cell">
                    <div className="cell-icon-label">
                       <div className="icon-box">
                          <FileText size={20} color="var(--primary)" />
                       </div>
                       <span className="cell-label">{d.type_conge_nom}</span>
                    </div>
                  </td>
                  <td className="td-period">
                     Du <span className="text-primary">{d.date_debut}</span> au <span className="text-primary">{d.date_fin}</span>
                  </td>
                  <td className="td-duration">{d.duree} <span>j</span></td>
                  <td>
                    <span className={`badge ${
                      d.statut === 'approuvee' ? 'badge-success' : 
                      d.statut === 'refusee' ? 'badge-danger' : 'badge-pending'
                    }`}>
                      {d.statut_display}
                    </span>
                  </td>
                  <td className="td-cell-right">
                     <div className="action-group">
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
    </div>
  );
}
