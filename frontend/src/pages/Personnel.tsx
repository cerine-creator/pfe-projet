import { useState, useEffect, useCallback } from 'react';
import api from '../api/axiosConfig';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  Search,
  X,
} from 'lucide-react';
import './dashboard-drh.css';

export default function Personnel() {
  const { user } = useAuth();
  const [employes, setEmployes] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployeDetail, setSelectedEmployeDetail] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const res = await api.get('/employes/');
      const empData = res.data;
      setEmployes(Array.isArray(empData) ? empData : (empData.results ?? []));
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Erreur inconnue';
      setError(`Erreur lors du chargement des employés: ${msg}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredEmployes = employes.filter(emp => {
    const fullName = `${emp.prenomEmpl || ''} ${emp.nomEmpl || ''}`.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase()) ||
      (emp.matricule && emp.matricule.toLowerCase().includes(searchTerm.toLowerCase()));
  });

  if (loading) {
    return (
      <div className="dashboard-drh">
        <div className="page-header">
          <div className="skeleton-block" style={{ width: '300px', height: '35px', marginBottom: '10px' }} ></div>
          <div className="skeleton-block" style={{ width: '400px', height: '15px' }} ></div>
        </div>
        <div style={{ marginTop: '40px' }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="stat-card" style={{ padding: '25px', display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '15px' }}>
              <div className="skeleton-avatar" style={{ width: '50px', height: '50px', borderRadius: '50%', flexShrink: 0 }}></div>
              <div style={{ flex: 1 }}>
                <div className="skeleton-block" style={{ width: '120px', height: '20px', marginBottom: '8px' }}></div>
                <div className="skeleton-block" style={{ width: '80px', height: '12px' }}></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-drh">
        <div className="error-state">
          <h2>Erreur de chargement</h2>
          <p>{error}</p>
          <button onClick={fetchData} className="btn-primary">Réessayer</button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-drh">
      <div className="page-header">
        <h1 className="page-title-lg">
          Annuaire du <span className="text-primary">Personnel</span>
        </h1>
        <p className="page-subtitle">Consultez et recherchez l'ensemble des fiches employés et leurs soldes de congés.</p>
      </div>

      <div className="dashboard-content" style={{ marginTop: '20px' }}>
        {/* ─── LISTE & RECHERCHE DES EMPLOYÉS ─── */}
        <div className="employes-section-card" style={{ gridColumn: '1 / -1' }}>
          <div className="section-header-row">
            <div className="section-title-wrap">
              <Users size={22} className="text-primary" />
              <h2 className="section-title">Liste des Employés Enregistrés</h2>
            </div>
            <div className="search-box-wrap">
              <Search size={18} className="search-icon-inside" />
              <input
                type="text"
                placeholder="Rechercher par nom ou matricule..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input-field"
              />
              {searchTerm && (
                <button className="clear-search-btn" onClick={() => setSearchTerm('')}>
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          <div className="table-responsive-wrapper">
            <table className="employes-data-table">
              <thead>
                <tr>
                  <th>MATRICULE</th>
                  <th>EMPLOYÉ</th>
                  <th>STRUCTURE</th>
                  <th>FONCTION</th>
                  <th>CONTACTS</th>
                  <th style={{ textAlign: 'center' }}>SOLDE CONGÉ</th>
                  <th style={{ textAlign: 'center' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployes.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="td-empty-employees">
                      Aucun employé ne correspond à votre recherche.
                    </td>
                  </tr>
                ) : (
                  filteredEmployes.map((emp) => {
                    return (
                      <tr key={emp.id} className="employe-row-item">
                        <td className="emp-matricule-cell">
                          <span className="badge-matricule">{emp.matricule || 'N/A'}</span>
                        </td>
                        <td>
                          <div className="emp-avatar-info">
                            <div>
                              <div className="emp-fullname">{emp.prenomEmpl} {emp.nomEmpl}</div>
                              <div className="emp-role-badge">{emp.role === 'directeur_rh' ? 'DRH' : emp.role === 'responsable_rh' ? 'RH' : emp.role === 'responsable_hierarchique' ? 'Manager' : 'Employé'}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="emp-structure-text">{emp.structure_libelle || 'Non assigné'}</span>
                        </td>
                        <td>
                          <span className="emp-fonction-text">{emp.fonction_libelle || 'Non spécifiée'}</span>
                        </td>
                        <td>
                          <div className="emp-contact-details">
                            <span className="emp-email">{emp.email || 'N/A'}</span>
                            <span className="emp-phone">{emp.numTel || 'N/A'}</span>
                          </div>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={`emp-solde-badge ${emp.solde_affichage > 10 ? 'solde-green' : 'solde-orange'}`}>
                            {emp.solde_affichage} j
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            className="btn-view-profile"
                            onClick={() => setSelectedEmployeDetail(emp)}
                            title="Consulter la fiche complète"
                          >
                            Consulter
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ─── MODAL DETAIL EMPLOYÉ COMPLET ─── */}
      {selectedEmployeDetail && (
        <div className="modal-overlay" onClick={() => setSelectedEmployeDetail(null)}>
          <div className="modal-content employee-details-modal" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Fiche Employé — {selectedEmployeDetail.prenomEmpl} {selectedEmployeDetail.nomEmpl}</h2>
              <button onClick={() => setSelectedEmployeDetail(null)} className="modal-close-btn">
                <X size={22} />
              </button>
            </div>
            <div className="modal-body">
              <div className="profile-detail-header" style={{ paddingBottom: '1.25rem', marginBottom: '1.5rem' }}>
                <div className="profile-detail-meta">
                  <h3 style={{ margin: '0 0 6px 0', fontSize: '1.5rem', fontWeight: 800 }}>{selectedEmployeDetail.prenomEmpl} {selectedEmployeDetail.nomEmpl}</h3>
                  <span className="profile-role-tag">{selectedEmployeDetail.role === 'directeur_rh' ? 'Directeur des Ressources Humaines' : selectedEmployeDetail.role === 'responsable_rh' ? 'Responsable RH' : selectedEmployeDetail.role === 'responsable_hierarchique' ? 'Responsable Hiérarchique' : 'Employé'}</span>
                </div>
              </div>

              {/* ── Section 1 : Informations Professionnelles ── */}
              <div className="fiche-section-title">🏢 Informations Professionnelles</div>
              <div className="details-grid">
                <div className="detail-item-card">
                  <span className="detail-item-label">Matricule</span>
                  <span className="detail-item-val">{selectedEmployeDetail.matricule || 'N/A'}</span>
                </div>
                <div className="detail-item-card">
                  <span className="detail-item-label">Structure / Direction</span>
                  <span className="detail-item-val">{selectedEmployeDetail.structure_libelle || 'Non assigné'}</span>
                </div>
                <div className="detail-item-card">
                  <span className="detail-item-label">Fonction</span>
                  <span className="detail-item-val">{selectedEmployeDetail.fonction_libelle || 'Non spécifiée'}</span>
                </div>
                <div className="detail-item-card">
                  <span className="detail-item-label">Catégorie</span>
                  <span className="detail-item-val">{selectedEmployeDetail.categorie_display || 'N/A'}</span>
                </div>
                <div className="detail-item-card" style={{ gridColumn: '1 / -1' }}>
                  <span className="detail-item-label">Date de Recrutement</span>
                  <span className="detail-item-val">
                    {selectedEmployeDetail.dateRecrutement
                      ? new Date(selectedEmployeDetail.dateRecrutement).toLocaleDateString('fr-FR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })
                      : 'N/A'}
                  </span>
                </div>
              </div>

              {/* ── Section 2 : Informations Personnelles / Contacts ── */}
              <div className="fiche-section-title" style={{ marginTop: '1.5rem' }}>📞 Informations Personnelles / Contacts</div>
              <div className="details-grid">
                <div className="detail-item-card">
                  <span className="detail-item-label">Email professionnel</span>
                  <span className="detail-item-val">{selectedEmployeDetail.email || 'N/A'}</span>
                </div>
                <div className="detail-item-card">
                  <span className="detail-item-label">Téléphone</span>
                  <span className="detail-item-val">{selectedEmployeDetail.numTel || 'N/A'}</span>
                </div>
                <div className="detail-item-card solde-highlight" style={{ gridColumn: '1 / -1' }}>
                  <span className="detail-item-label">Solde Congés Restants</span>
                  <span className="detail-item-val font-large">{selectedEmployeDetail.solde_affichage} jours</span>
                </div>
              </div>
            </div>
            <div className="modal-actions" style={{ justifyContent: 'center', marginTop: '1.5rem' }}>
              <button
                className="btn-action btn-cancel"
                onClick={() => setSelectedEmployeDetail(null)}
                style={{
                  background: '#da0027',
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.65rem 2.5rem',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  transition: 'background 0.2s ease',
                  boxShadow: '0 4px 12px rgba(218, 0, 39, 0.2)'
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#be123c')}
                onMouseLeave={e => (e.currentTarget.style.background = '#da0027')}
              >
                Fermer la fiche
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
