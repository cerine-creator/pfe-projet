import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axiosConfig';
import { CheckCircle, AlertCircle } from 'lucide-react';


export default function NouvelleDemande() {
  const navigate = useNavigate();
  const [types, setTypes] = useState<any[]>([]);
  const [exercices, setExercices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{type: 'success'|'error', text: string} | null>(null);

  const [formData, setFormData] = useState({
    type_conge: '',
    exercice: '',
    date_debut: '',
    date_fin: '',
    motif: '',
  });

  useEffect(() => {
    Promise.all([
      api.get('/types-congés/'),
      api.get('/exercices/'),
    ]).then(([resTypes, resEx]) => {
      // DRF pagine les résultats : { count, results: [...] } — on extrait results
      const typesList = Array.isArray(resTypes.data) ? resTypes.data : (resTypes.data?.results ?? []);
      const exList    = Array.isArray(resEx.data)    ? resEx.data    : (resEx.data?.results    ?? []);

      setTypes(typesList);
      setExercices(exList);
      // Auto-sélectionner le premier exercice non clôturé
      const activeEx = exList.find((ex: any) => !ex.est_cloture);
      if (activeEx) setFormData(prev => ({ ...prev, exercice: activeEx.id }));
    }).catch(e => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      await api.post('/demandes/', formData);
      setMessage({ type: 'success', text: 'Demande soumise avec succès ! Redirection...' });
      setTimeout(() => navigate('/conges/mes-demandes'), 2000);
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || err.response?.data?.error || "Une erreur est survenue.";
      setMessage({ type: 'error', text: errorMsg });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div style={{padding: '50px', textAlign: 'center', fontWeight: 800}}>Initialisation du formulaire...</div>;

  return (
    <div style={{maxWidth: '800px'}}>
      <div style={{marginBottom: '40px'}}>
        <h1 style={{fontSize: '2.5rem', fontWeight: 900}}>Nouvelle <span style={{color: 'var(--primary)'}}>Demande</span></h1>
        <p style={{color: 'var(--text-muted)', fontWeight: 600}}>Remplissez les informations ci-dessous pour soumettre votre congé.</p>
      </div>

      <div className="card-minimal">
        <form onSubmit={handleSubmit}>
          
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '30px'}}>
            <div className="form-group">
              <label>Type de congé</label>
              <select 
                required
                value={formData.type_conge}
                onChange={e => setFormData({...formData, type_conge: e.target.value})}
              >
                <option value="">Sélectionner un type...</option>
                {types.map(t => <option key={t.id} value={t.id}>{t.nomType}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label>Exercice fiscal</label>
              <select 
                required
                value={formData.exercice}
                onChange={e => setFormData({...formData, exercice: e.target.value})}
              >
                {exercices.map(ex => <option key={ex.id} value={ex.id}>{ex.libelle} {ex.est_cloture ? '(Clôturé)' : '(Actuel)'}</option>)}
              </select>
            </div>
          </div>

          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '30px'}}>
            <div className="form-group">
              <label>Date de début</label>
              <div style={{position: 'relative'}}>
                <input 
                  type="date" 
                  required 
                  value={formData.date_debut}
                  onChange={e => setFormData({...formData, date_debut: e.target.value})}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Date de fin</label>
              <input 
                type="date" 
                required 
                value={formData.date_fin}
                onChange={e => setFormData({...formData, date_fin: e.target.value})}
              />
            </div>
          </div>

          <div className="form-group" style={{marginBottom: '40px'}}>
            <label>Motif / Justification (Optionnel)</label>
            <textarea 
              rows={3} 
              placeholder="Précisez le motif si nécessaire..."
              value={formData.motif}
              onChange={e => setFormData({...formData, motif: e.target.value})}
            />
          </div>

          {message && (
            <div style={{
              padding: '15px 20px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '15px',
              background: message.type === 'success' ? '#ecfdf5' : '#fef2f2',
              color: message.type === 'success' ? '#10b981' : '#ef4444',
              marginBottom: '30px', fontWeight: 700
            }}>
              {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
              {message.text}
            </div>
          )}

          <div style={{display: 'flex', gap: '15px', justifyContent: 'flex-end'}}>
            <button type="button" className="nav-item" onClick={() => navigate(-1)}>Annuler</button>
            <button 
              type="submit" 
              className="nav-item" 
              disabled={submitting}
              style={{background: 'var(--primary)', color: 'white', padding: '12px 40px'}}
            >
              {submitting ? 'Envoi...' : 'Soumettre la demande'}
            </button>
          </div>

        </form>
      </div>

      <style>{`
        .form-group { display: flex; flex-direction: column; gap: 8px; }
        .form-group label { font-size: 0.85rem; fontWeight: 800; color: var(--text-muted); text-transform: uppercase; }
        .form-group input, .form-group select, .form-group textarea {
          padding: 12px 16px; border: 1px solid var(--border-color); border-radius: 10px;
          background: #f8fafc; font-size: 1rem; font-weight: 600; outline: none; transition: 0.2s;
        }
        .form-group input:focus, .form-group select:focus, .form-group textarea:focus { border-color: var(--primary); background: white; }
      `}</style>
    </div>
  );
}
