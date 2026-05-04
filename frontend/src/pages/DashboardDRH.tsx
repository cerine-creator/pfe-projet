import { useState, useEffect } from 'react';
import api from '../api/axiosConfig';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  UserCheck,
  UserX,
  BarChart3,
  Calendar,
  Plus,
  Eye,
  TrendingUp,
  Award
} from 'lucide-react';
import './dashboard-drh.css';

interface StatsDRH {
  employes_en_conge: number;
  employes_absents: Array<{
    id: number;
    nom: string;
    structure: string;
    date_debut: string;
    date_fin: string;
    type_conge: string;
  }>;
  employes_presents: number;
  total_employes: number;
  demandes_ce_mois_par_structure: Array<{
    structure: string;
    demandes: number;
  }>;
  employe_plus_conges?: {
    id: number;
    nom: string;
    structure: string;
    jours_consommes: number;
  } | null;
}

interface CalendarNote {
  id: number;
  title: string;
  description: string;
  date: string;
  created_by_name: string;
}

export default function DashboardDRH() {
  const { user } = useAuth();
  const [stats, setStats] = useState<StatsDRH | null>(null);
  const [calendarNotes, setCalendarNotes] = useState<CalendarNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [noteTitle, setNoteTitle] = useState('');
  const [noteDescription, setNoteDescription] = useState('');
  const [selectedEmploye, setSelectedEmploye] = useState<StatsDRH['employes_absents'][0] | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setError(null);
      const [statsRes, notesRes] = await Promise.all([
        api.get('/demandes/stats_drh/'),
        api.get('/calendar-notes/')
      ]);
      console.log("notesRes.data =", notesRes.data);

      setStats(statsRes.data);
      setCalendarNotes(notesRes.data.results);
    } catch (error: any) {
      console.error('Erreur lors du chargement des données:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Erreur inconnue';
      setError(`Erreur lors du chargement des données: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!noteTitle.trim() || !selectedDate) return;

    try {
      await api.post('/calendar-notes/', {
        title: noteTitle,
        description: noteDescription,
        date: selectedDate
      });

      setNoteTitle('');
      setNoteDescription('');
      setSelectedDate('');
      setShowCalendarModal(false);
      fetchData(); // Recharger les notes
    } catch (error) {
      console.error('Erreur lors de l\'ajout de la note:', error);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-drh">
        <div className="loading-state">Chargement du tableau de bord...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-drh">
        <div className="error-state">
          <h2>Erreur de chargement</h2>
          <p>{error}</p>
          <button onClick={fetchData} className="btn-primary">
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-drh">
      <div className="page-header">
        <h1 className="page-title-lg">
          Tableau de Bord <span className="text-primary">{user?.role === 'directeur_rh' ? 'DRH' : 'RH'}</span>
        </h1>
        <p className="page-subtitle">
          Vue d'ensemble de l'activité des congés et gestion du planning.
        </p>
      </div>

      {/* --- STATISTIQUES PRINCIPALES --- */}
      <div className="stats-grid-drh">
        <div className="stat-card stat-card-primary">
          <div className="stat-icon">
            <Users size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats?.total_employes || 0}</div>
            <div className="stat-label">Employés Total</div>
          </div>
        </div>

        <div className="stat-card stat-card-success">
          <div className="stat-icon">
            <UserCheck size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats?.employes_presents || 0}</div>
            <div className="stat-label">Présents</div>
          </div>
        </div>

        <div className="stat-card stat-card-warning">
          <div className="stat-icon">
            <UserX size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats?.employes_en_conge || 0}</div>
            <div className="stat-label">En Congé</div>
          </div>
        </div>

        <div className="stat-card stat-card-info">
          <div className="stat-icon">
            <BarChart3 size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-value">
              {stats?.demandes_ce_mois_par_structure.reduce((sum, item) => sum + item.demandes, 0) || 0}
            </div>
            <div className="stat-label">Demandes ce mois</div>
          </div>
        </div>
      </div>

      <div className="dashboard-content">
        {/* --- TOP CONSOMMATEUR DE CONGÉS (DRH uniquement) --- */}
        {user?.role === 'directeur_rh' && stats?.employe_plus_conges && (
          <div className="top-consumer-card" style={{ gridColumn: '1 / -1' }}>
            <div className="top-consumer-icon">
              <Award size={32} color="white" />
            </div>
            <div className="top-consumer-info">
              <h3>Employé ayant pris le plus de congés (Exercice actuel)</h3>
              <div className="top-name">{stats.employe_plus_conges.nom}</div>
              <div className="top-details">
                <span><Users size={14} style={{display: 'inline', marginRight: '4px', verticalAlign: 'middle'}}/> {stats.employe_plus_conges.structure}</span>
                <span><Calendar size={14} style={{display: 'inline', marginRight: '4px', verticalAlign: 'middle'}}/> {stats.employe_plus_conges.jours_consommes} jours consommés</span>
              </div>
            </div>
          </div>
        )}
        {/* --- GRAPHIQUE DES DEMANDES PAR STRUCTURE (Uniquement DRH) --- */}
        {user?.role === 'directeur_rh' && (
          <div className="chart-section">
            <div className="section-header">
              <h2 className="section-title">Demandes de congé ce mois par structure</h2>
            </div>
            <div className="chart-container">
              {stats?.demandes_ce_mois_par_structure.map((item, index) => (
                <div key={index} className="chart-bar">
                  <div className="bar-label">{item.structure}</div>
                  <div className="bar-container">
                    <div
                      className="bar-fill"
                      style={{
                        width: `${Math.max((item.demandes / Math.max(...stats.demandes_ce_mois_par_structure.map(s => s.demandes))) * 100, 5)}%`
                      }}
                    >
                      <span className="bar-value">{item.demandes}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- EMPLOYÉS ABSENTS --- */}
        <div className="absents-section">
          <div className="section-header">
            <h2 className="section-title">Employés actuellement en congé</h2>
          </div>
          <div className="absents-list">
            {stats?.employes_absents.length === 0 ? (
              <div className="empty-state">
                <UserCheck size={40} color="#94a3b8" />
                <span>Tous les employés sont présents</span>
              </div>
            ) : (
              stats?.employes_absents.map((emp) => (
                <div 
                  key={emp.id} 
                  className="absent-item" 
                  onClick={() => setSelectedEmploye(emp)}
                >
                  <div className="absent-info">
                    <div className="absent-name">{emp.nom}</div>
                    <div className="absent-details">
                      {emp.structure} • {emp.type_conge}
                    </div>
                  </div>
                  <div className="absent-dates">
                    Du {emp.date_debut} au {emp.date_fin}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* --- CALENDRIER --- */}
        <div className="calendar-section">
          <div className="section-header">
            <h2 className="section-title">Calendrier de planification</h2>
            <button
              className="btn-primary btn-small"
              onClick={() => setShowCalendarModal(true)}
            >
              <Plus size={16} />
              Ajouter une note
            </button>
          </div>

          <div className="calendar-notes">
            {calendarNotes.length === 0 ? (
              <div className="empty-state">
                <Calendar size={40} color="#94a3b8" />
                <span>Aucune note planifiée</span>
              </div>
            ) : (
              
              Array.isArray(calendarNotes) && calendarNotes.map(note => (  
                <div key={note.id} className="calendar-note">
                  <div className="note-header">
                    <div className="note-title">{note.title}</div>
                    <div className="note-date">{note.date}</div>
                  </div>
                  {note.description && (
                    <div className="note-description">{note.description}</div>
                  )}
                  <div className="note-author">Par {note.created_by_name}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* --- MODAL AJOUT NOTE --- */}
      {showCalendarModal && (
        <div className="modal-overlay">
          <div className="modal-content modal-calendar">
            <div className="modal-header">
              <h2 className="modal-title">Ajouter une note de planification</h2>
              <button onClick={() => setShowCalendarModal(false)} className="modal-close-btn">
                <UserX size={24} color="var(--text-muted)" />
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label>Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Titre</label>
                <input
                  type="text"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  placeholder="Titre de la note"
                  required
                />
              </div>

              <div className="form-group">
                <label>Description (optionnel)</label>
                <textarea
                  rows={4}
                  value={noteDescription}
                  onChange={(e) => setNoteDescription(e.target.value)}
                  placeholder="Détails de la planification..."
                />
              </div>
            </div>

            <div className="modal-actions">
              <button
                className="btn-action btn-cancel"
                onClick={() => setShowCalendarModal(false)}
              >
                Annuler
              </button>
              <button
                className="btn-action btn-approve"
                onClick={handleAddNote}
                disabled={!noteTitle.trim() || !selectedDate}
              >
                Ajouter la note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL DÉTAILS EMPLOYÉ --- */}
      {selectedEmploye && (
        <div className="modal-overlay" onClick={() => setSelectedEmploye(null)}>
          <div className="modal-content employee-details-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Détails de l'employé</h2>
              <button onClick={() => setSelectedEmploye(null)} className="modal-close-btn">
                <UserX size={24} color="var(--text-muted)" />
              </button>
            </div>
            
            <div className="modal-body">
              <div className="detail-row">
                <span className="detail-label">Nom complet</span>
                <span className="detail-value">{selectedEmploye.nom}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Structure</span>
                <span className="detail-value">{selectedEmploye.structure}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Type de congé en cours</span>
                <span className="detail-value">{selectedEmploye.type_conge}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Période d'absence</span>
                <span className="detail-value">Du {selectedEmploye.date_debut} au {selectedEmploye.date_fin}</span>
              </div>
            </div>
            
            <div className="modal-actions" style={{ justifyContent: 'center' }}>
              <button className="btn-action btn-cancel" onClick={() => setSelectedEmploye(null)}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}