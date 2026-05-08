import { useState, useEffect } from 'react';
import api from '../api/axiosConfig';
import { useAuth } from '../context/AuthContext';
import { CheckCircle, XCircle, FileText, Search, User, Calendar, Clock, Zap, AlertTriangle, Filter, Paperclip, ExternalLink } from 'lucide-react';
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
const BACKEND_URL = 'http://127.0.0.1:8000';

export default function Validation() {
  const { user } = useAuth();
  const [demandes, setDemandes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [selectedDemande, setSelectedDemande] = useState<any | null>(null);
  const [showRefusalInput, setShowRefusalInput] = useState(false);
  const [refusalReason, setRefusalReason] = useState("");

  // Filtres
  const [urgenceFilter, setUrgenceFilter] = useState<'' | 'urgent' | 'attention' | 'normal'>('');
  const [searchQuery, setSearchQuery] = useState('');

  const isRH = user?.role === 'responsable_rh' || user?.role === 'directeur_rh' || user?.is_superuser;
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

  useEffect(() => {
    fetchDemandes();
  }, [user, urgenceFilter]);

  const handleAction = async (id: number, action: 'approve' | 'reject') => {
    if (!user) return;
    setProcessingId(id);
    
    // Déterminer le rôle au moment de l'action pour éviter tout décalage d'état
    const userIsRH = user.role === 'responsable_rh' || user.role === 'directeur_rh' || user.is_superuser;

    try {
      let endpoint = '';
      let payload = {};

      if (action === 'approve') {
        endpoint = userIsRH ? `/demandes/${id}/approuver_rh/` : `/demandes/${id}/valider_responsable/`;
      } else {
        if (!refusalReason.trim()) {
          alert("Veuillez saisir un motif pour le refus.");
          setProcessingId(null);
          return;
        }
        endpoint = userIsRH ? `/demandes/${id}/refuser/` : `/demandes/${id}/refuser_responsable/`;
        payload = { raison: refusalReason };
      }

      await api.post(endpoint, payload);
      fetchDemandes();
      setSelectedDemande(null);
    } catch (e: any) {
      const msg = e.response?.data?.detail || e.response?.data?.error || "Une erreur est survenue.";
      alert(msg);
    } finally {
      setProcessingId(null);
    }
  };

  const demandesFiltrees = demandes.filter(d => {
    if (!searchQuery) return true;
    return d.employe_noms?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const urgentCount = demandes.filter(d => d.urgence_badge === 'urgent').length;
  const attentionCount = demandes.filter(d => d.urgence_badge === 'attention').length;

  return (
    <div className="validation-page">
      <div className="validation-header">
        <div>
          <h1 className="page-title">
            Demandes à <span className="text-primary">Traiter</span>
          </h1>
          <p className="page-subtitle">
            Gérez les nouvelles demandes de congé en attente de votre validation.
          </p>
        </div>

        {(urgentCount > 0 || attentionCount > 0) && (
          <div className="urgence-summary">
            {urgentCount > 0 && (
              <div className="urgence-stat urgence-stat-urgent">
                <Zap size={16} />
                <span>{urgentCount} urgent(s)</span>
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
                <tr><td colSpan={6} className="td-loading">Chargement...</td></tr>
              ) : demandesFiltrees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="td-cell" style={{ textAlign: 'center', padding: '80px', color: 'var(--text-muted)' }}>
                    Aucune demande à traiter pour le moment.
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
                  <td>{d.motif ? 'Exceptionnel' : d.type_conge_nom}</td>
                  <td>Du {d.date_debut} au {d.date_fin}</td>
                  <td>{d.duree} jours</td>
                  <td><UrgenceBadge level={d.urgence_badge || 'normal'} delai={d.delai_jours} /></td>
                  <td className="td-cell-right">
                    <button className="btn-primary" onClick={() => { setSelectedDemande(d); setShowRefusalInput(false); setRefusalReason(""); }}>
                      Consulter
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

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

            <div className="modal-detail-box">
              <div className="modal-detail-grid">
                <div><div className="detail-label">Employé</div><div className="detail-value">{selectedDemande.employe_noms}</div></div>
                <div><div className="detail-label">Période</div><div className="detail-value">Du {selectedDemande.date_debut} au {selectedDemande.date_fin}</div></div>
                <div><div className="detail-label">Type</div><div className="detail-value">{selectedDemande.motif ? 'Congé Exceptionnel' : selectedDemande.type_conge_nom}</div></div>
                <div><div className="detail-label">Durée</div><div className="detail-value">{selectedDemande.duree} jours</div></div>
                {/* Justificatif */}
                {selectedDemande.justificatif_url && (() => {
                  let url = selectedDemande.justificatif_url;
                  if (!url.startsWith('http')) {
                    url = `${BACKEND_URL}${url}`;
                  }
                  const isPdf = url.toLowerCase().includes('.pdf');
                  return (
                    <div style={{ gridColumn: '1 / -1', marginTop: '10px', paddingTop: '15px', borderTop: '1px solid #e2e8f0' }}>
                      <div className="detail-label" style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'10px' }}>
                        <Paperclip size={14} /> Justificatif joint
                      </div>
                      {isPdf ? (
                        <a href={url} target="_blank" rel="noreferrer" className="justificatif-link">
                          <FileText size={20} />
                          Ouvrir le document PDF
                          <ExternalLink size={14} />
                        </a>
                      ) : (
                        <a href={url} target="_blank" rel="noreferrer" style={{ display: 'block', width: 'fit-content' }}>
                          <img src={url} alt="Justificatif" className="justificatif-img" />
                        </a>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className="modal-actions">
              {showRefusalInput ? (
                <div className="refusal-panel">
                  <textarea rows={3} value={refusalReason} onChange={(e) => setRefusalReason(e.target.value)} placeholder="Motif du refus..." className="refusal-textarea" autoFocus />
                  <div className="refusal-buttons">
                    <button className="btn-action btn-cancel-refusal" onClick={() => setShowRefusalInput(false)}>Annuler</button>
                    <button className="btn-action btn-reject" onClick={() => handleAction(selectedDemande.id, 'reject')} disabled={processingId === selectedDemande.id || !refusalReason.trim()}>Confirmer</button>
                  </div>
                </div>
              ) : (
                <>
                  <button className="btn-action btn-reject" onClick={() => setShowRefusalInput(true)} disabled={processingId === selectedDemande.id}><XCircle size={18} /> Refuser</button>
                  <button className="btn-action btn-approve" onClick={() => handleAction(selectedDemande.id, 'approve')} disabled={processingId === selectedDemande.id}><CheckCircle size={18} /> Approuver</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
