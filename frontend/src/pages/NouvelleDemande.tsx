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

  const [natureConge, setNatureConge] = useState<'annuel'|'exceptionnel'|'sans_solde'|''>('');
  const [formData, setFormData] = useState({
    exercice: '',
    date_debut: '',
    date_fin: '',
    motif: '', // Dropdown value for exceptional
  });

  const MOTIF_CHOICES = [
    { value: 'mariage_perso', label: 'Mariage personnel (5j)', days: 5 },
    { value: 'naissance', label: 'Naissance (3j)', days: 3 },
    { value: 'deces_enfant', label: "Décès d'un enfant (5j)", days: 5 },
    { value: 'deces_proche', label: "Décès d'un proche (3j)", days: 3 },
    { value: 'mariage_enfant', label: "Mariage d'un enfant (3j)", days: 3 },
  ];

  const isExceptionnel = natureConge === 'exceptionnel';

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

    let finalData = { ...formData } as any;

    // Trouver l'ID du type de congé correspondant dans le backend
    const typeObj = types.find(t => {
      if (natureConge === 'exceptionnel') return t.est_exceptionnel === true || t.nomType.toLowerCase().includes('exceptionnel');
      if (natureConge === 'annuel') return t.est_exceptionnel === false && t.nomType.toLowerCase().includes('annuel');
      if (natureConge === 'sans_solde') return t.nomType.toLowerCase().includes('non payé') || t.nomType.toLowerCase().includes('sans solde');
      return false;
    });

    if (!typeObj) {
      setMessage({ type: 'error', text: `Erreur : Le type de congé "${natureConge}" est introuvable dans la base de données. Veuillez demander à l'administrateur de l'ajouter dans les Types de Congé.` });
      setSubmitting(false);
      return;
    }
    finalData.type_conge = typeObj.id;

    if (isExceptionnel) {
      if (!finalData.motif) {
        setMessage({ type: 'error', text: "Veuillez sélectionner un motif pour ce congé exceptionnel." });
        setSubmitting(false);
        return;
      }
      if (!finalData.date_debut) {
        setMessage({ type: 'error', text: "La date de début est requise." });
        setSubmitting(false);
        return;
      }
      // Calcul automatique de la date de fin
      const selectedMotif = MOTIF_CHOICES.find(m => m.value === finalData.motif);
      if (selectedMotif && finalData.date_debut) {
        const start = new Date(finalData.date_debut);
        start.setDate(start.getDate() + (selectedMotif.days - 1));
        finalData.date_fin = start.toISOString().split('T')[0];
      }
    } else {
      if (!finalData.date_debut || !finalData.date_fin) {
        setMessage({ type: 'error', text: "Les dates de début et de fin sont requises." });
        setSubmitting(false);
        return;
      }
      
      const dDebut = new Date(finalData.date_debut);
      const dFin = new Date(finalData.date_fin);
      if (dFin < dDebut) {
        setMessage({ type: 'error', text: "Erreur : La date de fin doit être postérieure ou égale à la date de début." });
        setSubmitting(false);
        return;
      }
      // Pour un congé normal, on ne transmet pas de motif
      finalData.motif = '';
    }

    try {
      await api.post('/demandes/', finalData);
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
              <label>Nature du congé</label>
              <select 
                required
                value={natureConge}
                onChange={e => {
                  setNatureConge(e.target.value as any);
                  setFormData(prev => ({ ...prev, date_debut: '', date_fin: '', motif: '' }));
                }}
              >
                <option value="">Sélectionner une nature...</option>
                <option value="annuel">Congé Annuel (Payé)</option>
                <option value="exceptionnel">Congé Exceptionnel</option>
                <option value="sans_solde">Congé Non Payé (Sans Solde)</option>
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
            {natureConge !== '' && (
              <div className="form-group">
                <label>Date de début</label>
                <input 
                  type="date" 
                  required 
                  value={formData.date_debut}
                  onChange={e => setFormData({...formData, date_debut: e.target.value})}
                />
              </div>
            )}

            {(natureConge === 'annuel' || natureConge === 'sans_solde') && (
              <div className="form-group">
                <label>Date de fin</label>
                <input 
                  type="date" 
                  required
                  value={formData.date_fin}
                  onChange={e => setFormData({...formData, date_fin: e.target.value})}
                />
              </div>
            )}

            {natureConge === 'exceptionnel' && (
              <div className="form-group">
                <label>Motif (Congé exceptionnel)</label>
                <select 
                  required
                  value={formData.motif}
                  onChange={e => setFormData({...formData, motif: e.target.value})}
                >
                  <option value="">Sélectionner le motif...</option>
                  {MOTIF_CHOICES.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
            )}
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
