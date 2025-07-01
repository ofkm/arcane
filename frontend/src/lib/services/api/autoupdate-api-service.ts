import BaseAPIService from './api-service';
import type { 
    AutoUpdateCheck, 
    AutoUpdateResult, 
    AutoUpdateRecord, 
    AutoUpdateStatus 
} from '$lib/types/auto-update.type';

export default class AutoUpdateAPIService extends BaseAPIService {
    async checkForUpdates(options?: AutoUpdateCheck): Promise<AutoUpdateResult> {
        const response = await this.api.post('/updates/check', options || {});
        return response.data;
    }

    async checkContainers(): Promise<AutoUpdateResult> {
        const response = await this.api.post('/updates/check/containers');
        return response.data;
    }

    async checkStacks(): Promise<AutoUpdateResult> {
        const response = await this.api.post('/updates/check/compose');
        return response.data;
    }

    async getUpdateHistory(limit?: number): Promise<AutoUpdateRecord[]> {
        const params = limit ? { limit } : {};
        const response = await this.api.get('/updates/history', { params });
        return response.data.data;
    }

    async getUpdateStatus(): Promise<AutoUpdateStatus> {
        const response = await this.api.get('/updates/status');
        return response.data.data;
    }

    async dryRun(type: 'containers' | 'stacks' | 'all' = 'all'): Promise<AutoUpdateResult> {
        const response = await this.api.post('/updates/check', {
            type,
            dryRun: true
        });
        return response.data;
    }
}
