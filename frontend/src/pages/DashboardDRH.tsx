import { useState, useEffect, useCallback } from 'react';
import api from '../api/axiosConfig';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  UserCheck,
  UserX,
  BarChart3,
  Calendar,
  Plus,
  Award,
  ChevronLeft,
  ChevronRight,
  X,
  Trash2,
} from 'lucide-react';
import './dashboard-drh.css';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

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
  id: number | string;
  title: string;
  description: string;
  date: string;
  created_by_name: string;
  type?: 'note' | 'absence';
}

// ──────────────────────────────────────────────
//  Mini-calendrier interactif
// ──────────────────────────────────────────────
const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];
const DAYS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

function buildCalendarDays(year: number, month: number) {
  // month is 0-indexed
  const firstDay = new Date(year, month, 1);
  // Monday = 0, Sunday = 6
  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];

  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  // pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

interface CalendarWidgetProps {
  notes: CalendarNote[];
  onDayClick: (dateStr: string) => void;
  onDeleteNote: (id: number) => void;
}

function CalendarWidget({ notes, onDayClick, onDeleteNote }: CalendarWidgetProps) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState<string | null>(null);

  const cells = buildCalendarDays(year, month);

  const notesByDate: Record<string, CalendarNote[]> = {};
  notes.forEach((n) => {
    if (!notesByDate[n.date]) notesByDate[n.date] = [];
    notesByDate[n.date].push(n);
  });

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
    setSelected(null);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
    setSelected(null);
  };

  const handleDayClick = (day: number) => {
    const dateStr = `${year}-${pad2(month + 1)}-${pad2(day)}`;
    setSelected(dateStr);
    onDayClick(dateStr);
  };

  const todayStr = `${today.getFullYear()}-${pad2(today.getMonth() + 1)}-${pad2(today.getDate())}`;

  const selectedNotes = selected ? (notesByDate[selected] || []) : [];

  return (
    <div className="calendar-widget">
      {/* Header navigation */}
      <div className="cal-header">
        <button className="cal-nav-btn" onClick={prevMonth}>
          <ChevronLeft size={18} />
        </button>
        <span className="cal-month-label">
          {MONTHS_FR[month]} {year}
        </span>
        <button className="cal-nav-btn" onClick={nextMonth}>
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="cal-grid">
        {DAYS_FR.map(d => (
          <div key={d} className="cal-dow">{d}</div>
        ))}

        {cells.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} className="cal-cell cal-cell-empty" />;
          const dateStr = `${year}-${pad2(month + 1)}-${pad2(day)}`;
          const hasNotes = !!notesByDate[dateStr];
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selected;

          return (
            <div
              key={dateStr}
              className={[
                'cal-cell',
                isToday ? 'cal-today' : '',
                isSelected ? 'cal-selected' : '',
                hasNotes ? 'cal-has-note' : '',
              ].join(' ')}
              onClick={() => handleDayClick(day)}
            >
              <span className="cal-day-num">{day}</span>
              <div className="cal-cell-content">
                {notesByDate[dateStr]?.slice(0, 2).map((n, idx) => (
                  <div key={idx} className={`cal-badge ${n.type === 'absence' ? 'badge-abs' : 'badge-note'}`}>
                    {n.title.length > 10 ? n.title.substring(0, 8) + '..' : n.title}
                  </div>
                ))}
                {notesByDate[dateStr]?.length > 2 && (
                  <div className="cal-more">+{notesByDate[dateStr].length - 2}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Notes panel for selected day */}
      {selected && (
        <div className="cal-notes-panel">
          <div className="cal-notes-header">
            <span className="cal-notes-date">
              <Calendar size={14} /> {selected}
            </span>
            <button className="btn-primary btn-small" onClick={() => onDayClick(selected)}>
              <Plus size={14} /> Ajouter
            </button>
          </div>
          {selectedNotes.length === 0 ? (
            <p className="cal-notes-empty">Aucune note ce jour-là.</p>
          ) : (
            selectedNotes.map(note => (
              <div key={note.id} className={`cal-note-item ${note.type === 'absence' ? 'cal-note-abs' : ''}`}>
                <div className="cal-note-body">
                  <div className="cal-note-title">{note.title}</div>
                  {note.description && <div className="cal-note-desc">{note.description}</div>}
                  <div className="cal-note-author">Par {note.created_by_name}</div>
                </div>
                {note.type !== 'absence' && (
                  <button
                    className="cal-note-delete"
                    title="Supprimer"
                    onClick={() => onDeleteNote(note.id as number)}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
//  Composant principal DashboardDRH
// ──────────────────────────────────────────────
export default function DashboardDRH() {
  const { user } = useAuth();
  const [stats, setStats] = useState<StatsDRH | null>(null);
  const [calendarNotes, setCalendarNotes] = useState<CalendarNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [noteTitle, setNoteTitle] = useState('');
  const [noteDescription, setNoteDescription] = useState('');
  const [selectedEmploye, setSelectedEmploye] = useState<StatsDRH['employes_absents'][0] | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [statsRes, notesRes] = await Promise.all([
        api.get('/demandes/stats_drh/'),
        api.get('/planning/'),
      ]);
      setStats(statsRes.data);
      const nd = notesRes.data;
      setCalendarNotes(Array.isArray(nd) ? nd : (nd.results ?? []));
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Erreur inconnue';
      setError(`Erreur lors du chargement des données: ${msg}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openNoteModal = (dateStr: string) => {
    setSelectedDate(dateStr);
    setNoteTitle('');
    setNoteDescription('');
    setShowNoteModal(true);
  };

  const handleAddNote = async () => {
    if (!noteTitle.trim() || !selectedDate) return;
    try {
      await api.post('/calendar-notes/', {
        title: noteTitle,
        description: noteDescription,
        date: selectedDate,
      });
      setShowNoteModal(false);
      fetchData();
    } catch (err) {
      console.error("Erreur ajout note:", err);
    }
  };

  const handleDeleteNote = async (id: number) => {
    try {
      await api.delete(`/calendar-notes/${id}/`);
      fetchData();
    } catch (err) {
      console.error("Erreur suppression note:", err);
    }
  };

  // ─── Loading skeleton ───
  if (loading) {
    return (
      <div className="dashboard-drh">
        <div className="page-header">
          <div className="skeleton-block" style={{ width: '300px', height: '35px', marginBottom: '10px' }}></div>
          <div className="skeleton-block" style={{ width: '400px', height: '15px' }}></div>
        </div>
        <div className="stats-grid-drh" style={{ marginTop: '30px' }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="stat-card" style={{ padding: '25px', display: 'flex', gap: '15px', alignItems: 'center' }}>
              <div className="skeleton-avatar" style={{ width: '50px', height: '50px', borderRadius: '50%', flexShrink: 0 }}></div>
              <div style={{ flex: 1 }}>
                <div className="skeleton-block" style={{ width: '40px', height: '24px', marginBottom: '8px' }}></div>
                <div className="skeleton-block" style={{ width: '100px', height: '12px' }}></div>
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
          Tableau de Bord <span className="text-primary">{user?.role === 'directeur_rh' ? 'DRH' : 'RH'}</span>
        </h1>
        <p className="page-subtitle">Vue d'ensemble de l'activité des congés et gestion du planning.</p>
      </div>

      {/* ─── STATS CARDS ─── */}
      <div className="stats-grid-drh">
        <div className="stat-card stat-card-primary">
          <div className="stat-icon"><Users size={24} /></div>
          <div className="stat-content">
            <div className="stat-value">{stats?.total_employes || 0}</div>
            <div className="stat-label">Employés Total</div>
          </div>
        </div>
        <div className="stat-card stat-card-success">
          <div className="stat-icon"><UserCheck size={24} /></div>
          <div className="stat-content">
            <div className="stat-value">{stats?.employes_presents || 0}</div>
            <div className="stat-label">Présents</div>
          </div>
        </div>
        <div className="stat-card stat-card-warning">
          <div className="stat-icon"><UserX size={24} /></div>
          <div className="stat-content">
            <div className="stat-value">{stats?.employes_en_conge || 0}</div>
            <div className="stat-label">En Congé</div>
          </div>
        </div>
        <div className="stat-card stat-card-info">
          <div className="stat-icon"><BarChart3 size={24} /></div>
          <div className="stat-content">
            <div className="stat-value">
              {stats?.demandes_ce_mois_par_structure.reduce((s, i) => s + i.demandes, 0) || 0}
            </div>
            <div className="stat-label">Demandes ce mois</div>
          </div>
        </div>
      </div>

      <div className="dashboard-content">
        {/* ─── TOP CONSUMER (DRH only) ─── */}
        {user?.role === 'directeur_rh' && stats?.employe_plus_conges && (
          <div className="top-consumer-card" style={{ gridColumn: '1 / -1' }}>
            <div className="top-consumer-icon"><Award size={32} color="white" /></div>
            <div className="top-consumer-info">
              <h3>Employé ayant pris le plus de congés (Exercice actuel)</h3>
              <div className="top-name">{stats.employe_plus_conges.nom}</div>
              <div className="top-details">
                <span><Users size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} /> {stats.employe_plus_conges.structure}</span>
                <span><Calendar size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} /> {stats.employe_plus_conges.jours_consommes} jours consommés</span>
              </div>
            </div>
          </div>
        )}

        {/* ─── CHART (DRH only) ─── */}
        {user?.role === 'directeur_rh' && (
          <div className="chart-section">
            <div className="section-header">
              <h2 className="section-title">Demandes par structure ce mois</h2>
            </div>
            <div style={{ height: '350px', marginTop: '20px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.demandes_ce_mois_par_structure || []} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                  <XAxis dataKey="structure" angle={-45} textAnchor="end" interval={0} height={70}
                    tick={{ fill: 'var(--text-muted)', fontSize: 12, fontWeight: 500 }} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border-color)', borderRadius: '12px', color: 'var(--text-main)' }}
                    itemStyle={{ color: 'var(--primary)', fontWeight: 600 }} />
                  <Bar dataKey="demandes" radius={[6, 6, 0, 0]}>
                    {(stats?.demandes_ce_mois_par_structure || []).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={index % 2 === 0 ? 'var(--primary)' : '#be123c'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ─── ABSENTS ─── */}
        <div className="absents-section">
          <div className="section-header">
            <h2 className="section-title">Employés en congé aujourd'hui</h2>
          </div>
          <div className="absents-list">
            {stats?.employes_absents.length === 0 ? (
              <div className="empty-state">
                <UserCheck size={40} color="#94a3b8" />
                <span>Tous les employés sont présents</span>
              </div>
            ) : (
              stats?.employes_absents.map((emp) => (
                <div key={emp.id} className="absent-item" onClick={() => setSelectedEmploye(emp)}>
                  <div className="absent-info">
                    <div className="absent-name">{emp.nom}</div>
                    <div className="absent-details">{emp.structure} • {emp.type_conge}</div>
                  </div>
                  <div className="absent-dates">Du {emp.date_debut} au {emp.date_fin}</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ─── CALENDRIER INTERACTIF ─── */}
        <div className="calendar-section">
          <div className="section-header">
            <h2 className="section-title">Calendrier de planification</h2>
            <button className="btn-primary btn-small" onClick={() => openNoteModal(new Date().toISOString().slice(0, 10))}>
              <Plus size={16} /> Nouvelle note
            </button>
          </div>
          <CalendarWidget
            notes={calendarNotes}
            onDayClick={openNoteModal}
            onDeleteNote={handleDeleteNote}
          />
        </div>
      </div>

      {/* ─── MODAL AJOUT NOTE ─── */}
      {showNoteModal && (
        <div className="modal-overlay" onClick={() => setShowNoteModal(false)}>
          <div className="modal-content modal-calendar" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Ajouter une note — {selectedDate}</h2>
              <button onClick={() => setShowNoteModal(false)} className="modal-close-btn">
                <X size={22} color="var(--text-muted)" />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Date</label>
                <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Titre *</label>
                <input type="text" value={noteTitle} onChange={e => setNoteTitle(e.target.value)} placeholder="Ex: Revue planning, Formation…" autoFocus />
              </div>
              <div className="form-group">
                <label>Description (optionnel)</label>
                <textarea rows={3} value={noteDescription} onChange={e => setNoteDescription(e.target.value)} placeholder="Détails supplémentaires…" />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-action btn-cancel" onClick={() => setShowNoteModal(false)}>Annuler</button>
              <button className="btn-action btn-approve" onClick={handleAddNote} disabled={!noteTitle.trim() || !selectedDate}>
                Ajouter la note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL EMPLOYÉ ABSENT ─── */}
      {selectedEmploye && (
        <div className="modal-overlay" onClick={() => setSelectedEmploye(null)}>
          <div className="modal-content employee-details-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Détails de l'employé</h2>
              <button onClick={() => setSelectedEmploye(null)} className="modal-close-btn">
                <X size={22} color="var(--text-muted)" />
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-row"><span className="detail-label">Nom complet</span><span className="detail-value">{selectedEmploye.nom}</span></div>
              <div className="detail-row"><span className="detail-label">Structure</span><span className="detail-value">{selectedEmploye.structure}</span></div>
              <div className="detail-row"><span className="detail-label">Type de congé</span><span className="detail-value">{selectedEmploye.type_conge}</span></div>
              <div className="detail-row"><span className="detail-label">Période</span><span className="detail-value">Du {selectedEmploye.date_debut} au {selectedEmploye.date_fin}</span></div>
            </div>
            <div className="modal-actions" style={{ justifyContent: 'center' }}>
              <button className="btn-action btn-cancel" onClick={() => setSelectedEmploye(null)}>Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}