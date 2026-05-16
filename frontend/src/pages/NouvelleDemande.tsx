import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axiosConfig';
import CustomSelect from '../components/CustomSelect';
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
      let errorMsg = "Une erreur est survenue.";
      const data = err.response?.data;

      if (data) {
        if (typeof data === 'string') {
          errorMsg = data;
        } else if (data.detail) {
          errorMsg = data.detail;
        } else if (data.non_field_errors) {
          errorMsg = Array.isArray(data.non_field_errors) ? data.non_field_errors[0] : data.non_field_errors;
        } else if (typeof data === 'object') {
          // Prendre la première erreur trouvée dans les champs
          const firstKey = Object.keys(data)[0];
          const firstErr = data[firstKey];
          errorMsg = Array.isArray(firstErr) ? firstErr[0] : firstErr;
        }
      }

      // "Nettoyage" des messages techniques du backend pour l'utilisateur
      if (errorMsg.includes("Solde insuffisant") || errorMsg.includes("Votre solde")) {
        errorMsg = "Votre solde ne suffit pas pour effectuer cette demande.";
      }
      
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
              <CustomSelect 
                required
                value={natureConge}
                onChange={(val) => {
                  setNatureConge(val as any);
                  setFormData(prev => ({ ...prev, date_debut: '', date_fin: '', motif: '' }));
                }}
                placeholder="Sélectionner une nature..."
                options={[
                  { value: 'annuel', label: 'Congé Annuel (Payé)' },
                  { value: 'exceptionnel', label: 'Congé Exceptionnel' },
                  { value: 'maladie', label: 'Congé Maladie' },
                  { value: 'sans_solde', label: 'Congé Non Payé (Sans Solde)' }
                ]}
              />
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
                <CustomSelect 
                  required
                  value={formData.motif}
                  onChange={(val) => setFormData({...formData, motif: val})}
                  placeholder="Sélectionner le motif..."
                  options={MOTIF_CHOICES}
                />
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
