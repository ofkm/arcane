import { B as BaseAPIService } from './api-service-DMPLrOP8.js';

class VolumeAPIService extends BaseAPIService {
  async remove(id) {
    const res = await this.api.delete(`/volumes/${id}`);
    return res.data;
  }
  async create(volume) {
    const res = await this.api.post("/volumes", volume);
    return res.data;
  }
}

export { VolumeAPIService as V };
//# sourceMappingURL=volume-api-service-B23LwP3S.js.map
