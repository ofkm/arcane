import { B as BaseAPIService } from './api-service-DMPLrOP8.js';

class ImageAPIService extends BaseAPIService {
  async remove(id) {
    const res = await this.api.delete(`/images/${id}`);
    return res.data;
  }
  async pull(imageRef, tag) {
    const encodedImageRef = encodeURIComponent(imageRef);
    const res = await this.api.post(`/images/pull/${encodedImageRef}`, { tag });
    return res.data;
  }
  async prune() {
    const res = await this.api.post(`/images/prune`);
    return res.data;
  }
  async checkMaturity(id) {
    const res = await this.api.get(`/images/${id}/maturity`);
    return res.data;
  }
  async checkMaturityBatch(imageIds) {
    if (!imageIds || imageIds.length === 0) {
      throw new Error("No image IDs provided for batch check");
    }
    const firstId = imageIds[0];
    const res = await this.api.post(`/images/${firstId}/maturity`, { imageIds });
    return res.data;
  }
  async list() {
    const res = await this.api.get("");
    return res.data;
  }
}

export { ImageAPIService as I };
//# sourceMappingURL=image-api-service-hks713bt.js.map
