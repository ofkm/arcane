import axios from 'axios';

class BaseAPIService {
  api = axios.create({
    withCredentials: true
  });
  constructor() {
    this.api.defaults.baseURL = "/api";
  }
}

export { BaseAPIService as B };
//# sourceMappingURL=api-service-DMPLrOP8.js.map
