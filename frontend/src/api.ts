import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api/';

const api = axios.create({
  baseURL: API_BASE_URL,
});

export interface Employe {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  matricule: string;
  role: string;
  service?: string;
  jours_conges_restants: number;
}

export const fetchEmployees = async () => {
    // For MVC: bypassing auth headers
    const response = await api.get<Employe[]>('employes/');
    return response.data;
};

export const fetchMyTeam = async () => {
    // Note: This endpoint normally requires auth and IsResponsable. 
    // We will bypass actual session auth for this frontend MVC mockup by just fetching all employees 
    // and filtering them in the frontend so we don't need complex JWT login yet.
    const response = await api.get<Employe[]>('employes/');
    return response.data;
};

export default api;
