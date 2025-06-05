import { B as BaseAPIService } from "./api-service.js";
class UserAPIService extends BaseAPIService {
  async update(id, user) {
    const res = await this.api.put(`/users/${id}`, user);
    return res.data;
  }
  async create(user) {
    const res = await this.api.post(`/users`, user);
    return res.data;
  }
  async delete(id) {
    const res = await this.api.delete(`/users/${id}`);
    return res.data;
  }
}
export {
  UserAPIService as U
};
