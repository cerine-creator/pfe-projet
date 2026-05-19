import { useState, useEffect } from 'react';
import api from '../api/axiosConfig';
import { FileText, Search, PlusCircle, Eye, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CustomSelect from '../components/CustomSelect';
import DemandeDetailModal from '../components/DemandeDetailModal';
import { useAuth } from '../context/AuthContext';
import './demandes.css';

const BACKEND_URL = 'http://127.0.0.1:8000';

export default function Demandes() {
  const navigate = useNavigate();
  const [demandes, setDemandes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDemande, setSelectedDemande] = useState<any | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    api.get('/demandes/')
      .then(res => {
        const list = Array.isArray(res.data) ? res.data : (res.data?.results ?? []);
        setDemandes(list);
      })
      .catch(e => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  const filteredDemandes = demandes.filter(d => {
    return d.statut === 'en_attente_resp' || d.statut === 'en_attente_rh';
  });


  return (
    <div className="demandes-v2">
      <div className="demandes-header">
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1 className="page-title">Mes Congés <span className="text-primary">Actuels</span></h1>
          <p className="page-subtitle">Suivez l'état de vos demandes en attente.</p>
        </div>
        <button
          className="btn-primary"
          onClick={() => navigate('/conges/nouvelle-demande')}
        >
          <PlusCircle size={20} /> Nouvelle demande
        </button>
      </div>

      <div className="card-minimal card-no-padding">


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
                <>
                  {[...Array(4)].map((_, i) => (
                    <tr key={`skel-${i}`} className="table-row skeleton-row">
                      <td className="td-cell">
                        <div className="cell-icon-label">
                          <div className="skeleton-avatar" style={{ width: '35px', height: '35px', borderRadius: '8px' }}></div>
                          <div className="skeleton-block" style={{ width: '120px' }}></div>
                        </div>
                      </td>
                      <td><div className="skeleton-block" style={{ width: '180px' }}></div></td>
                      <td><div className="skeleton-block" style={{ width: '50px' }}></div></td>
                      <td><div className="skeleton-block" style={{ width: '80px', borderRadius: '20px' }}></div></td>
                      <td className="td-cell-right"><div className="skeleton-block" style={{ width: '35px', height: '35px', borderRadius: '8px', marginLeft: 'auto' }}></div></td>
                    </tr>
                  ))}
                </>
              ) : filteredDemandes.length === 0 ? (
                <tr><td colSpan={5} className="td-empty">Aucune demande trouvée.</td></tr>
              ) : filteredDemandes.map(d => (
                <tr key={d.id} className="table-row">
                  <td className="td-cell">
                    <div className="cell-icon-label">
                      <div className="icon-box">
                        <FileText size={20} color="var(--primary)" />
                      </div>
                      <span className="cell-label">{d.motif ? 'Congé Exceptionnel' : d.type_conge_nom}</span>
                    </div>
                  </td>
                  <td className="td-period">
                    Du <span className="text-primary">{d.date_debut}</span> au <span className="text-primary">{d.date_fin}</span>
                  </td>
                  <td className="td-duration">{d.duree} <span>j</span></td>
                  <td>
                    <span className={`badge ${d.statut === 'approuvee' ? 'badge-success' :
                        d.statut === 'refusee' ? 'badge-danger' :
                          d.statut === 'expiree' ? 'badge-expired' : 'badge-pending'
                      }`}>
                      {d.statut_display}
                    </span>
                  </td>
                  <td className="td-cell-right">
                    <div className="action-group">
                      <button className="btn-icon" title="Voir les détails" onClick={() => setSelectedDemande(d)}>
                        <Eye size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedDemande && (
        <DemandeDetailModal
          demande={selectedDemande}
          onClose={() => setSelectedDemande(null)}
          showEmployee={true}
        />
      )}
    </div>
  );
}
