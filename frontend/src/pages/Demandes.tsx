import { useState, useEffect } from 'react';
import api from '../api/axiosConfig';
import { FileText, Search, PlusCircle, Download, Eye, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './demandes.css';

const BACKEND_URL = 'http://127.0.0.1:8000';

export default function Demandes() {
  const navigate = useNavigate();
  const [demandes, setDemandes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Tous');
  const [durationSort, setDurationSort] = useState('Aucun');
  const [selectedDemande, setSelectedDemande] = useState<any | null>(null);

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
    // On exclut les approuvées car elles vont dans les archives
    if (d.statut === 'approuvee') return false;

    const matchSearch = (d.type_conge_nom || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.date_debut || '').includes(searchTerm);
    let matchStatus = true;
    if (statusFilter === 'refusee') matchStatus = d.statut === 'refusee';
    else if (statusFilter === 'en_attente') matchStatus = d.statut === 'en_attente_resp' || d.statut === 'en_attente_rh';

    return matchSearch && matchStatus;
  }).sort((a, b) => {
    if (durationSort === 'Croissant') return a.duree - b.duree;
    if (durationSort === 'Décroissant') return b.duree - a.duree;
    return 0;
  });

  const handleDownloadPDF = async (id: number) => {
    try {
      const response = await api.get(`demandes/${id}/exporter_pdf/`, {
        responseType: 'blob',
      });

      // Création d'un lien temporaire pour le téléchargement
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Titre_Conge_${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("Erreur lors du téléchargement du PDF", error);
      alert("Impossible de télécharger le PDF. Vérifiez votre connexion.");
    }
  };

  return (
    <div className="demandes-v2">
      <div className="demandes-header">
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1 className="page-title">Mes Congés <span className="text-primary">Actuels</span></h1>
          <p className="page-subtitle">Suivez l'état de vos demandes en attente ou refusées.</p>
        </div>
        <button
          className="btn-primary"
          onClick={() => navigate('/conges/nouvelle-demande')}
        >
          <PlusCircle size={20} /> Nouvelle demande
        </button>
      </div>

      <div className="card-minimal card-no-padding">
        <div className="table-toolbar-plain">
          <div className="search-bar">
            <Search size={18} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Rechercher par date ou type..."
              className="search-input"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="filter-group">
            <div className="filter-wrap">
              <FileText size={16} color="var(--text-muted)" />
              <select
                className="filter-select"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
              >
                <option value="Tous">Tous les statuts</option>
                <option value="approuvee">Approuvée</option>
                <option value="refusee">Refusée</option>
                <option value="en_attente">En attente</option>
              </select>
            </div>

            <div className="filter-wrap">
              <PlusCircle size={16} color="var(--text-muted)" style={{ transform: 'rotate(45deg)' }} />
              <select
                className="filter-select"
                value={durationSort}
                onChange={e => setDurationSort(e.target.value)}
              >
                <option value="Aucun">Trier par durée</option>
                <option value="Croissant">Durée croissante</option>
                <option value="Décroissant">Durée décroissante</option>
              </select>
            </div>
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
                      <span className="cell-label">{d.type_conge_nom}</span>
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
                      {d.statut === 'approuvee' && (
                        <button
                          className="btn-icon"
                          title="Télécharger le titre"
                          onClick={() => handleDownloadPDF(d.id)}
                        >
                          <Download size={18} />
                        </button>
                      )}
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
        <div className="modal-overlay" onClick={() => setSelectedDemande(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', width: '400px', maxWidth: '90%', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-color)' }}>Détails de la demande</h3>
              <button onClick={() => setSelectedDemande(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                <X size={20} color="var(--text-muted)" />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', color: 'var(--text-color)' }}>
              <p style={{ margin: 0 }}><strong>Type :</strong> {selectedDemande.type_conge_nom}</p>
              {selectedDemande.motif && <p style={{ margin: 0 }}><strong>Motif :</strong> {selectedDemande.motif_display || selectedDemande.motif}</p>}
              <p style={{ margin: 0 }}><strong>Du :</strong> {selectedDemande.date_debut}</p>
              <p style={{ margin: 0 }}><strong>Au :</strong> {selectedDemande.date_fin}</p>
              <p style={{ margin: 0 }}><strong>Durée :</strong> {selectedDemande.duree} jour(s)</p>
              <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <strong>Statut :</strong>
                <span className={`badge ${selectedDemande.statut === 'approuvee' ? 'badge-success' :
                    selectedDemande.statut === 'refusee' ? 'badge-danger' :
                      selectedDemande.statut === 'expiree' ? 'badge-expired' : 'badge-pending'
                  }`}>
                  {selectedDemande.statut_display}
                </span>
              </p>
              {selectedDemande.justificatif_url && (
                <p style={{ margin: 0, marginTop: '8px' }}>
                  <strong>Justificatif :</strong>{' '}
                  <a
                    href={`${BACKEND_URL}${selectedDemande.justificatif_url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'var(--primary)', textDecoration: 'underline', fontWeight: 500 }}
                  >
                    Voir le document joint
                  </a>
                </p>
              )}
            </div>

            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn-primary" onClick={() => setSelectedDemande(null)}>Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
