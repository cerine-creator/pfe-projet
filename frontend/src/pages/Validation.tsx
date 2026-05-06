import { useState, useEffect } from 'react';
import api from '../api/axiosConfig';
import { useAuth } from '../context/AuthContext';
import { CheckCircle, XCircle, FileText, Search, User, Calendar, Clock, Zap, AlertTriangle, Filter, Download } from 'lucide-react';
import './validation.css';

// ─── Badge d'urgence ─────────────────────────────────────────────────────────
type UrgenceLevel = 'urgent' | 'attention' | 'normal' | 'expiree';

function UrgenceBadge({ level, delai }: { level: UrgenceLevel; delai: number | null }) {
  if (level === 'urgent') {
    return (
      <span className="urgence-badge urgence-urgent">
        <Zap size={12} />
        Urgent {delai !== null ? `(J+${delai})` : ''}
      </span>
    );
  }
  if (level === 'attention') {
    return (
      <span className="urgence-badge urgence-attention">
        <AlertTriangle size={12} />
        Attention {delai !== null ? `(J+${delai})` : ''}
      </span>
    );
  }
  return (
    <span className="urgence-badge urgence-normal">
      <CheckCircle size={12} />
      Normal {delai !== null ? `(J+${delai})` : ''}
    </span>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────
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

  // Filtres urgence
  const [urgenceFilter, setUrgenceFilter] = useState<'' | 'urgent' | 'attention' | 'normal'>('');
  const [searchQuery, setSearchQuery] = useState('');

  const isRH = user?.role === 'responsable_rh' || user?.role === 'directeur_rh';
  const isManager = user?.role === 'responsable_hierarchique';

  const fetchDemandes = () => {
    setLoading(true);
    const params = urgenceFilter ? `?urgence=${urgenceFilter}` : '';
    api.get(`/demandes/a_valider/${params}`)
      .then(res => {
        const list = Array.isArray(res.data) ? res.data : (res.data?.results ?? []);
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
  }, [user, urgenceFilter]);

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
      fetchDemandes();
      fetchHistorique();
      setSelectedDemande(null);
    } catch (e: any) {
      alert(e.response?.data?.detail || "Une erreur est survenue lors de l'opération.");
    } finally {
      setProcessingId(null);
    }
  };

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
    } catch (error: any) {
      console.error("Erreur lors du téléchargement du PDF", error);
      alert("Erreur lors du téléchargement. Le PDF n'est peut-être pas encore généré.");
    }
  };

  // Filtre de recherche côté client
  const demandesFiltrees = demandes.filter(d => {
    if (!searchQuery) return true;
    return d.employe_noms?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Compteurs d'urgence
  const urgentCount = demandes.filter(d => d.urgence_badge === 'urgent').length;
  const attentionCount = demandes.filter(d => d.urgence_badge === 'attention').length;

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

        {/* Compteurs résumés urgence */}
        {(urgentCount > 0 || attentionCount > 0) && (
          <div className="urgence-summary">
            {urgentCount > 0 && (
              <div className="urgence-stat urgence-stat-urgent">
                <Zap size={16} />
                <span>{urgentCount} urgent{urgentCount > 1 ? 's' : ''}</span>
              </div>
            )}
            {attentionCount > 0 && (
              <div className="urgence-stat urgence-stat-attention">
                <AlertTriangle size={16} />
                <span>{attentionCount} à surveiller</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="card-minimal card-no-padding">
        <div className="table-toolbar-light">
          <div className="toolbar-left">
            {/* Barre de recherche */}
            <div className="search-bar-white">
              <Search size={18} color="var(--text-muted)" />
              <input
                type="text"
                placeholder="Rechercher un employé..."
                className="search-input"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Filtre urgence */}
            <div className="urgence-filter-wrap">
              <Filter size={16} color="var(--text-muted)" />
              <select
                className="filter-select urgence-filter-select"
                value={urgenceFilter}
                onChange={e => setUrgenceFilter(e.target.value as any)}
              >
                <option value="">Toutes les urgences</option>
                <option value="urgent">🔴 Urgent (&lt; 7 jours)</option>
                <option value="attention">🟡 Attention (7-15 jours)</option>
                <option value="normal">🟢 Normal (&gt; 15 jours)</option>
              </select>
            </div>
          </div>

          <div className="badge-count">
            {demandesFiltrees.length} demande(s) en attente
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
                <th className="th-cell">URGENCE</th>
                <th className="th-cell-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="td-loading">Recherche des demandes...</td></tr>
              ) : demandesFiltrees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="td-cell" style={{ textAlign: 'center', padding: '80px', color: 'var(--text-muted)' }}>
                    <div className="empty-state">
                      <div className="empty-icon-wrap">
                        <CheckCircle size={40} color="#94a3b8" />
                      </div>
                      <span className="empty-title">
                        {urgenceFilter ? `Aucune demande de niveau "${urgenceFilter}".` : 'Aucune demande en attente.'}
                      </span>
                      <span className="empty-sub">
                        {urgenceFilter ? 'Essayez un autre filtre d\'urgence.' : 'Vous êtes à jour dans vos validations !'}
                      </span>
                    </div>
                  </td>
                </tr>
              ) : demandesFiltrees.map(d => (
                <tr key={d.id} className={`table-row row-hover ${d.urgence_badge === 'urgent' ? 'row-urgent' : ''}`}>
                  <td className="td-cell">
                    <div className="employee-cell">
                      <div className={`avatar-placeholder avatar-${d.urgence_badge || 'normal'}`}>
                        <User size={20} color="var(--primary)" />
                      </div>
                      <div>
                        <div className="employee-name">{d.employe_noms}</div>
                        <div className="employee-date">Demandé le: {d.dateDemande}</div>
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
                  <td>
                    <UrgenceBadge level={d.urgence_badge || 'normal'} delai={d.delai_jours} />
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

      {/* ─── Historique ─── */}
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
              <option value="en_attente_rh">En attente RH</option>
              <option value="expiree">Expirées</option>
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
                <th className="th-cell-right">ACTIONS</th>
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
                  .filter(d => {
                    if (historiqueFilter === 'Tous') return true;
                    return d.statut === historiqueFilter;
                  })
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
                          <div className="employee-date" style={{ marginLeft: '10px' }}>{d.dateDemande}</div>
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── MODAL DE DÉTAILS ─── */}
      {selectedDemande && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <h2 className="modal-title">Détails de la demande</h2>
                <UrgenceBadge level={selectedDemande.urgence_badge || 'normal'} delai={selectedDemande.delai_jours} />
              </div>
              <button onClick={() => setSelectedDemande(null)} className="modal-close-btn">
                <XCircle size={24} color="var(--text-muted)" />
              </button>
            </div>

            {/* Alerte urgence dans le modal si urgent */}
            {selectedDemande.urgence_badge === 'urgent' && (
              <div className="modal-urgence-alert">
                <Zap size={16} />
                <span>
                  Cette demande débute dans <strong>{selectedDemande.delai_jours} jour(s)</strong> — Traitement prioritaire recommandé.
                </span>
              </div>
            )}

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
                <div>
                  <div className="detail-label">Délai de préavis</div>
                  <div className="detail-value">{selectedDemande.delai_jours !== null ? `${selectedDemande.delai_jours} jour(s)` : 'N/A'}</div>
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
