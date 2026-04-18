import { useAuth } from '../context/AuthContext';
import { User, Mail, Shield, Building, Hash } from 'lucide-react';

export default function Profil() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div style={{maxWidth: '900px'}}>
      <h1 style={{fontSize: '2.5rem', fontWeight: 900, marginBottom: '40px'}}>Mon <span style={{color: 'var(--primary)'}}>Compte</span></h1>

      <div style={{display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px'}}>
        
        {/* --- CARD PHOTO --- */}
        <div className="card-minimal" style={{textAlign: 'center', padding: '40px 20px'}}>
           <div style={{width: '120px', height: '120px', borderRadius: '40px', background: 'var(--sidebar-active-bg)', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)'}}>
              <User size={60} />
           </div>
           <h3 style={{fontWeight: 900}}>{user.first_name} {user.last_name}</h3>
           <p style={{color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.9rem'}}>{user.role_display}</p>
           
           <div style={{marginTop: '30px', paddingTop: '30px', borderTop: '1px solid var(--border-color)'}}>
              <button className="nav-item" style={{width: '100%', justifyContent: 'center', background: 'var(--primary)', color: 'white'}}>Modifier le profil</button>
           </div>
        </div>

        {/* --- CARD INFOS --- */}
        <div className="card-minimal">
           <h3 style={{marginBottom: '30px', fontWeight: 800}}>Informations Professionnelles</h3>
           
           <div style={{display: 'grid', gap: '25px'}}>
              <InfoRow icon={<Mail />} label="Email Professionnel" val={user.email} />
              <InfoRow icon={<Hash />} label="Matricule Employé" val={user.employe_matricule || 'Sans Matricule'} />
              <InfoRow icon={<Building />} label="Structure / Département" val="Direction Ressources Humaines" />
              <InfoRow icon={<Shield />} label="Niveau d'Accès" val={user.role.toUpperCase()} />
           </div>
        </div>

      </div>
    </div>
  );
}

function InfoRow({icon, label, val}: any) {
  return (
    <div style={{display: 'flex', gap: '20px', alignItems: 'center'}}>
       <div style={{color: 'var(--primary)', opacity: 0.8}}>{icon}</div>
       <div>
         <span style={{fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block'}}>{label}</span>
         <strong style={{fontSize: '1.1rem'}}>{val}</strong>
       </div>
    </div>
  );
}
