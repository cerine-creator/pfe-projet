import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api/';

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
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
};

export const fetchEmployees = async () => {
  const response = await api.get<Employe[]>('employes/');
  return response.data;
};

export const fetchMyTeam = async () => {
  const response = await api.get<Employe[]>('employes/');
  return response.data;
};

export default api;