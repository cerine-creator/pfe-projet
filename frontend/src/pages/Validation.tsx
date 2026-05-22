import { useState, useEffect } from 'react';
import api from '../api/axiosConfig';
import { useAuth } from '../context/AuthContext';
import {
  CheckCircle, XCircle, FileText, Search, User,
  Zap, AlertTriangle, Filter, Paperclip, ExternalLink,
  Info, ArrowRight, Users
} from 'lucide-react';
import CustomSelect from '../components/CustomSelect';
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
  const [allApprovedDemandes, setAllApprovedDemandes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [selectedDemande, setSelectedDemande] = useState<any | null>(null);
  const [showRefusalInput, setShowRefusalInput] = useState(false);
  const [refusalReason, setRefusalReason] = useState("");
  const [activeTab, setActiveTab] = useState<'employes' | 'rh'>('employes');

  // Filtres
  const [urgenceFilter, setUrgenceFilter] = useState<'' | 'urgent' | 'attention' | 'normal'>('');
  const [searchQuery, setSearchQuery] = useState('');

  const isRH = user?.role === 'responsable_rh' || user?.role === 'directeur_rh' || user?.is_superuser;
  const isDRH = user?.role === 'directeur_rh' || user?.is_superuser;
  const isManager = user?.role === 'responsable_hierarchique';

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = urgenceFilter ? `?urgence=${urgenceFilter}` : '';

      // 1. Charger les demandes à valider
      const resValider = await api.get(`/demandes/a_valider/${params}`);
      const list = Array.isArray(resValider.data) ? resValider.data : (resValider.data?.results ?? []);
      const filteredList = list.filter((d: any) => {
        if (isManager) return d.statut === 'en_attente_resp';
        if (isRH) return d.statut === 'en_attente_rh';
        return false;
      });
      setDemandes(filteredList);

      // 2. Charger toutes les absences déjà validées pour détecter les conflits (Aide à la décision)
      const resApproved = await api.get('/demandes/historique/');
      const approvedList = Array.isArray(resApproved.data) ? resApproved.data : (resApproved.data?.results ?? []);
      setAllApprovedDemandes(approvedList.filter((d: any) => d.statut === 'approuvee'));

    } catch (e) {
      console.error("Erreur chargement données validation:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user, urgenceFilter]);

  const handleAction = async (id: number, action: 'approve' | 'reject') => {
    if (!user) return;
    setProcessingId(id);

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
      fetchData();
      setSelectedDemande(null);
    } catch (e: any) {
      const msg = e.response?.data?.detail || e.response?.data?.error || "Une erreur est survenue.";
      alert(msg);
    } finally {
      setProcessingId(null);
    }
  };

  // ─── Logique d'aide à la décision ───────────────────────────────────────────

  // 1. Détection de conflits (chevauchements)
  const getConflicts = (demande: any) => {
    if (!demande) return [];
    const debut = new Date(demande.date_debut);
    const fin = new Date(demande.date_fin);

    return allApprovedDemandes.filter(other => {
      // On ne compare pas avec soi-même et on reste dans la même structure
      if (other.id === demande.id) return false;
      if (other.structure !== demande.structure) return false;

      const otherDebut = new Date(other.date_debut);
      const otherFin = new Date(other.date_fin);

      // Vérification du chevauchement de dates
      const overlap = (debut <= otherFin && fin >= otherDebut);
      return overlap;
    });
  };

  const conflicts = selectedDemande ? getConflicts(selectedDemande) : [];

  const demandesFiltrees = demandes.filter(d => {
    if (searchQuery && !d.employe_noms?.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (isDRH) {
      if (activeTab === 'rh') {
        return d.employe_role === 'responsable_rh';
      } else {
        return d.employe_role !== 'responsable_rh';
      }
    }
    return true;
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
              <CustomSelect
                className="filter-select urgence-filter-select"
                value={urgenceFilter}
                onChange={(val) => setUrgenceFilter(val as any)}
                placeholder="Toutes les urgences"
                options={[
                  { value: 'urgent', label: '🔴 Urgent (< 7 jours)' },
                  { value: 'attention', label: '🟡 Attention (7-15 jours)' },
                  { value: 'normal', label: '🟢 Normal (> 15 jours)' }
                ]}
              />
            </div>
          </div>

          <div className="badge-count">
            {demandesFiltrees.length} demande(s) en attente
          </div>
        </div>

        {isDRH && (
          <div className="drh-tabs">
            <button
              className={`drh-tab ${activeTab === 'employes' ? 'active' : ''}`}
              onClick={() => setActiveTab('employes')}
            >
              <Users size={16} /> Demandes des Employés
            </button>
            <button
              className={`drh-tab ${activeTab === 'rh' ? 'active' : ''}`}
              onClick={() => setActiveTab('rh')}
            >
              <User size={16} /> Demandes des Responsables RH
            </button>
          </div>
        )}

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
                <>
                  {[...Array(4)].map((_, i) => (
                    <tr key={`skel-${i}`} className="table-row skeleton-row">
                      <td className="td-cell">
                        <div className="employee-cell">
                          <div className="skeleton-avatar"></div>
                          <div>
                            <div className="skeleton-block" style={{ width: '120px', marginBottom: '8px' }}></div>
                            <div className="skeleton-block" style={{ width: '80px', height: '12px' }}></div>
                          </div>
                        </div>
                      </td>
                      <td><div className="skeleton-block" style={{ width: '100px' }}></div></td>
                      <td><div className="skeleton-block" style={{ width: '150px' }}></div></td>
                      <td><div className="skeleton-block" style={{ width: '60px' }}></div></td>
                      <td><div className="skeleton-block" style={{ width: '90px', borderRadius: '20px' }}></div></td>
                      <td className="td-cell-right">
                        <div className="skeleton-block" style={{ width: '100px', height: '36px', borderRadius: '8px', marginLeft: 'auto' }}></div>
                      </td>
                    </tr>
                  ))}
                </>
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

          {/* Version mobile adaptative pour l'iPhone XR / petits écrans */}
          <div className="mobile-validation-list">
            {loading ? (
              [...Array(3)].map((_, i) => (
                <div key={`skel-card-v-${i}`} className="validation-card skeleton-card">
                  <div className="card-header-row">
                    <div className="card-employee-info">
                      <div className="skeleton-avatar" style={{ width: '40px', height: '40px', borderRadius: '12px' }}></div>
                      <div>
                        <div className="skeleton-block" style={{ width: '120px', height: '16px', marginBottom: '6px' }}></div>
                        <div className="skeleton-block" style={{ width: '80px', height: '12px' }}></div>
                      </div>
                    </div>
                    <div className="skeleton-block" style={{ width: '70px', height: '24px', borderRadius: '20px' }}></div>
                  </div>
                  <div className="card-details-row">
                    <div className="card-period-info">
                      <div className="skeleton-block" style={{ width: '50px', height: '12px', marginBottom: '6px' }}></div>
                      <div className="skeleton-block" style={{ width: '140px', height: '14px' }}></div>
                    </div>
                    <div className="card-duration-info">
                      <div className="skeleton-block" style={{ width: '40px', height: '12px', marginBottom: '6px' }}></div>
                      <div className="skeleton-block" style={{ width: '30px', height: '18px' }}></div>
                    </div>
                  </div>
                  <div className="card-actions-row">
                    <div className="skeleton-block" style={{ width: '100%', height: '36px', borderRadius: '8px' }}></div>
                  </div>
                </div>
              ))
            ) : demandesFiltrees.length === 0 ? (
              <div className="td-empty" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                Aucune demande à traiter pour le moment.
              </div>
            ) : (
              demandesFiltrees.map(d => (
                <div 
                  key={d.id} 
                  className={`validation-card ${d.urgence_badge === 'urgent' ? 'card-urgent' : ''}`}
                  onClick={() => { setSelectedDemande(d); setShowRefusalInput(false); setRefusalReason(""); }}
                >
                  <div className="card-header-row">
                    <div className="card-employee-info">
                      <div className={`avatar-placeholder avatar-${d.urgence_badge || 'normal'}`}>
                        <User size={20} color="var(--primary)" />
                      </div>
                      <div>
                        <div className="card-employee-name">{d.employe_noms}</div>
                        <div className="card-type-label">{d.motif ? 'Exceptionnel' : d.type_conge_nom}</div>
                      </div>
                    </div>
                    <UrgenceBadge level={d.urgence_badge || 'normal'} delai={d.delai_jours} />
                  </div>
                  
                  <div className="card-details-row">
                    <div className="card-period-info">
                      <span className="period-label">Période</span>
                      <span className="period-dates">
                        Du <span className="highlight">{d.date_debut}</span> au <span className="highlight">{d.date_fin}</span>
                      </span>
                    </div>
                    <div className="card-duration-info">
                      <span className="duration-label">Durée</span>
                      <span className="duration-val">{d.duree} <span>j</span></span>
                    </div>
                  </div>
                  
                  <div className="card-actions-row" style={{ flexDirection: 'column', gap: '8px', alignItems: 'stretch' }}>
                    <div className="employee-date" style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      Demandé le: {d.dateDemande}
                    </div>
                    <button 
                      className="btn-primary" 
                      style={{ width: '100%', justifyContent: 'center' }}
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        setSelectedDemande(d); 
                        setShowRefusalInput(false); 
                        setRefusalReason(""); 
                      }}
                    >
                      Consulter
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {selectedDemande && (
        <div className="modal-overlay">
          <div className="modal-content leave-details-modal">
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
                      <div className="detail-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
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

            {/* ─── PANNEAU D'AIDE À LA DÉCISION (DSS) ─── */}
            <div className="decision-support-panel">
              <div className="dss-section-title">
                <Info size={14} /> Aide à la décision
              </div>

              {/* 1. Simulateur de solde */}
              <div className="balance-simulator">
                <div className="sim-item">
                  <div className="sim-label">Solde Actuel</div>
                  <div className="sim-value">{(selectedDemande.employe_solde || 0).toFixed(1)}j</div>
                </div>
                <div className="sim-arrow"><ArrowRight size={20} /></div>
                <div className="sim-item">
                  <div className="sim-label">Congé</div>
                  <div className="sim-value text-accent">-{selectedDemande.duree}j</div>
                </div>
                <div className="sim-arrow"><ArrowRight size={20} /></div>
                <div className="sim-item">
                  <div className="sim-label">Solde après</div>
                  <div className={`sim-value sim-result ${((selectedDemande.employe_solde || 0) - selectedDemande.duree) < 0 ? 'text-danger' : 'text-success'}`}>
                    {((selectedDemande.employe_solde || 0) - selectedDemande.duree).toFixed(1)}j
                  </div>
                </div>
              </div>

              {/* 2. Alerte de conflits */}
              {conflicts.length > 0 ? (
                <div className="conflict-alert">
                  <AlertTriangle className="conflict-icon" size={20} />
                  <div className="conflict-content">
                    <h4>Conflit de planning détecté</h4>
                    <p>
                      {conflicts.length} autre(s) employé(s) sont déjà en congé durant cette période :
                      <strong> {conflicts.map(c => c.employe_noms).join(', ')}</strong>.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="presence-card">
                  <div className="presence-gauge">100%</div>
                  <div className="presence-info">
                    <h4>Aucun conflit détecté</h4>
                    <p>Toute l'équipe est présente sur cette période.</p>
                  </div>
                </div>
              )}
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
