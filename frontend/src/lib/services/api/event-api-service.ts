import BaseAPIService from './api-service';
import type {
	PaginationRequest,
	SortRequest,
	PaginatedApiResponse
} from '$lib/types/pagination.type';
import type { Event, CreateEvent } from '$lib/types/event.type';

export default class EventAPIService extends BaseAPIService {
	async list(filters?: Record<string, string>) {
		return this.handleResponse(this.api.get('/events', { params: { filters } }));
	}

	async getEvents(
		pagination?: PaginationRequest,
		sort?: SortRequest,
		search?: string,
		filters?: Record<string, string>
	): Promise<PaginatedApiResponse<Event>> {
		const params: any = {};

		if (pagination) {
			params.page = pagination.page;
			params.limit = pagination.limit;
		}

		if (sort) {
			params.column = sort.column;
			params.direction = sort.direction;
		}

		if (search) {
			params.search = search;
		}

		if (filters) {
			params.filters = filters;
		}

		return this.handleResponse(this.api.get('/events', { params }));
	}

	async listPaginated(
		pagination?: PaginationRequest,
		sort?: SortRequest,
		filters?: Record<string, string>
	): Promise<PaginatedApiResponse<Event>> {
		const params: any = {};

		if (pagination) {
			params.page = pagination.page;
			params.limit = pagination.limit;
		}

		if (sort) {
			params.column = sort.column;
			params.direction = sort.direction;
		}

		if (filters) {
			params.filters = filters;
		}

		return this.handleResponse(this.api.get('/events', { params }));
	}

	async listByEnvironmentPaginated(
		environmentId: string,
		pagination?: PaginationRequest,
		sort?: SortRequest,
		filters?: Record<string, string>
	): Promise<PaginatedApiResponse<Event>> {
		const params: any = {};

		if (pagination) {
			params.page = pagination.page;
			params.limit = pagination.limit;
		}

		if (sort) {
			params.column = sort.column;
			params.direction = sort.direction;
		}

		if (filters) {
			params.filters = filters;
		}

		return this.handleResponse(this.api.get(`/environments/${environmentId}/events`, { params }));
	}

	async get(id: string): Promise<Event> {
		return this.handleResponse(this.api.get(`/events/${id}`));
	}

	async create(event: CreateEvent): Promise<Event> {
		return this.handleResponse(this.api.post('/events', event));
	}

	async delete(id: string): Promise<void> {
		return this.handleResponse(this.api.delete(`/events/${id}`));
	}

	async deleteOldEvents(olderThanDays: number): Promise<void> {
		return this.handleResponse(
			this.api.delete('/events/cleanup', {
				params: { olderThanDays }
			})
		);
	}

	async getEventTypes(): Promise<string[]> {
		return this.handleResponse(this.api.get('/events/types'));
	}

	async getEventSeverities(): Promise<string[]> {
		return this.handleResponse(this.api.get('/events/severities'));
	}
}
