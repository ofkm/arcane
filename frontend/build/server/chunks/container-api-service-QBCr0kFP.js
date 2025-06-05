import { B as BaseAPIService } from './api-service-DMPLrOP8.js';

class ContainerAPIService extends BaseAPIService {
  async start(id) {
    const res = await this.api.post(`/containers/${id}/start`);
    return res.data;
  }
  async stop(id) {
    const res = await this.api.post(`/containers/${id}/stop`);
    return res.data;
  }
  async restart(id) {
    const res = await this.api.post(`/containers/${id}/restart`);
    return res.data;
  }
  async remove(id) {
    const res = await this.api.delete(`/containers/${id}/remove`);
    return res.data;
  }
  async pull(id) {
    const res = await this.api.post(`/containers/${id}/pull`);
    return res.data;
  }
  async startAll() {
    const res = await this.api.post(`/containers/start-all`);
    return res.data;
  }
  async stopAll() {
    const res = await this.api.post(`/containers/stop-all`);
    return res.data;
  }
  async create(config) {
    const res = await this.api.post("/containers", config);
    return res.data;
  }
  async list() {
    const res = await this.api.get("");
    return res.data;
  }
  async get(id) {
    const res = await this.api.get(`/containers/${id}`);
    return res.data;
  }
}

export { ContainerAPIService as C };
//# sourceMappingURL=container-api-service-QBCr0kFP.js.map
