import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axiosConfig';
import { CheckCircle, AlertCircle } from 'lucide-react';
import './nouvelle-demande.css';


export default function NouvelleDemande() {
  const navigate = useNavigate();
  const [types, setTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{type: 'success'|'error', text: string} | null>(null);
  
  const today = new Date().toISOString().split('T')[0];

  const [natureConge, setNatureConge] = useState<'annuel'|'exceptionnel'|'sans_solde'|'maladie'|''>('');
  const [file, setFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
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
  const requiresJustificatif = natureConge === 'exceptionnel' || natureConge === 'maladie';

  useEffect(() => {
    api.get('/types-congés/')
      .then(resTypes => {
        const typesList = Array.isArray(resTypes.data) ? resTypes.data : (resTypes.data?.results ?? []);
        setTypes(typesList);
      })
      .catch(e => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    let finalData = { ...formData } as any;
    let typeObj = null;

    if (natureConge === 'exceptionnel') {
       if (formData.motif.includes('mariage')) typeObj = types.find(t => t.est_exceptionnel && t.nomType.toLowerCase().includes('mariage'));
       else if (formData.motif.includes('deces')) typeObj = types.find(t => t.est_exceptionnel && t.nomType.toLowerCase().includes('décès'));
       else if (formData.motif.includes('naissance')) typeObj = types.find(t => t.est_exceptionnel && t.nomType.toLowerCase().includes('naissance'));
       
       if (!typeObj) {
         typeObj = types.find(t => t.est_exceptionnel === true || t.nomType.toLowerCase().includes('exceptionnel'));
       }
    } else if (natureConge === 'annuel') {
       typeObj = types.find(t => t.est_exceptionnel === false && t.nomType.toLowerCase().includes('annuel'));
    } else if (natureConge === 'sans_solde') {
       typeObj = types.find(t => t.nomType.toLowerCase().includes('non payé') || t.nomType.toLowerCase().includes('sans solde'));
    } else if (natureConge === 'maladie') {
       typeObj = types.find(t => t.nomType.toLowerCase().includes('maladie'));
    }

    if (!typeObj) {
      setMessage({ type: 'error', text: `Erreur : Le type de congé "${natureConge}" est introuvable.` });
      setSubmitting(false);
      return;
    }
    finalData.type_conge = typeObj.id;

    if (isExceptionnel) {
      if (!finalData.motif) {
        setMessage({ type: 'error', text: "Veuillez sélectionner un motif." });
        setSubmitting(false);
        return;
      }
      if (!finalData.date_debut) {
        setMessage({ type: 'error', text: "La date de début est requise." });
        setSubmitting(false);
        return;
      }
      const selectedMotif = MOTIF_CHOICES.find(m => m.value === finalData.motif);
      if (selectedMotif && finalData.date_debut) {
        const start = new Date(finalData.date_debut);
        start.setDate(start.getDate() + (selectedMotif.days - 1));
        finalData.date_fin = start.toISOString().split('T')[0];
      }
    } else {
      if (!finalData.date_debut || !finalData.date_fin) {
        setMessage({ type: 'error', text: "Les dates sont requises." });
        setSubmitting(false);
        return;
      }
      
      const dDebut = new Date(finalData.date_debut);
      const dFin = new Date(finalData.date_fin);
      if (dFin < dDebut) {
        setMessage({ type: 'error', text: "La date de fin doit être après le début." });
        setSubmitting(false);
        return;
      }
      finalData.motif = '';
    }

    try {
      if (requiresJustificatif) {
        if (!file) {
          setMessage({ type: 'error', text: "Justificatif obligatoire." });
          setSubmitting(false);
          return;
        }
        
        const payload = new FormData();
        Object.keys(finalData).forEach(key => {
          if (finalData[key] !== '') payload.append(key, finalData[key]);
        });
        payload.append('justificatif', file, file.name);
        await api.post('/demandes/', payload);
      } else {
        await api.post('/demandes/', finalData);
      }
      
      setMessage({ type: 'success', text: 'Demande soumise avec succès !' });
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
          
          <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
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
                <option value="maladie">Congé Maladie</option>
                <option value="sans_solde">Congé Non Payé (Sans Solde)</option>
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
                  min={today}
                  value={formData.date_debut}
                  onChange={e => setFormData({...formData, date_debut: e.target.value})}
                />
              </div>
            )}

            {(natureConge === 'annuel' || natureConge === 'sans_solde' || natureConge === 'maladie') && (
              <div className="form-group">
                <label>Date de fin</label>
                <input 
                  type="date" 
                  required
                  min={formData.date_debut || today}
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
            
            {requiresJustificatif && (
              <div className="form-group">
                <label>Justificatif (Document ou Image) *</label>
                <input 
                  type="file" 
                  accept=".pdf,image/*"
                  required
                  onChange={e => {
                    if (e.target.files && e.target.files.length > 0) {
                      setFile(e.target.files[0]);
                    }
                  }}
                  style={{ padding: '8px 0' }}
                />
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
            <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>Annuler</button>
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
