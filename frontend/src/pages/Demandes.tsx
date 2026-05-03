import { useState, useEffect } from 'react';
import api from '../api/axiosConfig';
import { FileText, Search, PlusCircle, Download, Eye, X, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './demandes.css';

export default function Demandes() {
  const navigate = useNavigate();
  const [demandes, setDemandes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Tous');
  const [durationSort, setDurationSort] = useState('Aucun');
  const [selectedDemande, setSelectedDemande] = useState<any | null>(null);
  const [justificatifLoading, setJustificatifLoading] = useState(false);

  const downloadTitre = async (downloadUrl: string, fallbackFilename: string) => {
    try {
      const response = await api.get(downloadUrl, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: response.headers['content-type'] || 'application/pdf' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.href = url;
      const disposition = response.headers['content-disposition'] || '';
      const match = disposition.match(/filename="?([^";]+)"?/);
      const filename = match ? match[1] : fallbackFilename;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erreur téléchargement titre :', error);
      alert('Impossible de télécharger le titre de congé.');
    }
  };

  // ✅ On télécharge le justificatif au lieu de l'afficher pour éviter la "page blanche"
  const downloadJustificatif = async (url: string) => {
    setJustificatifLoading(true);
    try {
      const response = await api.get(url, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: response.headers['content-type'] || 'application/octet-stream' });
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      
      const extension = response.headers['content-type']?.split('/')[1] || 'bin';
      link.download = `justificatif_conge.${extension}`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);
    } catch (e) {
      alert("Erreur lors du téléchargement du justificatif.");
    } finally {
      setJustificatifLoading(false);
    }
  };
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

  const filteredDemandes = demandes.filter(d => {
    const matchSearch = (d.type_conge_nom || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (d.date_debut || '').includes(searchTerm);
    let matchStatus = true;
    if (statusFilter === 'approuvee') matchStatus = d.statut === 'approuvee';
    else if (statusFilter === 'refusee') matchStatus = d.statut === 'refusee';
    else if (statusFilter === 'en_attente') matchStatus = d.statut === 'en_attente_resp' || d.statut === 'en_attente_rh';
    
    return matchSearch && matchStatus;
  }).sort((a, b) => {
    if (durationSort === 'Croissant') return a.duree - b.duree;
    if (durationSort === 'Décroissant') return b.duree - a.duree;
    return 0;
  });

  return (
    <div className="demandes-v2">
      <div className="demandes-header">
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1 className="page-title">Archives des <span className="text-primary">Congés</span></h1>
          <p className="page-subtitle">Consultez et exportez l'historique de vos absences.</p>
        </div>
        <button 
          className="btn-primary" 
          onClick={() => navigate('/conges/nouvelle-demande')}
        >
          <PlusCircle size={20} /> Nouvelle demande
        </button>
      </div>

      <div className="card-minimal card-no-padding">
        <div className="table-toolbar-plain" style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
           <div className="search-bar" style={{ flex: 1, minWidth: '200px' }}>
              <Search size={18} color="var(--text-muted)" />
              <input 
                type="text" 
                placeholder="Rechercher par date ou type..." 
                className="search-input"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
           </div>
           <select 
             className="filter-select"
             value={statusFilter}
             onChange={e => setStatusFilter(e.target.value)}
             style={{ padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', outline: 'none', backgroundColor: 'white' }}
           >
             <option value="Tous">Tous les statuts</option>
             <option value="approuvee">Approuvée</option>
             <option value="refusee">Refusée</option>
             <option value="en_attente">En attente</option>
           </select>
           <select 
             className="filter-select"
             value={durationSort}
             onChange={e => setDurationSort(e.target.value)}
             style={{ padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', outline: 'none', backgroundColor: 'white' }}
           >
             <option value="Aucun">Trier par durée</option>
             <option value="Croissant">Durée croissante</option>
             <option value="Décroissant">Durée décroissante</option>
           </select>
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
                          <button
                            className="btn-icon"
                            title={d.titre_download_url || `Télécharger le titre`}
                            onClick={() => {
                              const downloadUrl = d.titre_download_url || `/demandes/${d.id}/download_titre/`;
                              downloadTitre(downloadUrl, `titre-conge-${d.id}.pdf`);
                            }}
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
                <span className={`badge ${
                  selectedDemande.statut === 'approuvee' ? 'badge-success' : 
                  selectedDemande.statut === 'refusee' ? 'badge-danger' : 'badge-pending'
                }`}>
                  {selectedDemande.statut_display}
                </span>
              </p>
              {selectedDemande.justificatif_url && (
                <p style={{ margin: 0, marginTop: '8px' }}>
                  <strong>Justificatif :</strong>{' '}
                  <button 
                    onClick={() => downloadJustificatif(selectedDemande.justificatif_url)}
                    disabled={justificatifLoading}
                    style={{ 
                      background: 'none', border: 'none', padding: 0,
                      color: 'var(--primary)', textDecoration: 'underline', 
                      fontWeight: 500, cursor: 'pointer' 
                    }}
                  >
                    {justificatifLoading ? 'Téléchargement...' : 'Télécharger le justificatif'}
                  </button>
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
