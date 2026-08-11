// frontend/src/services/api.js
const envApiUrl = (process.env.REACT_APP_API_URL || '').trim().replace(/\/+$/, '');
const defaultApiUrl = 'https://backend-cesun-e65n9xsnq-crvcks-projects.vercel.app';
//const defaultApiUrl = 'http://localhost:3000';
const API_ROOT_URL = envApiUrl || defaultApiUrl;
const API_BASE_URL = `${API_ROOT_URL}/api`;

class ApiService {
  static getToken() {
    return localStorage.getItem('token');
  }

  static getHeaders() {
    const token = this.getToken();
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
  }

  static async request(url, options = {}) {
    const { method = 'GET', data } = options;
    
    const config = {
      method,
      headers: this.getHeaders(),
      credentials: 'include' // Importante para cookies si las usas
    };
    
    if (data) {
      config.body = JSON.stringify(data);
    }
    
    try {
      console.log("ApiService.request sending:", { method, url: `${API_BASE_URL}${url}`, headers: this.getHeaders(), data });
      const response = await fetch(`${API_BASE_URL}${url}`, config);
      console.log("ApiService.request raw response:", { status: response.status, statusText: response.statusText });
      return this.handleResponse(response);
    } catch (error) {
      console.error('ApiService.request fetch error:', error);
      throw error;
    }
  }

  static async get(url) {
    return this.request(url);
  }

  static async post(url, data) {
    console.log("ApiService.post called:", { url, data });
    return this.request(url, { method: 'POST', data });
  }

  static async put(url, data) {
    return this.request(url, { method: 'PUT', data });
  }

  static async delete(url) {
    return this.request(url, { method: 'DELETE' });
  }

  static async handleResponse(response) {
      console.log("ApiService.handleResponse called:", { status: response.status, statusText: response.statusText, contentType: response.headers.get('content-type') });
      // Primero verificar si hay contenido
      if (response.status === 204 || response.status === 205) {
          return {};
      }
      
      const contentType = response.headers.get('content-type');
      
      // IMPORTANTE: Si es CSV, devolver como texto sin parsear como JSON
      if (contentType && contentType.includes('text/csv')) {
          const text = await response.text();
          console.log("ApiService.handleResponse CSV response:", text.substring(0, 200));
          
          if (!response.ok) {
              throw new Error(text || `HTTP error! status: ${response.status}`);
          }
          
          // Para CSV, devolvemos el texto directamente
          return text;
      }
      
      // Si no es CSV, verificar si es JSON
      if (!contentType || !contentType.includes('application/json')) {
          const text = await response.text();
          console.log("ApiService.handleResponse non-JSON response:", text);
          
          if (!response.ok) {
              throw new Error(text || `HTTP error! status: ${response.status}`);
          }
          
          // Intentar parsear como JSON si es posible
          try {
              return text ? JSON.parse(text) : {};
          } catch {
              return text;
          }
      }
      
      // Si es JSON, parsearlo normalmente
      const data = await response.json();
      console.log("ApiService.handleResponse JSON data:", data);
      
      if (!response.ok) {
          const errorMessage = data.message || data.error || `HTTP error! status: ${response.status}`;
          console.log("ApiService.handleResponse throwing error:", errorMessage);
          const error = new Error(errorMessage);
          error.status = response.status;
          error.data = data;
          throw error;
      }
      
      return data;
  }

  // ----------------------------------------------------
  // Métodos específicos para el dashboard
  // ----------------------------------------------------
  
  static async getDashboardCoordinador() {
    return this.get('/dashboard/coordinador');
  }

  static async getMetricasGlobales(periodo = 'mes') {
    return this.get(`/dashboard/metricas-globales?periodo=${periodo}`);
  }

  // --- NUEVA FUNCIÓN AGREGADA ---
  static async aprobarSolicitud(solicitudId, rolAsignado) {
    // Esto llamará a POST ${API_BASE_URL}/dashboard/aprobar-solicitud
    return this.post('/dashboard/aprobar-solicitud', { 
        solicitudId, 
        rolAsignado 
    });
  }

  static async getEstadisticas() {
    return this.get('/estadisticas/generales');
  }

  // Método para obtener información del usuario actual
  static async getCurrentUser() {
    return this.get('/auth/me');
  }
}

export default ApiService;
