import BaseAPIService from './api-service';
import type { 
	ProviderMetadata, 
	ProviderValidationResult, 
	NotificationMessage,
	TestNotificationResponse 
} from '$lib/types/notification.type';
import { environmentStore } from '$lib/stores/environment.store.svelte';

export interface ProviderSchema {
	[key: string]: {
		Name: string;
		DisplayName: string;
		Type: string;
		Required: boolean;
		Description: string;
		Example: string;
	};
}

export interface BatchNotificationRequest {
	messages: NotificationMessage[];
	providerConfigs: Record<string, any>;
}

export default class AppriseService extends BaseAPIService {
	async getAllProviders(environmentId?: string): Promise<ProviderMetadata[]> {
		const envId = environmentId || (await environmentStore.getCurrentEnvironmentId());
		const res = await this.api.get(`/environments/${envId}/notifications/providers`);
		return res.data;
	}

	async getProviderSchema(provider: string, environmentId?: string): Promise<ProviderSchema> {
		const envId = environmentId || (await environmentStore.getCurrentEnvironmentId());
		const res = await this.api.get(`/environments/${envId}/notifications/providers/${provider}/schema`);
		return res.data;
	}

	async validateProvider(provider: string, config: any, environmentId?: string): Promise<ProviderValidationResult> {
		const envId = environmentId || (await environmentStore.getCurrentEnvironmentId());
		const res = await this.api.post(`/environments/${envId}/notifications/providers/${provider}/validate`, config);
		return res.data;
	}

	async testProvider(provider: string, config: any, environmentId?: string): Promise<TestNotificationResponse> {
		const envId = environmentId || (await environmentStore.getCurrentEnvironmentId());
		// Wrap config in the expected structure: { config: {...} }
		const res = await this.api.post(`/environments/${envId}/notifications/providers/${provider}/test`, { config });
		return this.handleResponse(res);
	}

	async sendBatchNotification(request: BatchNotificationRequest, environmentId?: string): Promise<any> {
		const envId = environmentId || (await environmentStore.getCurrentEnvironmentId());
		const res = await this.api.post(`/environments/${envId}/notifications/batch`, request);
		return this.handleResponse(res);
	}

	async getNotificationLogs(environmentId?: string, page = 1, limit = 50): Promise<any> {
		const envId = environmentId || (await environmentStore.getCurrentEnvironmentId());
		const res = await this.api.get(`/environments/${envId}/notifications/logs?page=${page}&limit=${limit}`);
		return res.data;
	}

	// Helper methods for common provider types
	getProviderByCategory(providers: ProviderMetadata[], category: string): ProviderMetadata[] {
		return providers.filter(provider => provider.Category === category);
	}

	getProviderByName(providers: ProviderMetadata[], name: string): ProviderMetadata | undefined {
		return providers.find(provider => provider.Name === name);
	}

	isProviderEnabled(provider: ProviderMetadata): boolean {
		return provider.Enabled !== false;
	}

	// Validation helpers
	validateRequiredFields(config: any, schema: ProviderSchema): { valid: boolean; errors: string[] } {
		const errors: string[] = [];
		
		for (const [field, definition] of Object.entries(schema)) {
			if (definition.Required && (!config[field] || config[field] === '')) {
				errors.push(`${definition.DisplayName} is required`);
			}
		}

		return {
			valid: errors.length === 0,
			errors
		};
	}

	// Provider type checking
	isEmailProvider(provider: string): boolean {
		const emailProviders = ['email', 'smtp', 'gmail', 'outlook', 'sendgrid', 'mailgun'];
		return emailProviders.includes(provider.toLowerCase());
	}

	isChatProvider(provider: string): boolean {
		const chatProviders = ['discord', 'slack', 'teams', 'telegram', 'whatsapp', 'signal', 'matrix', 'rocket', 'mattermost', 'zulip'];
		return chatProviders.includes(provider.toLowerCase());
	}

	isPushProvider(provider: string): boolean {
		const pushProviders = ['pushbullet', 'pushover', 'prowl', 'apprise'];
		return pushProviders.includes(provider.toLowerCase());
	}

	// Webhook URL validation
	validateWebhookURL(url: string, provider: string): { valid: boolean; error?: string } {
		if (!url) {
			return { valid: false, error: 'Webhook URL is required' };
		}

		try {
			const parsed = new URL(url);
			
			// Discord webhook validation
			if (provider.toLowerCase() === 'discord') {
				if (!parsed.hostname.includes('discord.com') && !parsed.hostname.includes('discordapp.com')) {
					return { valid: false, error: 'Must be a valid Discord webhook URL' };
				}
				if (!parsed.pathname.startsWith('/api/webhooks/')) {
					return { valid: false, error: 'Invalid Discord webhook path' };
				}
			}

			if (parsed.protocol !== 'https:') {
				return { valid: false, error: 'Webhook URL must use HTTPS' };
			}

			return { valid: true };
		} catch {
			return { valid: false, error: 'Invalid URL format' };
		}
	}

	// Email validation
	validateEmailAddress(email: string): boolean {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		return emailRegex.test(email);
	}
}

export const appriseService = new AppriseService();