import BaseAPIService from './api-service';
import type { ProjectSettings, ProjectSettingsUpdate } from '$lib/types/project-settings.type';
import { environmentStore } from '$lib/stores/environment.store.svelte';

export default class ProjectSettingsService extends BaseAPIService {
	async getProjectSettings(projectId: string): Promise<ProjectSettings> {
		const envId = await environmentStore.getCurrentEnvironmentId();
		const res = await this.api.get(`/environments/${envId}/projects/${projectId}/settings`);
		return res.data;
	}

	async updateProjectSettings(projectId: string, updates: ProjectSettingsUpdate): Promise<ProjectSettings> {
		const envId = await environmentStore.getCurrentEnvironmentId();
		const res = await this.api.put(`/environments/${envId}/projects/${projectId}/settings`, updates);
		return res.data;
	}

	async deleteProjectSettings(projectId: string): Promise<void> {
		const envId = await environmentStore.getCurrentEnvironmentId();
		await this.api.delete(`/environments/${envId}/projects/${projectId}/settings`);
	}
}

export const projectSettingsService = new ProjectSettingsService();
