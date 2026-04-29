// Configuración centralizada de la API
// Si existe la variable de entorno VITE_API_URL (configurada en Vercel), se usa esa.
// De lo contrario, cae a localhost para desarrollo local.

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default API_URL;
