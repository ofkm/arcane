import BaseAPIService from './api-service';
import { get } from 'svelte/store';
import { environmentStore, LOCAL_DOCKER_ENVIRONMENT_ID } from '$lib/stores/environment.store';
import type { ContainerCreateOptions, NetworkCreateOptions, VolumeCreateOptions, ContainerStats } from 'dockerode';
import type { Stack, StackService } from '$lib/models/stack.type';
import type { PaginationRequest, SortRequest, PaginatedApiResponse } from '$lib/types/pagination.type';
import { browser } from '$app/environment';
import type { EnhancedImageInfo } from '$lib/models/image.type';
import type { EnhancedContainerInfo } from '$lib/models/container-info';

export class EnvironmentAPIService extends BaseAPIService {
    private async getCurrentEnvironmentId(): Promise<string> {
        if (browser) {
            await environmentStore.ready;
        }
        const currentEnvironment = get(environmentStore.selected);
        if (!currentEnvironment) {
            return LOCAL_DOCKER_ENVIRONMENT_ID;
        }
        return currentEnvironment.id;
    }

    async getContainers(
        pagination?: PaginationRequest,
        sort?: SortRequest,
        search?: string,
        filters?: Record<string, string>
    ): Promise<any[] | PaginatedApiResponse<any>> {
        const envId = await this.getCurrentEnvironmentId();
        
        if (!pagination) {
            const response = await this.handleResponse<{ containers?: EnhancedContainerInfo[] }>(this.api.get(`/environments/${envId}/containers`));
            return Array.isArray(response.containers) ? response.containers : Array.isArray(response) ? response : [];
        }

        const params: any = {
            'pagination[page]': pagination.page,
            'pagination[limit]': pagination.limit
        };

        if (sort) {
            params['sort[column]'] = sort.column;
            params['sort[direction]'] = sort.direction;
        }

        if (search) {
            params.search = search;
        }

        if (filters) {
            Object.entries(filters).forEach(([key, value]) => {
                params[key] = value;
            });
        }

        return this.handleResponse(this.api.get(`/environments/${envId}/containers`, { params }));
    }

    async getContainer(containerId: string): Promise<any> {
        const envId = await this.getCurrentEnvironmentId();
        return this.handleResponse(this.api.get(`/environments/${envId}/containers/${containerId}`));
    }

    async startContainer(containerId: string): Promise<any> {
        const envId = await this.getCurrentEnvironmentId();
        return this.handleResponse(this.api.post(`/environments/${envId}/containers/${containerId}/start`));
    }

    async createContainer(options: ContainerCreateOptions): Promise<any> {
        const envId = await this.getCurrentEnvironmentId();
        return this.handleResponse(this.api.post(`/environments/${envId}/containers`, options));
    }

    async getContainerStats(containerId: string, stream: boolean = false): Promise<ContainerStats> {
        const envId = await this.getCurrentEnvironmentId();
        const url = `/environments/${envId}/containers/${containerId}/stats${stream ? '?stream=true' : ''}`;
        return this.handleResponse(this.api.get(url)) as Promise<ContainerStats>;
    }

    async stopContainer(containerId: string): Promise<any> {
        const envId = await this.getCurrentEnvironmentId();
        return this.handleResponse(this.api.post(`/environments/${envId}/containers/${containerId}/stop`));
    }

    async restartContainer(containerId: string): Promise<any> {
        const envId = await this.getCurrentEnvironmentId();
        return this.handleResponse(this.api.post(`/environments/${envId}/containers/${containerId}/restart`));
    }

    async deleteContainer(containerId: string): Promise<any> {
        const envId = await this.getCurrentEnvironmentId();
        return this.handleResponse(this.api.delete(`/environments/${envId}/containers/${containerId}`));
    }

    async pullContainerImage(containerId: string): Promise<Stack> {
        const envId = await this.getCurrentEnvironmentId();
        return this.handleResponse(this.api.post(`/environments/${envId}/containers/${containerId}/pull`));
    }

    async getImages(
        pagination?: PaginationRequest,
        sort?: SortRequest,
        search?: string,
        filters?: Record<string, string>
    ): Promise<any[] | PaginatedApiResponse<any>> {
        const envId = await this.getCurrentEnvironmentId();
        
        if (!pagination) {
            const response = await this.handleResponse<{ images?: EnhancedImageInfo[] }>(this.api.get(`/environments/${envId}/images`));
            return Array.isArray(response.images) ? response.images : Array.isArray(response) ? response : [];
        }

        const params: any = {
            'pagination[page]': pagination.page,
            'pagination[limit]': pagination.limit
        };

        if (sort) {
            params['sort[column]'] = sort.column;
            params['sort[direction]'] = sort.direction;
        }

        if (search) {
            params.search = search;
        }

        if (filters) {
            params.filters = filters;
        }

        return this.handleResponse(this.api.get(`/environments/${envId}/images`, { params }));
    }

    async getImage(imageId: string): Promise<any> {
        const envId = await this.getCurrentEnvironmentId();
        return this.handleResponse(this.api.get(`/environments/${envId}/images/${imageId}`));
    }

    async pullImage(imageName: string, tag: string = 'latest', auth?: any): Promise<any> {
        const envId = await this.getCurrentEnvironmentId();
        return this.handleResponse(this.api.post(`/environments/${envId}/images/pull`, { imageName, tag, auth }));
    }

    async deleteImage(imageId: string, options?: { force?: boolean; noprune?: boolean }): Promise<void> {
        const envId = await this.getCurrentEnvironmentId();
        await this.handleResponse(this.api.delete(`/environments/${envId}/images/${imageId}`, { params: options }));
    }

    async pruneImages(filters?: Record<string, string>): Promise<any> {
        const envId = await this.getCurrentEnvironmentId();
        return this.handleResponse(this.api.post(`/environments/${envId}/images/prune`, { filters }));
    }

    async inspectImage(imageId: string): Promise<any> {
        const envId = await this.getCurrentEnvironmentId();
        return this.handleResponse(this.api.get(`/environments/${envId}/images/${imageId}/inspect`));
    }

    async searchImages(term: string, limit?: number): Promise<any> {
        const envId = await this.getCurrentEnvironmentId();
        return this.handleResponse(this.api.get(`/environments/${envId}/images/search`, { params: { term, limit } }));
    }

    async tagImage(imageId: string, repo: string, tag: string): Promise<any> {
        const envId = await this.getCurrentEnvironmentId();
        return this.handleResponse(this.api.post(`/environments/${envId}/images/${imageId}/tag`, { repo, tag }));
    }

    async getImageHistory(imageId: string): Promise<any> {
        const envId = await this.getCurrentEnvironmentId();
        return this.handleResponse(this.api.get(`/environments/${envId}/images/${imageId}/history`));
    }

    async getNetworks(
        pagination?: PaginationRequest,
        sort?: SortRequest,
        search?: string,
        filters?: Record<string, string>
    ): Promise<any[] | PaginatedApiResponse<any>> {
        const envId = await this.getCurrentEnvironmentId();
        
        if (!pagination) {
            const response = await this.handleResponse<{ networks?: any[] }>(this.api.get(`/environments/${envId}/networks`));
            return Array.isArray(response.networks) ? response.networks : Array.isArray(response) ? response : [];
        }

        const params: any = {
            'pagination[page]': pagination.page,
            'pagination[limit]': pagination.limit
        };

        if (sort) {
            params['sort[column]'] = sort.column;
            params['sort[direction]'] = sort.direction;
        }

        if (search) {
            params.search = search;
        }

        if (filters) {
            Object.entries(filters).forEach(([key, value]) => {
                params[key] = value;
            });
        }

        return this.handleResponse(this.api.get(`/environments/${envId}/networks`, { params }));
    }

    async getNetwork(networkId: string): Promise<any> {
        const envId = await this.getCurrentEnvironmentId();
        return this.handleResponse(this.api.get(`/environments/${envId}/networks/${networkId}`));
    }

    async createNetwork(options: NetworkCreateOptions): Promise<any> {
        const envId = await this.getCurrentEnvironmentId();
        return this.handleResponse(this.api.post(`/environments/${envId}/networks`, options));
    }

    async deleteNetwork(networkId: string): Promise<any> {
        const envId = await this.getCurrentEnvironmentId();
        return this.handleResponse(this.api.delete(`/environments/${envId}/networks/${networkId}`));
    }

    async getVolumes(
        pagination?: PaginationRequest,
        sort?: SortRequest,
        search?: string,
        filters?: Record<string, string>
    ): Promise<any[] | PaginatedApiResponse<any>> {
        const envId = await this.getCurrentEnvironmentId();
        
        if (!pagination) {
            const response = await this.handleResponse<{ volumes?: any[] }>(this.api.get(`/environments/${envId}/volumes`));
            return Array.isArray(response.volumes) ? response.volumes : Array.isArray(response) ? response : [];
        }

        const params: any = {
            'pagination[page]': pagination.page,
            'pagination[limit]': pagination.limit
        };

        if (sort) {
            params['sort[column]'] = sort.column;
            params['sort[direction]'] = sort.direction;
        }

        if (search) {
            params.search = search;
        }

        if (filters) {
            Object.entries(filters).forEach(([key, value]) => {
                params[key] = value;
            });
        }

        return this.handleResponse(this.api.get(`/environments/${envId}/volumes`, { params }));
    }

    async getVolume(volumeName: string): Promise<any> {
        const envId = await this.getCurrentEnvironmentId();
        return this.handleResponse(this.api.get(`/environments/${envId}/volumes/${volumeName}`));
    }

    async getVolumeUsage(volumeName: string): Promise<any> {
        const envId = await this.getCurrentEnvironmentId();
        return this.handleResponse(this.api.get(`/environments/${envId}/volumes/${volumeName}/usage`));
    }

    async createVolume(options: VolumeCreateOptions): Promise<any> {
        const envId = await this.getCurrentEnvironmentId();
        return this.handleResponse(this.api.post(`/environments/${envId}/volumes`, options));
    }

    async deleteVolume(volumeName: string): Promise<any> {
        const envId = await this.getCurrentEnvironmentId();
        return this.handleResponse(this.api.delete(`/environments/${envId}/volumes/${volumeName}`));
    }

    async pruneVolumes(): Promise<any> {
        const envId = await this.getCurrentEnvironmentId();
        return this.handleResponse(this.api.post(`/environments/${envId}/volumes/prune`));
    }

    async getAllResources(): Promise<Record<string, any>> {
        const [containers, images, networks, volumes] = await Promise.all([this.getContainers(), this.getImages(), this.getNetworks(), this.getVolumes()]);

        return {
            containers,
            images,
            networks,
            volumes
        };
    }

    async syncResources(): Promise<void> {
        const envId = await this.getCurrentEnvironmentId();
        await this.handleResponse(this.api.post(`/environments/${envId}/sync`));
    }

    async executeDockerCommand(command: string, args: string[] = []): Promise<any> {
        const envId = await this.getCurrentEnvironmentId();
        return this.handleResponse(this.api.post(`/environments/${envId}/execute`, { command, args }));
    }

    async getStacks(
        pagination?: PaginationRequest,
        sort?: SortRequest,
        search?: string,
        filters?: Record<string, string>
    ): Promise<any[] | PaginatedApiResponse<any>> {
        const envId = await this.getCurrentEnvironmentId();
        
        if (!pagination) {
            const response = await this.handleResponse<{ stacks?: Stack[] }>(this.api.get(`/environments/${envId}/stacks`));
            return Array.isArray(response.stacks) ? response.stacks : Array.isArray(response) ? response : [];
        }

        const params: any = {
            'pagination[page]': pagination.page,
            'pagination[limit]': pagination.limit
        };

        if (sort) {
            params['sort[column]'] = sort.column;
            params['sort[direction]'] = sort.direction;
        }

        if (search) {
            params.search = search;
        }

        if (filters) {
            params.filters = filters;
        }

        return this.handleResponse(this.api.get(`/environments/${envId}/stacks`, { params }));
    }

    async getStack(stackName: string): Promise<Stack> {
        const envId = await this.getCurrentEnvironmentId();
        const response = await this.handleResponse<{ stack?: Stack; success?: boolean }>(this.api.get(`/environments/${envId}/stacks/${stackName}`));

        if (response.stack) {
            return response.stack;
        }

        return response as Stack;
    }

    async deployStack(stackName: string, composeContent: string, envContent?: string): Promise<Stack> {
        const envId = await this.getCurrentEnvironmentId();
        const payload = {
            name: stackName,
            composeContent,
            envContent
        };
        return this.handleResponse(this.api.post(`/environments/${envId}/stacks`, payload));
    }

    async updateStack(stackName: string, composeContent: string, envContent?: string): Promise<Stack> {
        const envId = await this.getCurrentEnvironmentId();
        const payload = {
            composeContent,
            envContent
        };
        return this.handleResponse(this.api.put(`/environments/${envId}/stacks/${stackName}`, payload));
    }

    async deleteStack(stackName: string): Promise<void> {
        const envId = await this.getCurrentEnvironmentId();
        await this.handleResponse(this.api.delete(`/environments/${envId}/stacks/${stackName}`));
    }

    async startStack(stackId: string): Promise<Stack> {
        const envId = await this.getCurrentEnvironmentId();
        return this.handleResponse(this.api.post(`/environments/${envId}/stacks/${stackId}/start`));
    }

    async stopStack(stackId: string): Promise<Stack> {
        const envId = await this.getCurrentEnvironmentId();
        return this.handleResponse(this.api.post(`/environments/${envId}/stacks/${stackId}/stop`));
    }

    async restartStack(stackId: string): Promise<Stack> {
        const envId = await this.getCurrentEnvironmentId();
        return this.handleResponse(this.api.post(`/environments/${envId}/stacks/${stackId}/restart`));
    }

    async getStackLogs(stackId: string): Promise<string> {
        const envId = await this.getCurrentEnvironmentId();
        const response = await this.handleResponse<{ logs?: string }>(this.api.get(`/environments/${envId}/stacks/${stackId}/logs`));
        return response.logs || '';
    }

    async deployStackWithOptions(stackId: string, options?: { profiles?: string[]; envOverrides?: Record<string, string> }): Promise<Stack> {
        const envId = await this.getCurrentEnvironmentId();
        return this.handleResponse(this.api.post(`/environments/${envId}/stacks/${stackId}/deploy`, options || {}));
    }

    async downStack(stackId: string): Promise<Stack> {
        const envId = await this.getCurrentEnvironmentId();
        return this.handleResponse(this.api.post(`/environments/${envId}/stacks/${stackId}/down`));
    }

    async redeployStack(stackId: string): Promise<Stack> {
        const envId = await this.getCurrentEnvironmentId();
        return this.handleResponse(this.api.post(`/environments/${envId}/stacks/${stackId}/redeploy`));
    }

    async pullStackImages(stackId: string): Promise<Stack> {
        const envId = await this.getCurrentEnvironmentId();
        return this.handleResponse(this.api.post(`/environments/${envId}/stacks/${stackId}/pull`));
    }

    async destroyStack(stackId: string, removeVolumes = false, removeFiles = false): Promise<void> {
        const envId = await this.getCurrentEnvironmentId();
        await this.handleResponse(
            this.api.delete(`/environments/${envId}/stacks/${stackId}/destroy`, {
                data: {
                    removeVolumes,
                    removeFiles
                }
            })
        );
    }

    async getStackServices(stackName: string): Promise<StackService[]> {
        const envId = await this.getCurrentEnvironmentId();
        return this.handleResponse(this.api.get(`/environments/${envId}/stacks/${stackName}/services`));
    }

    async getStackProfiles(stackName: string): Promise<string[]> {
        const envId = await this.getCurrentEnvironmentId();
        return this.handleResponse(this.api.get(`/environments/${envId}/stacks/${stackName}/profiles`));
    }

    async getStackChanges(stackName: string): Promise<any> {
        const envId = await this.getCurrentEnvironmentId();
        return this.handleResponse(this.api.get(`/environments/${envId}/stacks/${stackName}/changes`));
    }

    async getStackStats(stackName: string): Promise<ContainerStats[]> {
        const envId = await this.getCurrentEnvironmentId();
        return this.handleResponse(this.api.get(`/environments/${envId}/stacks/${stackName}/stats`)) as Promise<ContainerStats[]>;
    }

    async validateStack(stackName: string): Promise<{ valid: boolean; errors?: string[] }> {
        const envId = await this.getCurrentEnvironmentId();
        return this.handleResponse(this.api.get(`/environments/${envId}/stacks/${stackName}/validate`));
    }

    async convertDockerRun(command: string): Promise<{ composeContent: string }> {
        const envId = await this.getCurrentEnvironmentId();
        return this.handleResponse(this.api.post(`/environments/${envId}/stacks/convert`, { command }));
    }

    async discoverExternalStacks(): Promise<Stack[]> {
        const envId = await this.getCurrentEnvironmentId();
        return this.handleResponse(this.api.get(`/environments/${envId}/stacks/discover-external`));
    }

    async importStack(stackId: string, stackName?: string): Promise<Stack> {
        const envId = await this.getCurrentEnvironmentId();
        return this.handleResponse(
            this.api.post(`/environments/${envId}/stacks/import`, {
                stackId,
                stackName
            })
        );
    }

    async migrateStack(stackName: string): Promise<Stack> {
        const envId = await this.getCurrentEnvironmentId();
        return this.handleResponse(this.api.post(`/environments/${envId}/stacks/${stackName}/migrate`));
    }

    async getStackLogsStream(stackName: string): Promise<any> {
        const envId = await this.getCurrentEnvironmentId();
        return this.handleResponse(this.api.get(`/environments/${envId}/stacks/${stackName}/logs/stream`));
    }

    async getImageMaturity(imageId: string): Promise<any> {
        const envId = await this.getCurrentEnvironmentId();
        return this.handleResponse(this.api.get(`/environments/${envId}/images/${imageId}/maturity`));
    }

    async triggerMaturityCheck(imageIds?: string[]): Promise<{ success: boolean; message: string }> {
        const envId = await this.getCurrentEnvironmentId();
        const payload = imageIds && imageIds.length > 0 ? { imageIds } : {};
        return this.handleResponse(this.api.post(`/environments/${envId}/images/maturity/check`, payload));
    }
}

export const environmentAPI = new EnvironmentAPIService();
