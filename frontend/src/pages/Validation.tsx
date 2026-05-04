import { useState, useEffect } from 'react';
import api from '../api/axiosConfig';
import { useAuth } from '../context/AuthContext';
import { CheckCircle, XCircle, FileText, Search, User, Calendar, Clock } from 'lucide-react';
import './validation.css';

export default function Validation() {
  const { user } = useAuth();
  const [demandes, setDemandes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [selectedDemande, setSelectedDemande] = useState<any | null>(null);
  const [showRefusalInput, setShowRefusalInput] = useState(false);
  const [refusalReason, setRefusalReason] = useState("");
  const [historiqueDemandes, setHistoriqueDemandes] = useState<any[]>([]);
  const [historiqueFilter, setHistoriqueFilter] = useState('Tous');

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

  const fetchHistorique = () => {
    api.get('/demandes/historique/')
      .then(res => {
        const list = Array.isArray(res.data) ? res.data : (res.data?.results ?? []);
        setHistoriqueDemandes(list);
      })
      .catch(e => console.error(e));
  };

  useEffect(() => {
    fetchDemandes();
    fetchHistorique();
  }, [user]);

  const handleAction = async (id: number, action: 'approve' | 'reject') => {
    setProcessingId(id);
    try {
      let endpoint = '';
      let payload = {};

      if (action === 'approve') {
        endpoint = isRH ? `/demandes/${id}/approuver_rh/` : `/demandes/${id}/valider_responsable/`;
      } else {
        if (!refusalReason.trim()) {
          alert("Veuillez saisir un motif pour le refus.");
          setProcessingId(null);
          return;
        }
        endpoint = isRH ? `/demandes/${id}/refuser/` : `/demandes/${id}/refuser_responsable/`;
        payload = { raison: refusalReason };
      }

      await api.post(endpoint, payload);
      fetchDemandes(); // Rafraîchir la liste
      setSelectedDemande(null); // Fermer le modal
    } catch (e: any) {
      alert(e.response?.data?.detail || "Une erreur est survenue lors de l'opération.");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="validation-page">
      <div className="validation-header">
        <div>
          <h1 className="page-title">
            Portail de <span className="text-primary">Validation</span>
          </h1>
          <p className="page-subtitle">
            Examinez et gérez les demandes de congé de votre équipe.
          </p>
        </div>
      </div>

      <div className="card-minimal card-no-padding">
        <div className="table-toolbar-light">
          <div className="search-bar-white">
            <Search size={18} color="var(--text-muted)" />
            <input type="text" placeholder="Rechercher un employé..." className="search-input" />
          </div>

          <div className="badge-count">
            {demandes.length} demande(s) en attente
          </div>
        </div>

        <div className="table-body">
          <table className="data-table">
            <thead>
              <tr>
                <th className="th-cell">EMPLOYÉ</th>
                <th className="th-cell">TYPE DE CONGÉ</th>
                <th className="th-cell">PÉRIODE</th>
                <th className="th-cell">DURÉE</th>
                <th className="th-cell-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="td-loading">Recherche des demandes...</td></tr>
              ) : demandes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="td-cell" style={{ textAlign: 'center', padding: '80px', color: 'var(--text-muted)' }}>
                    <div className="empty-state">
                      <div className="empty-icon-wrap">
                        <CheckCircle size={40} color="#94a3b8" />
                      </div>
                      <span className="empty-title">Aucune demande en attente.</span>
                      <span className="empty-sub">Vous êtes à jour dans vos validations !</span>
                    </div>
                  </td>
                </tr>
              ) : demandes.map(d => (
                <tr key={d.id} className="table-row row-hover">
                  <td className="td-cell">
                    <div className="employee-cell">
                      <div className="avatar-placeholder">
                        <User size={20} color="var(--primary)" />
                      </div>
                      <div>
                        <div className="employee-name">{d.employe_noms}</div>
                        <div className="employee-date">Date de demande: {d.dateDemande}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="type-cell">
                      <FileText size={16} color="var(--text-muted)" />
                      {d.motif ? 'Congé Exceptionnel' : d.type_conge_nom}
                    </div>
                  </td>
                  <td>
                    <div className="period-cell">
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
                  <td className="td-cell-right">
                    <button
                      className="btn-primary"
                      onClick={() => {
                        setSelectedDemande(d);
                        setShowRefusalInput(false);
                        setRefusalReason("");
                      }}
                    >
                      Consulter
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card-minimal card-no-padding" style={{ marginTop: '24px' }}>
        <div className="table-toolbar-light">
          <div>
            <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Historique des décisions</h2>
            <p className="page-subtitle" style={{ margin: '8px 0 0 0' }}>
              Consultez les demandes que vous avez approuvées ou refusées.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <label htmlFor="historique-filter" style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Filtrer :</label>
            <select
              id="historique-filter"
              className="filter-select"
              value={historiqueFilter}
              onChange={e => setHistoriqueFilter(e.target.value)}
            >
              <option value="Tous">Tous les statuts</option>
              <option value="approuvee">Approuvées</option>
              <option value="refusee">Refusées</option>
            </select>
          </div>
        </div>

        <div className="table-body">
          <table className="data-table">
            <thead>
              <tr>
                <th className="th-cell">EMPLOYÉ</th>
                <th className="th-cell">STATUT</th>
                <th className="th-cell">PÉRIODE</th>
                <th className="th-cell-right">DATE</th>
              </tr>
            </thead>
            <tbody>
              {historiqueDemandes.length === 0 ? (
                <tr>
                  <td colSpan={4} className="td-cell" style={{ textAlign: 'center', padding: '50px', color: 'var(--text-muted)' }}>
                    <div className="empty-state">
                      <span className="empty-title">Aucun historique pour le moment.</span>
                      <span className="empty-sub">Les demandes apparaîtront ici après approbation ou refus.</span>
                    </div>
                  </td>
                </tr>
              ) : historiqueDemandes
                  .filter(d => historiqueFilter === 'Tous' ? true : d.statut === historiqueFilter)
                  .map(d => (
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
                        <span className={d.statut === 'approuvee' ? 'badge-success' : 'badge-danger'}>
                          {d.statut_display}
                        </span>
                      </td>
                      <td>
                        Du {d.date_debut} au {d.date_fin}
                      </td>
                      <td className="td-cell-right">
                        {d.dateDemande}
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE DÉTAILS */}
      {selectedDemande && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">Détails de la demande</h2>
              <button onClick={() => setSelectedDemande(null)} className="modal-close-btn">
                <XCircle size={24} color="var(--text-muted)" />
              </button>
            </div>

            <div className="modal-detail-box">
              <div className="modal-detail-grid">
                <div>
                  <div className="detail-label">Employé</div>
                  <div className="detail-value">{selectedDemande.employe_noms}</div>
                </div>
                <div>
                  <div className="detail-label">Date de la demande</div>
                  <div className="detail-value">{selectedDemande.dateDemande}</div>
                </div>
                <div>
                  <div className="detail-label">Type de congé</div>
                  <div className="detail-value">{selectedDemande.motif ? 'Congé Exceptionnel' : selectedDemande.type_conge_nom}</div>
                </div>
                <div>
                  <div className="detail-label">Durée</div>
                  <div className="detail-value">{selectedDemande.duree} jours</div>
                </div>
                <div>
                  <div className="detail-label">Période</div>
                  <div className="detail-value">Du {selectedDemande.date_debut} au {selectedDemande.date_fin}</div>
                </div>
                {selectedDemande.motif_display && (
                  <div>
                    <div className="detail-label">Motif spécifique</div>
                    <div className="detail-value detail-value-accent">{selectedDemande.motif_display}</div>
                  </div>
                )}
                {selectedDemande.justificatif_url && (
                  <div>
                    <div className="detail-label">Justificatif</div>
                    <div className="detail-value">
                      <a 
                        href={`http://localhost:8000${selectedDemande.justificatif_url}`} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        style={{ color: 'var(--primary)', textDecoration: 'underline', fontWeight: 500 }}
                      >
                        Voir le document
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-actions">
              {showRefusalInput ? (
                <div className="refusal-panel">
                  <textarea
                    rows={3}
                    value={refusalReason}
                    onChange={(e) => setRefusalReason(e.target.value)}
                    placeholder="Veuillez saisir le motif du refus..."
                    className="refusal-textarea"
                    autoFocus
                  />
                  <div className="refusal-buttons">
                    <button
                      className="btn-action btn-cancel-refusal"
                      onClick={() => setShowRefusalInput(false)}
                    >
                      Annuler
                    </button>
                    <button
                      className="btn-action btn-reject btn-confirm-refusal"
                      onClick={() => handleAction(selectedDemande.id, 'reject')}
                      disabled={processingId === selectedDemande.id || !refusalReason.trim()}
                    >
                      Confirmer le refus
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <button
                    className="btn-action btn-reject btn-action-padded"
                    onClick={() => setShowRefusalInput(true)}
                    disabled={processingId === selectedDemande.id}
                  >
                    <XCircle size={18} />
                    Refuser
                  </button>
                  <button
                    className="btn-action btn-approve btn-action-padded"
                    onClick={() => handleAction(selectedDemande.id, 'approve')}
                    disabled={processingId === selectedDemande.id}
                  >
                    <CheckCircle size={18} />
                    {processingId === selectedDemande.id ? 'Traitement...' : 'Approuver'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
