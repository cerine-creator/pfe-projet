import { useState, useEffect, useRef } from 'react';
import { Bell, X, CheckCheck, Clock, ShieldCheck, FileCheck, AlertCircle, Info } from 'lucide-react';
import api from '../api/axiosConfig';
import { useAuth } from '../context/AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Notif {
  id: number;
  description: string;
  lu: boolean;
  date_creation?: string;
}

// ─── Icône selon le contenu du message ───────────────────────────────────────

function NotifIcon({ text }: { text: string }) {
  const t = text.toLowerCase();
  if (t.includes('approu') || t.includes('validée') || t.includes('félicitation'))
    return <FileCheck size={16} className="notif-icon notif-icon--success" />;
  if (t.includes('refus') || t.includes('rejet'))
    return <AlertCircle size={16} className="notif-icon notif-icon--danger" />;
  if (t.includes('attente') || t.includes('traitement'))
    return <Clock size={16} className="notif-icon notif-icon--warning" />;
  if (t.includes('hiérarchie') || t.includes('responsable'))
    return <ShieldCheck size={16} className="notif-icon notif-icon--info" />;
  return <Info size={16} className="notif-icon notif-icon--info" />;
}

// ─── Messages statiques selon le rôle (aide contextuelle) ────────────────────

function getRoleHints(role: string): string[] {
  switch (role) {
    case 'employe':
      return [
        'Vous avez droit à 30 jours (personnel au sol) ou 45 jours (naviguant/sud) par exercice.',
        'Les reliquats de congés non pris se reportent d\'un exercice à l\'autre.',
        'Coordonnez vos absences avec vos collègues de direction.',
      ];
    case 'responsable_hierarchique':
      return [
        'Traitez les demandes de congé de votre direction dans les meilleurs délais.',
        'Vérifiez qu\'aucun employé clé n\'est absent durant la même période.',
        'Les demandes validées sont transmises automatiquement au service RH.',
      ];
    case 'responsable_rh':
      return [
        'Assurez-vous de la cohérence des droits avant d\'approuver les demandes.',
        'Les congés exceptionnels (mariage 5j, naissance 3j, décès 3-5j) obéissent à la loi.',
        'Générez les titres de congé après approbation finale.',
      ];
    case 'directeur_rh':
      return [
        'Les demandes des responsables hiérarchiques sont traitées par la DRH.',
        'Supervisez les statistiques globales des congés Air Algérie (~8 315 employés).',
        'Veillez à la conformité avec la législation du travail algérienne.',
      ];
    default:
      return [];
  }
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function NotificationBell() {
  const { user } = useAuth();
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  // Chargement depuis l'API + Temps réel (Polling)
  useEffect(() => {
    const fetchNotifs = () => {
      api.get<{ results?: Notif[]; count?: number } | Notif[]>('/notifications/')
        .then(res => {
          const list = Array.isArray(res.data) ? res.data : (res.data?.results ?? []);
          setNotifs(list);
        })
        .catch(() => setNotifs([]));
    };

    fetchNotifs();

    // On rafraîchit toutes les 20 secondes pour le "temps réel"
    const interval = setInterval(fetchNotifs, 20000);
    return () => clearInterval(interval);
  }, []);

  // Fermeture en cliquant dehors
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const unread = notifs.filter(n => !n.lu).length;
  const hints = user ? getRoleHints(user.role) : [];

  const markRead = async (id: number) => {
    await api.post(`/notifications/${id}/marquer_lue/`).catch(() => null);
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, lu: true } : n));
  };

  const markAllRead = async () => {
    const unreadList = notifs.filter(n => !n.lu);
    await Promise.all(unreadList.map(n => api.post(`/notifications/${n.id}/marquer_lue/`).catch(() => null)));
    setNotifs(prev => prev.map(n => ({ ...n, lu: true })));
  };

  return (
    <div className="notif-wrapper">
      {/* ── Bouton cloche ── */}
      <button
        ref={btnRef}
        className={`notif-btn ${open ? 'notif-btn--active' : ''}`}
        onClick={() => setOpen(v => !v)}
        aria-label="Notifications"
        title="Notifications"
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="notif-badge">{unread > 9 ? '9+' : unread}</span>
        )}
      </button>

      {/* ── Panneau déroulant ── */}
      {open && (
        <div ref={panelRef} className="notif-panel">
          {/* En-tête */}
          <div className="notif-panel-header">
            <div>
              <span className="notif-panel-title">Notifications</span>
              {unread > 0 && (
                <span className="notif-count-badge">{unread} non lue{unread > 1 ? 's' : ''}</span>
              )}
            </div>
            <div className="notif-panel-header-actions">
              {unread > 0 && (
                <button className="notif-btn-text" onClick={markAllRead} title="Tout marquer comme lu">
                  <CheckCheck size={16} /> Tout lire
                </button>
              )}
              <button className="notif-close" onClick={() => setOpen(false)}>
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="notif-panel-body">
            {/* ── Notifications API ── */}
            {notifs.length > 0 && (
              <div className="notif-section-label">Activité récente</div>
            )}
            {notifs.length === 0 && (
              <div className="notif-empty">
                <Bell size={36} className="notif-empty-bell" />
                <p>Aucune notification</p>
              </div>
            )}
            {notifs.map(n => (
              <div
                key={n.id}
                className={`notif-item ${!n.lu ? 'notif-item--unread' : ''}`}
                onClick={() => !n.lu && markRead(n.id)}
              >
                <NotifIcon text={n.description} />
                <div className="notif-item-body">
                  <p className="notif-item-text">{n.description}</p>
                  {!n.lu && <span className="notif-new-dot" />}
                </div>
              </div>
            ))}

            {/* ── Conseils selon le rôle ── */}
            {hints.length > 0 && (
              <>
                <div className="notif-section-label" style={{ marginTop: notifs.length ? '16px' : 0 }}>
                  Infos · {user?.role_display}
                </div>
                {hints.map((h, i) => (
                  <div key={i} className="notif-hint">
                    <Info size={14} className="notif-hint-icon" />
                    <span>{h}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
