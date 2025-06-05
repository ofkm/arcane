import BaseAPIService from './api-service';
import type { ValidationResult } from '$lib/types/validation.type';

export default class ValidationAPIService extends BaseAPIService {
	async validateDockerCompose(content: string): Promise<ValidationResult> {
		return this.handleResponse(this.api.post('/validate/docker-compose', { content }));
	}

	async validateEnvironmentFile(content: string): Promise<ValidationResult> {
		return this.handleResponse(this.api.post('/validate/env-file', { content }));
	}

	async validateStackName(name: string): Promise<ValidationResult> {
		return this.handleResponse(this.api.post('/validate/stack-name', { name }));
	}

	async validatePort(port: number): Promise<ValidationResult> {
		return this.handleResponse(this.api.post('/validate/port', { port }));
	}
}
