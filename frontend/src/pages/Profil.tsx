import { useAuth } from '../context/AuthContext';
import { User, Mail, Shield, Building, Hash } from 'lucide-react';
import './profil.css';

export default function Profil() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="profil-page">
      <h1 className="profil-title">Mon <span className="text-primary">Compte</span></h1>

      <div className="profil-grid">
        
        {/* --- CARD PHOTO --- */}
        <div className="card-minimal photo-card">
           <div className="avatar-circle">
              <User size={60} />
           </div>
           <h3 className="user-name-heading">{user.first_name} {user.last_name}</h3>
           <p className="user-role-text">{user.role_display}</p>
           
           <div className="card-divider-section">
              <button className="nav-item edit-profile-btn">Modifier le profil</button>
           </div>
        </div>

        {/* --- CARD INFOS --- */}
        <div className="card-minimal info-card">
           <h3 className="info-card-title">Informations Professionnelles</h3>
           
           <div className="info-rows">
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
    <div className="info-row">
       <div className="info-row-icon">{icon}</div>
       <div>
         <span className="info-row-label">{label}</span>
         <strong className="info-row-value">{val}</strong>
       </div>
    </div>
  );
}
