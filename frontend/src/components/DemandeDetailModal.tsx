import { X, Download, Paperclip, FileText, ExternalLink } from 'lucide-react';

const BACKEND_URL = 'http://127.0.0.1:8000';

interface DemandeDetailModalProps {
  demande: any;
  onClose: () => void;
  canDownloadPDF?: boolean;
  onDownloadPDF?: (id: number) => void;
  showEmployee?: boolean;
}

export default function DemandeDetailModal({
  demande,
  onClose,
  canDownloadPDF = false,
  onDownloadPDF,
  showEmployee = false,
}: DemandeDetailModalProps) {
  const justificatifUrl = demande.justificatif_url
    ? demande.justificatif_url.startsWith('http')
      ? demande.justificatif_url
      : `${BACKEND_URL}${demande.justificatif_url}`
    : null;

  const isPdf = justificatifUrl?.toLowerCase().includes('.pdf');

  const badgeClass =
    demande.statut === 'approuvee'
      ? 'badge-success'
      : demande.statut === 'refusee'
      ? 'badge-danger'
      : demande.statut === 'expiree'
      ? 'badge-expired'
      : 'badge-pending';

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      }}
    >
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{
          backgroundColor: 'var(--surface)', borderRadius: '12px',
          width: '480px', maxWidth: '95%', maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '20px 24px 16px', borderBottom: '1px solid var(--border-color)',
        }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)' }}>
            Détails de la demande
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
            <X size={20} color="var(--text-muted)" />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '12px', color: 'var(--text-main)' }}>

          {/* Employee (for manager/RH views) */}
          {showEmployee && demande.employe_noms && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: 'var(--surface-2, rgba(255,255,255,0.05))', borderRadius: '8px' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>EMPLOYÉ</span>
              <span style={{ fontWeight: 600 }}>{demande.employe_noms}</span>
            </div>
          )}

          {/* Info grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <InfoRow label="Type" value={demande.type_conge_nom} />
            <InfoRow label="Durée" value={`${demande.duree} jour(s)`} />
            <InfoRow label="Du" value={demande.date_debut} />
            <InfoRow label="Au" value={demande.date_fin} />
            {demande.motif && <InfoRow label="Motif" value={demande.motif_display || demande.motif} fullWidth />}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Statut</span>
              <span className={`badge ${badgeClass}`} style={{ alignSelf: 'flex-start' }}>{demande.statut_display}</span>
            </div>
          </div>

          {/* Justificatif Section */}
          {justificatifUrl && (
            <div style={{
              marginTop: '8px', padding: '14px', borderRadius: '10px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--surface-2, rgba(255,255,255,0.03))',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>
                <Paperclip size={14} />
                JUSTIFICATIF JOINT
              </div>

              {isPdf ? (
                /* PDF: show embedded viewer */
                <div>
                  <iframe
                    src={justificatifUrl}
                    title="Justificatif PDF"
                    style={{ width: '100%', height: '300px', border: 'none', borderRadius: '6px', backgroundColor: '#fff' }}
                  />
                  <a
                    href={justificatifUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="justificatif-link"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '8px', color: 'var(--primary)', fontSize: '0.85rem', textDecoration: 'none' }}
                  >
                    <FileText size={14} /> Ouvrir en plein écran <ExternalLink size={12} />
                  </a>
                </div>
              ) : (
                /* Image: show inline */
                <div>
                  <a href={justificatifUrl} target="_blank" rel="noopener noreferrer">
                    <img
                      src={justificatifUrl}
                      alt="Justificatif"
                      style={{
                        width: '100%', maxHeight: '280px', objectFit: 'contain',
                        borderRadius: '6px', cursor: 'zoom-in',
                        border: '1px solid var(--border-color)',
                      }}
                    />
                  </a>
                  <p style={{ margin: '6px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Cliquer pour agrandir
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', justifyContent: 'flex-end', gap: '10px',
          padding: '16px 24px', borderTop: '1px solid var(--border-color)',
        }}>
          {canDownloadPDF && demande.statut === 'approuvee' && onDownloadPDF && (
            <button
              className="btn-primary"
              onClick={() => onDownloadPDF(demande.id)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <Download size={16} /> Titre de congé
            </button>
          )}
          <button className="btn-secondary" onClick={onClose}>Fermer</button>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, fullWidth }: { label: string; value: string; fullWidth?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', ...(fullWidth ? { gridColumn: '1 / -1' } : {}) }}>
      <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      <span style={{ fontWeight: 500, color: 'var(--text-main)' }}>{value}</span>
    </div>
  );
}
