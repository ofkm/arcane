import BaseAPIService from './api-service';

export interface ImageUpdateData {
    hasUpdate: boolean;
    updateType: string;
    currentVersion: string;
    latestVersion?: string;
    currentDigest?: string;
    latestDigest?: string;
    checkTime: string;
    responseTimeMs: number;
    error?: string;
}

export interface ImageUpdateSummary {
    totalImages: number;
    imagesWithUpdates: number;
    digestUpdates: number;
    tagUpdates: number;
    errorsCount: number;
}

export interface ImageVersions {
    imageRef: string;
    current: string;
    versions: string[];
    latest?: string;
}

export interface VersionComparison {
    currentVersion: string;
    targetVersion: string;
    isNewer: boolean;
    updateType: string;
    changeLevel: string;
}

export interface BatchImageUpdateRequest {
    imageRefs: string[];
}

export interface CompareVersionRequest {
    currentVersion: string;
    targetVersion: string;
    imageRef: string;
}

export default class ImageUpdateAPIService extends BaseAPIService {
    async checkImageUpdate(imageRef: string): Promise<ImageUpdateData> {
        const res = await this.api.get(`/image-updates/check?imageRef=${encodeURIComponent(imageRef)}`);
        return this.handleResponse(res.data);
    }

    async checkImageUpdateByID(imageId: string): Promise<ImageUpdateData> {
        const res = await this.api.get(`/image-updates/check/${imageId}`);
        return this.handleResponse(res.data);
    }

    async checkMultipleImages(imageRefs: string[]): Promise<Record<string, ImageUpdateData>> {
        const res = await this.api.post('/image-updates/check-batch', { imageRefs });
        return this.handleResponse(res.data);
    }

    async checkAllImages(limit: number = 50): Promise<Record<string, ImageUpdateData>> {
        const res = await this.api.get(`/image-updates/check-all?limit=${limit}`);
        return this.handleResponse(res.data);
    }

    async getUpdateSummary(): Promise<ImageUpdateSummary> {
        const res = await this.api.get('/image-updates/summary');
        return this.handleResponse(res.data);
    }

    async getImageVersions(imageRef: string, limit: number = 20): Promise<ImageVersions> {
        const res = await this.api.get(`/image-updates/versions?imageRef=${encodeURIComponent(imageRef)}&limit=${limit}`);
        return this.handleResponse(res.data);
    }

    async compareVersions(request: CompareVersionRequest): Promise<VersionComparison> {
        const res = await this.api.post('/image-updates/compare', request);
        return this.handleResponse(res.data);
    }
}