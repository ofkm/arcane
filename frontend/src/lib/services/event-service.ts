import BaseAPIService from './api-service';
import type { SearchPaginationSortRequest, Paginated } from '$lib/types/pagination.type';
import type { Event } from '$lib/types/event.type';

export default class EventService extends BaseAPIService {
	async getEvents(options?: SearchPaginationSortRequest): Promise<Paginated<Event>> {
		const res = await this.api.get('/events', { params: options });
		return res.data;
	}

	async delete(id: string): Promise<void> {
		return this.handleResponse(this.api.delete(`/events/${id}`));
	}
}

export const eventService = new EventService();
