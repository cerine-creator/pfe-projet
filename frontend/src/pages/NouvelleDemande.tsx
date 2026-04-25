import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axiosConfig';
import { CheckCircle, AlertCircle } from 'lucide-react';
import './nouvelle-demande.css';


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

    let typeObj = null;

    if (natureConge === 'exceptionnel') {
       // Essayer de trouver un type de congé qui correspond au motif spécifique
       if (formData.motif.includes('mariage')) typeObj = types.find(t => t.est_exceptionnel && t.nomType.toLowerCase().includes('mariage'));
       else if (formData.motif.includes('deces')) typeObj = types.find(t => t.est_exceptionnel && t.nomType.toLowerCase().includes('décès'));
       else if (formData.motif.includes('naissance')) typeObj = types.find(t => t.est_exceptionnel && t.nomType.toLowerCase().includes('naissance'));
       
       // Fallback: Prendre le premier congé exceptionnel disponible si on ne trouve pas de correspondance exacte
       if (!typeObj) {
         typeObj = types.find(t => t.est_exceptionnel === true || t.nomType.toLowerCase().includes('exceptionnel'));
       }
    } else if (natureConge === 'annuel') {
       typeObj = types.find(t => t.est_exceptionnel === false && t.nomType.toLowerCase().includes('annuel'));
    } else if (natureConge === 'sans_solde') {
       typeObj = types.find(t => t.nomType.toLowerCase().includes('non payé') || t.nomType.toLowerCase().includes('sans solde'));
    }

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

  if (loading) return <div className="form-loading">Initialisation du formulaire...</div>;

  return (
    <div className="nouvelle-demande-page">
      <div className="page-header">
        <h1 className="page-title-lg">Nouvelle <span className="text-primary">Demande</span></h1>
        <p className="page-subtitle">Remplissez les informations ci-dessous pour soumettre votre congé.</p>
      </div>

      <div className="card-minimal">
        <form onSubmit={handleSubmit}>
          
          <div className="form-grid">
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

          <div className="form-grid">
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
            <div className={`msg-banner ${message.type === 'success' ? 'msg-success' : 'msg-error'}`}>
              {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
              {message.text}
            </div>
          )}

          <div className="form-footer">
            <button type="button" className="nav-item" onClick={() => navigate(-1)}>Annuler</button>
            <button 
              type="submit" 
              className="btn-primary" 
              disabled={submitting}
            >
              {submitting ? 'Envoi...' : 'Soumettre la demande'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
