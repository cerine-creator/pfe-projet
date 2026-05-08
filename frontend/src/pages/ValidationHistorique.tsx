import { useState, useEffect } from 'react';
import api from '../api/axiosConfig';
import { User, History, Download, Filter, X, Eye } from 'lucide-react';
import './validation.css';

export default function ValidationHistorique() {
  const [historiqueDemandes, setHistoriqueDemandes] = useState<any[]>([]);
  const [historiqueFilter, setHistoriqueFilter] = useState('Tous');
  const [loading, setLoading] = useState(true);
  const [selectedDemande, setSelectedDemande] = useState<any | null>(null);

  useEffect(() => {
    api.get('/demandes/historique/')
      .then(res => {
        const list = Array.isArray(res.data) ? res.data : (res.data?.results ?? []);
        setHistoriqueDemandes(list);
      })
      .catch(e => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  const handleDownloadPDF = async (id: number) => {
    try {
      const response = await api.get(`demandes/${id}/exporter_pdf/`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Titre_Conge_${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Erreur PDF", error);
    }
  };

  const filteredHistory = historiqueDemandes.filter(d => {
    if (historiqueFilter === 'Tous') return true;
    return d.statut === historiqueFilter;
  });

  if (loading) {
    return (
      <div className="validation-page">
        <div className="validation-header">
          <div>
            <h1 className="page-title">Historique des <span className="text-primary">Décisions</span></h1>
            <p className="page-subtitle">Consultez les demandes que vous avez précédemment approuvées ou refusées.</p>
          </div>
          <div className="icon-box-large">
             <History size={32} color="var(--primary)" />
          </div>
        </div>
        <div className="card-minimal card-no-padding">
          <div className="table-body">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="th-cell">EMPLOYÉ</th>
                  <th className="th-cell">STATUT</th>
                  <th className="th-cell">PÉRIODE</th>
                  <th className="th-cell-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {[...Array(4)].map((_, i) => (
                  <tr key={`skel-vh-${i}`} className="table-row skeleton-row">
                    <td className="td-cell">
                      <div className="employee-cell">
                        <div className="skeleton-avatar" style={{ width: '40px', height: '40px', borderRadius: '12px' }}></div>
                        <div>
                          <div className="skeleton-block" style={{ width: '120px', marginBottom: '8px' }}></div>
                          <div className="skeleton-block" style={{ width: '80px', height: '12px' }}></div>
                        </div>
                      </div>
                    </td>
                    <td><div className="skeleton-block" style={{ width: '90px', borderRadius: '20px' }}></div></td>
                    <td><div className="skeleton-block" style={{ width: '150px' }}></div></td>
                    <td className="td-cell-right"><div className="skeleton-block" style={{ width: '35px', height: '35px', borderRadius: '8px', marginLeft: 'auto' }}></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="validation-page">
      <div className="validation-header">
        <div>
          <h1 className="page-title">Historique des <span className="text-primary">Décisions</span></h1>
          <p className="page-subtitle">Consultez les demandes que vous avez précédemment approuvées ou refusées.</p>
        </div>
        <div className="icon-box-large">
           <History size={32} color="var(--primary)" />
        </div>
      </div>

      <div className="card-minimal card-no-padding">
        <div className="table-toolbar-light">
          <div className="urgence-filter-wrap">
            <Filter size={18} color="var(--text-muted)" />
            <select
              className="filter-select urgence-filter-select"
              value={historiqueFilter}
              onChange={e => setHistoriqueFilter(e.target.value)}
            >
              <option value="Tous">Tous les statuts</option>
              <option value="approuvee">Approuvées</option>
              <option value="refusee">Refusées</option>
              <option value="en_attente_rh">En attente RH (Validation Responsable faite)</option>
              <option value="expiree">Expirées</option>
            </select>
          </div>
          <div className="badge-count">
            {filteredHistory.length} décision(s) archivée(s)
          </div>
        </div>

        <div className="table-body">
          <table className="data-table">
            <thead>
              <tr>
                <th className="th-cell">EMPLOYÉ</th>
                <th className="th-cell">STATUT</th>
                <th className="th-cell">PÉRIODE</th>
                <th className="th-cell-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={4} className="td-cell" style={{ textAlign: 'center', padding: '80px', color: 'var(--text-muted)' }}>
                    Aucun historique correspondant.
                  </td>
                </tr>
              ) : (
                filteredHistory.map(d => (
                  <tr key={d.id} className="table-row row-hover">
                    <td className="td-cell">
                      <div className="employee-cell">
                        <div className="avatar-placeholder">
                          <User size={20} color="var(--primary)" />
                        </div>
                        <div>
                          <div className="employee-name">{d.employe_noms}</div>
                          <div className="employee-date">{d.type_conge_nom || 'Congé'}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${
                        d.statut === 'approuvee' ? 'badge-success' :
                        d.statut === 'refusee' ? 'badge-danger' :
                        d.statut === 'expiree' ? 'badge-expired' : 'badge-pending'
                      }`}>
                        {d.statut_display}
                      </span>
                    </td>
                    <td>Du {d.date_debut} au {d.date_fin}</td>
                    <td className="td-cell-right">
                      <div className="action-group">
                        {d.statut === 'approuvee' && (
                          <button 
                            className="btn-icon" 
                            title="Télécharger le titre"
                            onClick={() => handleDownloadPDF(d.id)}
                          >
                            <Download size={18} />
                          </button>
                        )}
                        <button 
                          className="btn-icon" 
                          title="Voir les détails" 
                          onClick={() => setSelectedDemande(d)}
                        >
                          <Eye size={18} />
                        </button>
                        <div className="employee-date" style={{ marginLeft: '10px' }}>{d.dateDemande}</div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedDemande && (
        <div className="modal-overlay" onClick={() => setSelectedDemande(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Détails de la décision</h2>
              <button onClick={() => setSelectedDemande(null)} className="modal-close-btn">
                <X size={24} color="var(--text-muted)" />
              </button>
            </div>

            <div className="modal-detail-box">
              <div className="modal-detail-grid">
                <div><div className="detail-label">Employé</div><div className="detail-value">{selectedDemande.employe_noms}</div></div>
                <div><div className="detail-label">Période</div><div className="detail-value">Du {selectedDemande.date_debut} au {selectedDemande.date_fin}</div></div>
                <div><div className="detail-label">Type</div><div className="detail-value">{selectedDemande.type_conge_nom}</div></div>
                <div><div className="detail-label">Durée</div><div className="detail-value">{selectedDemande.duree} jours</div></div>
              </div>
            </div>

            <div className="modal-actions">
              {selectedDemande.statut === 'approuvee' && (
                <button className="btn-primary" onClick={() => handleDownloadPDF(selectedDemande.id)}>
                   <Download size={18} /> Télécharger le titre
                </button>
              )}
              <button className="btn-secondary" onClick={() => setSelectedDemande(null)}>Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
