import { useState, useEffect } from 'react';
import api from '../api/axiosConfig';
import { FileText, Download, Calendar, History } from 'lucide-react';
import './demandes.css'; // On réutilise le CSS existant

export default function Archives() {
  const [archives, setArchives] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // On récupère uniquement les demandes approuvées
    api.get('/demandes/?statut=approuvee')
      .then(res => {
        const list = Array.isArray(res.data) ? res.data : (res.data?.results ?? []);
        setArchives(list);
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

  // Groupement des demandes par Année (basé sur la date de début)
  const groupedArchives = archives.reduce((groups: any, d: any) => {
    const year = d.date_debut ? d.date_debut.split('-')[0] : "Année Inconnue";
    if (!groups[year]) groups[year] = [];
    groups[year].push(d);
    return groups;
  }, {});

  const yearsSorted = Object.keys(groupedArchives).sort().reverse();

  if (loading) return <div className="td-loading">Chargement de vos archives...</div>;

  return (
    <div className="demandes-v2">
      <div className="demandes-header">
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1 className="page-title">Archives des <span className="text-primary">Congés Approuvés</span></h1>
          <p className="page-subtitle">Retrouvez ici tous vos titres de congés officiels classés par année.</p>
        </div>
        <div className="icon-box-large">
           <History size={32} color="var(--primary)" />
        </div>
      </div>

      {yearsSorted.length === 0 ? (
        <div className="card-minimal td-empty" style={{ padding: '60px' }}>
          <History size={48} color="#cbd5e1" style={{ marginBottom: '16px' }} />
          <p>Vous n'avez pas encore de congés approuvés dans vos archives.</p>
        </div>
      ) : yearsSorted.map(year => (
        <div key={year} className="archive-section" style={{ marginBottom: '40px' }}>
          <div className="section-title-wrap" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <Calendar size={20} color="var(--primary)" />
            <h2 className="section-title" style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-color)' }}>
              Année {year}
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
                    <th className="th-cell-right">DOCUMENT</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedArchives[year].map((d: any) => (
                    <tr key={d.id} className="table-row">
                      <td className="td-cell">
                        <div className="cell-icon-label">
                           <div className="icon-box">
                              <FileText size={18} color="var(--primary)" />
                           </div>
                           <span className="cell-label">{d.type_conge_nom}</span>
                        </div>
                      </td>
                      <td className="td-period">
                         Du <span className="text-primary">{d.date_debut}</span> au <span className="text-primary">{d.date_fin}</span>
                      </td>
                      <td className="td-duration">{d.duree} <span>jours</span></td>
                      <td className="td-cell-right">
                         <button 
                           className="btn-primary btn-sm" 
                           style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 12px', fontSize: '0.85rem' }}
                           onClick={() => handleDownloadPDF(d.id)}
                         >
                            <Download size={14} /> Titre de congé
                         </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
