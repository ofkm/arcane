import BaseAPIService from './api-service';
import type { GlobalVariablesResponse, UpdateGlobalVariablesRequest, Variable } from '$lib/types/variable.type';

export default class GlobalVariablesService extends BaseAPIService {
	async getGlobalVariables(): Promise<Variable[]> {
		const response = await this.handleResponse<GlobalVariablesResponse>(this.api.get('/global-variables'));
		return response.variables;
	}

	async updateGlobalVariables(variables: Variable[]): Promise<void> {
		const request: UpdateGlobalVariablesRequest = { variables };
		await this.handleResponse(this.api.put('/global-variables', request));
	}
}

export const globalVariablesService = new GlobalVariablesService();
