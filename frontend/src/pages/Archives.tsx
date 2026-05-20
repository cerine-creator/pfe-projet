import { useState, useEffect } from 'react';
import api from '../api/axiosConfig';
import { FileText, Calendar, History, Eye } from 'lucide-react';
import DemandeDetailModal from '../components/DemandeDetailModal';
import './demandes.css'; // On réutilise le CSS existant

export default function Archives() {
  const [archives, setArchives] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDemande, setSelectedDemande] = useState<any | null>(null);

  useEffect(() => {
    // On récupère toutes les demandes pour filtrer les finalisées (approuvées, refusées, expirées) dans l'historique de l'employé
    api.get('/demandes/')
      .then(res => {
        const list = Array.isArray(res.data) ? res.data : (res.data?.results ?? []);
        const finalized = list.filter((d: any) => d.statut === 'approuvee' || d.statut === 'refusee' || d.statut === 'expiree');
        setArchives(finalized);
      })
      .catch(e => console.error(e))
      .finally(() => setLoading(false));
  }, []);



  // Groupement des demandes par Exercice
  const groupedArchives = archives.reduce((groups: any, d: any) => {
    const ex = d.exercice_libelle || "Inconnu";
    if (!groups[ex]) groups[ex] = [];
    groups[ex].push(d);
    return groups;
  }, {});

  const exSorted = Object.keys(groupedArchives).sort().reverse();

  if (loading) {
    return (
      <div className="demandes-v2">
        <div className="demandes-header">
          <div className="page-header" style={{ marginBottom: 0 }}>
            <h1 className="page-title">Archives des <span className="text-primary">Congés</span></h1>
            <p className="page-subtitle">Retrouvez ici l'historique de vos demandes et vos titres de congés officiels classés par exercice.</p>
          </div>
          <div className="icon-box-large">
             <History size={32} color="var(--primary)" />
          </div>
        </div>
        <div className="card-minimal card-no-padding" style={{ marginTop: '30px' }}>
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
                  {[...Array(3)].map((_, i) => (
                    <tr key={`skel-arch-${i}`} className="table-row skeleton-row">
                      <td className="td-cell">
                        <div className="cell-icon-label">
                           <div className="skeleton-avatar" style={{ width: '30px', height: '30px', borderRadius: '8px' }}></div>
                           <div className="skeleton-block" style={{ width: '120px' }}></div>
                        </div>
                      </td>
                      <td><div className="skeleton-block" style={{ width: '180px' }}></div></td>
                      <td><div className="skeleton-block" style={{ width: '50px' }}></div></td>
                      <td><div className="skeleton-block" style={{ width: '80px', borderRadius: '20px' }}></div></td>
                      <td className="td-cell-right"><div className="skeleton-block" style={{ width: '35px', height: '35px', borderRadius: '8px', marginLeft: 'auto' }}></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Version mobile skeleton adaptative */}
              <div className="mobile-demandes-list">
                {[...Array(3)].map((_, i) => (
                  <div key={`skel-card-arch-${i}`} className="demande-card skeleton-card">
                    <div className="card-header-row">
                      <div className="card-type-info">
                        <div className="skeleton-avatar" style={{ width: '35px', height: '35px', borderRadius: '8px' }}></div>
                        <div className="skeleton-block" style={{ width: '100px', height: '16px' }}></div>
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
    <div className="demandes-v2">
      <div className="demandes-header">
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1 className="page-title">Archives des <span className="text-primary">Congés</span></h1>
          <p className="page-subtitle">Retrouvez ici l'historique de vos demandes et vos titres de congés officiels classés par exercice.</p>
        </div>
        <div className="icon-box-large">
           <History size={32} color="var(--primary)" />
        </div>
      </div>

      {exSorted.length === 0 ? (
        <div className="card-minimal td-empty" style={{ padding: '60px' }}>
          <History size={48} color="#cbd5e1" style={{ marginBottom: '16px' }} />
          <p>Vous n'avez pas encore de demandes dans vos archives.</p>
        </div>
      ) : exSorted.map(ex => (
        <div key={ex} className="archive-section" style={{ marginBottom: '40px' }}>
          <div className="section-title-wrap" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <Calendar size={20} color="var(--primary)" />
            <h2 className="section-title" style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-color)' }}>
              Exercice {ex}
            </h2>
            <div style={{ height: '2px', flex: 1, backgroundColor: 'var(--border-color)', marginLeft: '10px', opacity: 0.5 }}></div>
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
                  {groupedArchives[ex].map((d: any) => (
                    <tr key={d.id} className="table-row">
                      <td className="td-cell">
                        <div className="cell-icon-label">
                           <div className="icon-box">
                              <FileText size={18} color="var(--primary)" />
                           </div>
                           <span className="cell-label">{d.motif ? 'Congé Exceptionnel' : d.type_conge_nom}</span>
                        </div>
                      </td>
                      <td className="td-period">
                         Du <span className="text-primary">{d.date_debut}</span> au <span className="text-primary">{d.date_fin}</span>
                      </td>
                      <td className="td-duration">{d.duree} <span>jours</span></td>
                      <td>
                        <span className={`badge ${
                          d.statut === 'approuvee' ? 'badge-success' :
                          d.statut === 'refusee' ? 'badge-danger' :
                          d.statut === 'expiree' ? 'badge-expired' : 'badge-pending'
                        }`}>
                          {d.statut_display}
                        </span>
                      </td>
                      <td className="td-cell-right">
                         <button 
                           className="btn-icon" 
                           title="Voir les détails" 
                           onClick={() => setSelectedDemande(d)}
                         >
                           <Eye size={18} />
                         </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Version mobile adaptative pour l'iPhone XR / petits écrans */}
              <div className="mobile-demandes-list">
                {groupedArchives[ex].map((d: any) => (
                  <div key={d.id} className="demande-card" onClick={() => setSelectedDemande(d)}>
                    <div className="card-header-row">
                      <div className="card-type-info">
                        <div className="icon-box">
                          <FileText size={18} color="var(--primary)" />
                        </div>
                        <span className="card-label">{d.type_conge_nom}</span>
                      </div>
                      <span className={`badge ${d.statut === 'approuvee' ? 'badge-success' :
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
                      <div className="card-duration-info">
                        <span className="duration-label">Durée</span>
                        <span className="duration-val">{d.duree} <span>jours</span></span>
                      </div>
                    </div>
                    
                    <div className="card-actions-row">
                      <button className="btn-card-action" onClick={(e) => { e.stopPropagation(); setSelectedDemande(d); }}>
                        <Eye size={16} /> Voir les détails
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ))}

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
