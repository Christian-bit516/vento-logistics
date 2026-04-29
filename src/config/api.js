// Configuración centralizada de la API
// Si existe la variable de entorno VITE_API_URL (configurada en Vercel), se usa esa.
// De lo contrario, cae a localhost para desarrollo local.

let API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Si la URL no empieza con http, le añadimos https:// para evitar que el navegador la trate como ruta relativa
if (API_URL && !API_URL.startsWith('http')) {
  API_URL = `https://${API_URL}`;
}

// Eliminar barra final si existe
API_URL = API_URL.replace(/\/$/, '');

export default API_URL;
