import BaseAPIService from './api-service';
import type {
	PaginationRequest,
	SortRequest,
	PaginatedApiResponse,
	SearchPaginationSortRequest,
	Paginated
} from '$lib/types/pagination.type';
import type { Event, CreateEvent } from '$lib/types/event.type';

export default class EventAPIService extends BaseAPIService {
	async list(filters?: Record<string, string>) {
		return this.handleResponse(this.api.get('/events', { params: { filters } }));
	}

	async getEvents(options?: SearchPaginationSortRequest): Promise<Paginated<Event>> {
		const res = await this.api.get('/events', { params: options });
		return res.data;
	}

	async listPaginated(
		pagination?: PaginationRequest,
		sort?: SortRequest,
		search?: string,
		filters?: Record<string, string>
	): Promise<PaginatedApiResponse<Event>> {
		const params: any = {};
		if (pagination) {
			params['pagination[page]'] = pagination.page;
			params['pagination[limit]'] = pagination.limit;
		}
		if (sort) {
			params['sort[column]'] = sort.column;
			params['sort[direction]'] = sort.direction;
		}
		if (search) params.search = search;
		if (filters) {
			Object.entries(filters).forEach(([key, value]) => {
				if (value !== undefined && value !== null && value !== '') params[key] = value;
			});
		}
		const res = await this.api.get('/events', { params });
		return res.data as PaginatedApiResponse<Event>;
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
