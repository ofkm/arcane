import { B as BaseAPIService } from './api-service-DMPLrOP8.js';

class StackAPIService extends BaseAPIService {
  async deploy(id) {
    const res = await this.api.post(`/stacks/${id}/deploy`);
    return res.data;
  }
  async down(id) {
    const res = await this.api.post(`/stacks/${id}/down`);
    return res.data;
  }
  async restart(id) {
    const res = await this.api.post(`/stacks/${id}/restart`);
    return res.data;
  }
  async destroy(id, removeVolumes = false, removeFiles = false) {
    console.log("API service - removeVolumes:", removeVolumes, "removeFiles:", removeFiles);
    const queryParams = {
      removeVolumes: removeVolumes ? "true" : "false",
      removeFiles: removeFiles ? "true" : "false"
    };
    console.log("Query params:", queryParams);
    const res = await this.api.delete(`/stacks/${id}/destroy`, {
      params: queryParams
    });
    return res.data;
  }
  async redeploy(id) {
    const res = await this.api.post(`/stacks/${id}/redeploy`);
    return res.data;
  }
  async pull(id) {
    const res = await this.api.post(`/stacks/${id}/pull`);
    return res.data;
  }
  async import(id, name) {
    const res = await this.api.post("/stacks/import", {
      stackId: id,
      stackName: name || void 0
    });
    return res.data;
  }
  async save(id, name, content, envContent) {
    const res = await this.api.put(`/stacks/${id}`, {
      name,
      composeContent: content,
      envContent
    });
    return res.data;
  }
  async create(name, content, envContent) {
    const res = await this.api.post("/stacks/create", {
      name,
      composeContent: content,
      envContent: envContent || ""
    });
    return res.data;
  }
  async migrate(id) {
    const res = await this.api.post(`/stacks/${id}/migrate`);
    return res.data;
  }
  async list() {
    const res = await this.api.get("");
    return res.data;
  }
  async validate(id) {
    const res = await this.api.get(`/stacks/${id}/validate`);
    return res.data;
  }
  async convertDockerRun(dockerRunCommand) {
    const res = await this.api.post("/convert", {
      dockerRunCommand
    });
    return res.data;
  }
}

export { StackAPIService as S };
//# sourceMappingURL=stack-api-service-Dn9dYXBV.js.map
