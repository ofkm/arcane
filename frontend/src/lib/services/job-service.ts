import BaseAPIService from './api-service';
import type { Job, JobStats, JobListFilters } from '$lib/types/job.type';
import type { SearchPaginationSortRequest, Paginated } from '$lib/types/pagination.type';
import { transformPaginationParams } from '$lib/utils/params.util';

export class JobService extends BaseAPIService {
	async getJobs(options?: SearchPaginationSortRequest & JobListFilters): Promise<Paginated<Job>> {
		const params = {
			...transformPaginationParams(options),
			...(options?.status && { status: options.status }),
			...(options?.type && { type: options.type }),
			...(options?.userId && { user_id: options.userId })
		};
		const res = await this.api.get('/jobs', { params });
		const responseData = res.data.data;
		return {
			data: responseData.jobs || [],
			pagination: {
				totalPages: Math.ceil((responseData.total || 0) / (responseData.limit || 50)),
				totalItems: responseData.total || 0,
				currentPage: Math.floor((responseData.offset || 0) / (responseData.limit || 50)) + 1,
				itemsPerPage: responseData.limit || 50
			}
		};
	}

	async getJob(jobId: number): Promise<Job> {
		return this.handleResponse(this.api.get(`/jobs/${jobId}`));
	}

	async cancelJob(jobId: number): Promise<{ message: string }> {
		return this.handleResponse(this.api.post(`/jobs/${jobId}/cancel`));
	}

	async getStats(): Promise<JobStats> {
		return this.handleResponse(this.api.get('/jobs/stats'));
	}
}

export const jobService = new JobService();
