import ApiService from './api';

const ConfiguracionService = {
  async obtenerTodas() {
    return ApiService.get('/configuracion');
  },

  async obtenerPorCategoria(categoria) {
    return ApiService.get(`/configuracion/${categoria}`);
  },

  async guardarCategoria(categoria, valores) {
    return ApiService.put(`/configuracion/${categoria}`, valores);
  },

  async guardarMultiples(payload) {
    return ApiService.put('/configuracion', payload);
  }
};

export default ConfiguracionService;
