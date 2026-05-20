import { useState, useEffect } from 'react';
import api from '../api/axiosConfig';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Shield, Building, Hash, Phone, Briefcase, Calendar, Tag } from 'lucide-react';
import './profil.css';

interface EmployeProfile {
  id: number;
  matricule: string | null;
  prenomEmpl: string;
  nomEmpl: string;
  numTel: string | null;
  dateRecrutement: string;
  categorie: string;
  categorie_display: string;
  structure_libelle: string;
  fonction_libelle: string;
  email: string;
  solde_affichage: number;
}

export default function Profil() {
  const { user } = useAuth();
  const [employe, setEmploye] = useState<EmployeProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<EmployeProfile>('/employes/me/')
      .then(res => setEmploye(res.data))
      .catch(() => setEmploye(null))
      .finally(() => setLoading(false));
  }, []);

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
          <h3 className="user-name-heading">
            {user.first_name || employe?.prenomEmpl ? `${user.first_name || employe?.prenomEmpl} ${user.last_name || employe?.nomEmpl}` : 'Utilisateur'}
          </h3>
          <p className="user-role-text">{user.role_display}</p>

          {!loading && employe && (
            <div className="solde-badge">
              <span className="solde-number">{employe.solde_affichage}</span>
              <span className="solde-label">jours de congé restants</span>
            </div>
          )}
        </div>

        {/* --- CARD INFOS --- */}
        <div className="card-minimal info-card">
          <h3 className="info-card-title">Informations Professionnelles</h3>

          {loading ? (
            <div className="profil-loading">Chargement des informations...</div>
          ) : (
            <div className="info-rows">
              <InfoRow icon={<Mail />} label="Email Professionnel" val={user.email} />
              <InfoRow
                icon={<Hash />}
                label="Matricule Employé"
                val={employe?.matricule || 'Non renseigné'}
              />
              <InfoRow
                icon={<Building />}
                label="Structure / Département"
                val={employe?.structure_libelle || 'Non renseigné'}
              />
              <InfoRow
                icon={<Briefcase />}
                label="Fonction"
                val={employe?.fonction_libelle || 'Non renseigné'}
              />
              <InfoRow
                icon={<Tag />}
                label="Catégorie"
                val={employe?.categorie_display || 'Non renseigné'}
              />
              <InfoRow
                icon={<Phone />}
                label="Téléphone"
                val={employe?.numTel || 'Non renseigné'}
              />
              <InfoRow
                icon={<Calendar />}
                label="Date de Recrutement"
                val={employe?.dateRecrutement
                  ? new Date(employe.dateRecrutement).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
                  : 'Non renseigné'
                }
              />
              <InfoRow
                icon={<Shield />}
                label="Niveau d'Accès"
                val={user.role_display}
              />
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

function InfoRow({ icon, label, val }: { icon: React.ReactNode; label: string; val: string }) {
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
