import { B as BaseAPIService } from "./api-service.js";
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
export {
  VolumeAPIService as V
};
