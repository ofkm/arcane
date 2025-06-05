import { B as BaseAPIService } from './api-service-DMPLrOP8.js';

class NetworkAPIService extends BaseAPIService {
  async remove(id) {
    const res = await this.api.delete(`/networks/${id}`);
    return res.data;
  }
  async create(options) {
    const res = await this.api.post(`/networks/create`, options);
    return res.data;
  }
}

export { NetworkAPIService as N };
//# sourceMappingURL=network-api-service-DVGaoYql.js.map
