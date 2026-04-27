import fs from 'fs';
import axios from 'axios';
import FormData from 'form-data';

async function run() {
  const api = axios.create({
    baseURL: 'http://127.0.0.1:8000/api',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const payload = new FormData();
  payload.append('exercice', '1');
  payload.append('type_conge', '3');
  payload.append('date_debut', '2026-04-27');
  payload.append('date_fin', '2026-04-30');
  
  // Create dummy file
  fs.writeFileSync('dummy.txt', 'hello');
  payload.append('justificatif_file', fs.createReadStream('dummy.txt'));

  try {
    const res = await api.post('/demandes/', payload, {
      headers: {
        ...payload.getHeaders() // Node.js form-data requires this
      }
    });
    console.log(res.status, res.data);
  } catch (err) {
    console.error(err.response?.status, err.response?.data);
  }
}

run();
