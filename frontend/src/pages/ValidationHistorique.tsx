import { useState, useEffect } from 'react';
import api from '../api/axiosConfig';
import { User, History, Download, Filter, Eye, Search } from 'lucide-react';
import CustomSelect from '../components/CustomSelect';
import { useAuth } from '../context/AuthContext';
import DemandeDetailModal from '../components/DemandeDetailModal';
import './validation.css';

export default function ValidationHistorique() {
  const [historiqueDemandes, setHistoriqueDemandes] = useState<any[]>([]);
  const [historiqueFilter, setHistoriqueFilter] = useState('Tous');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateSort, setDateSort] = useState('Aucun');
  const [loading, setLoading] = useState(true);
  const [selectedDemande, setSelectedDemande] = useState<any | null>(null);
  const { user } = useAuth();

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
      const response = await api.get(`/demandes/${id}/exporter_pdf/`, {
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
    let matchStatus = true;
    if (historiqueFilter !== 'Tous') {
      matchStatus = d.statut === historiqueFilter;
    }

    const searchLower = searchTerm.toLowerCase();
    const matchSearch = (d.employe_noms || '').toLowerCase().includes(searchLower) ||
                        (d.type_conge_nom || '').toLowerCase().includes(searchLower) ||
                        (d.date_debut || '').includes(searchTerm);

    return matchStatus && matchSearch;
  }).sort((a, b) => {
    if (dateSort === 'Plus récent') return new Date(b.dateDemande).getTime() - new Date(a.dateDemande).getTime();
    if (dateSort === 'Plus ancien') return new Date(a.dateDemande).getTime() - new Date(b.dateDemande).getTime();
    return 0;
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

            {/* Version mobile skeleton adaptative */}
            <div className="mobile-validation-list">
              {[...Array(3)].map((_, i) => (
                <div key={`skel-card-vh-${i}`} className="validation-card skeleton-card">
                  <div className="card-header-row">
                    <div className="card-employee-info">
                      <div className="skeleton-avatar" style={{ width: '40px', height: '40px', borderRadius: '12px' }}></div>
                      <div>
                        <div className="skeleton-block" style={{ width: '100px', height: '16px', marginBottom: '6px' }}></div>
                        <div className="skeleton-block" style={{ width: '60px', height: '12px' }}></div>
                      </div>
                    </div>
                    <div className="skeleton-block" style={{ width: '70px', height: '24px', borderRadius: '20px' }}></div>
                  </div>
                  <div className="card-details-row">
                    <div className="card-period-info">
                      <div className="skeleton-block" style={{ width: '50px', height: '12px', marginBottom: '6px' }}></div>
                      <div className="skeleton-block" style={{ width: '140px', height: '14px' }}></div>
                    </div>
                  </div>
                  <div className="card-actions-row">
                    <div className="skeleton-block" style={{ width: '120px', height: '32px', borderRadius: '8px' }}></div>
                  </div>
                </div>
              ))}
            </div>
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
          <div className="toolbar-left">
            <div className="search-bar-white">
              <Search size={18} color="var(--text-muted)" />
              <input
                type="text"
                placeholder="Rechercher par employé ou date..."
                className="search-input"
                style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%', color: 'inherit' }}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="urgence-filter-wrap">
              <Filter size={18} color="var(--text-muted)" />
              <CustomSelect
                className="filter-select urgence-filter-select"
                value={historiqueFilter}
                onChange={(val) => setHistoriqueFilter(val)}
                placeholder="Tous les statuts"
                options={[
                  { value: 'Tous', label: 'Tous les statuts' },
                  { value: 'approuvee', label: 'Approuvées' },
                  { value: 'refusee', label: 'Refusées' },
                  { value: 'en_attente_rh', label: 'En attente RH (Validation Responsable faite)' },
                  { value: 'expiree', label: 'Expirées' }
                ]}
              />
            </div>

            <div className="urgence-filter-wrap">
              <History size={18} color="var(--text-muted)" />
              <CustomSelect
                className="filter-select urgence-filter-select"
                value={dateSort}
                onChange={(val) => setDateSort(val)}
                placeholder="Trier par date"
                options={[
                  { value: 'Aucun', label: 'Trier par date' },
                  { value: 'Plus récent', label: 'Plus récent' },
                  { value: 'Plus ancien', label: 'Plus ancien' }
                ]}
              />
            </div>
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
                          <div className="employee-date">{d.motif ? 'Congé Exceptionnel' : (d.type_conge_nom || 'Congé')}</div>
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
                        {d.statut === 'approuvee' && (user?.role === 'responsable_rh' || user?.role === 'directeur_rh') && (
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

          {/* Version mobile adaptative pour l'iPhone XR / petits écrans */}
          <div className="mobile-validation-list">
            {filteredHistory.length === 0 ? (
              <div className="td-empty" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                Aucun historique correspondant.
              </div>
            ) : (
              filteredHistory.map(d => (
                <div key={d.id} className="validation-card" onClick={() => setSelectedDemande(d)}>
                  <div className="card-header-row">
                    <div className="card-employee-info">
                      <div className="avatar-placeholder">
                        <User size={20} color="var(--primary)" />
                      </div>
                      <div>
                        <div className="card-employee-name">{d.employe_noms}</div>
                        <div className="card-type-label">{d.motif ? 'Congé Exceptionnel' : (d.type_conge_nom || 'Congé')}</div>
                      </div>
                    </div>
                    <span className={`badge ${
                      d.statut === 'approuvee' ? 'badge-success' :
                      d.statut === 'refusee' ? 'badge-danger' :
                      d.statut === 'expiree' ? 'badge-expired' : 'badge-pending'
                    }`}>
                      {d.statut_display}
                    </span>
                  </div>
                  
                  <div className="card-details-row">
                    <div className="card-period-info">
                      <span className="period-label">Période</span>
                      <span className="period-dates">
                        Du <span className="highlight">{d.date_debut}</span> au <span className="highlight">{d.date_fin}</span>
                      </span>
                    </div>
                  </div>
                  
                  <div className="card-actions-row">
                    <div className="employee-date" style={{ marginRight: 'auto', alignSelf: 'center', fontSize: '0.78rem' }}>
                      Demandé le: {d.dateDemande}
                    </div>
                    <div className="action-buttons-wrap">
                      {d.statut === 'approuvee' && (user?.role === 'responsable_rh' || user?.role === 'directeur_rh') && (
                        <button 
                          className="btn-icon" 
                          title="Télécharger le titre"
                          onClick={(e) => { e.stopPropagation(); handleDownloadPDF(d.id); }}
                          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Download size={16} />
                        </button>
                      )}
                      <button 
                        className="btn-card-action" 
                        onClick={(e) => { e.stopPropagation(); setSelectedDemande(d); }}
                      >
                        <Eye size={16} /> Détails
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {selectedDemande && (
        <DemandeDetailModal
          demande={selectedDemande}
          onClose={() => setSelectedDemande(null)}
          showEmployee={true}
          canDownloadPDF={user?.role === 'responsable_rh' || user?.role === 'directeur_rh'}
          onDownloadPDF={handleDownloadPDF}
        />
      )}
    </div>
  );
}
