import { B as BaseAPIService } from "./api-service.js";
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
export {
  NetworkAPIService as N
};
