//This file replaces errors.ts

export enum ApiErrorCode {
	VALIDATION_ERROR = 'VALIDATION_ERROR',
	NOT_FOUND = 'NOT_FOUND',
	DOCKER_API_ERROR = 'DOCKER_API_ERROR',
	CONFLICT = 'CONFLICT',
	BAD_REQUEST = 'BAD_REQUEST',
	INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
	UNAUTHORIZED = 'UNAUTHORIZED',
	FORBIDDEN = 'FORBIDDEN'
}

export interface ApiErrorResponse {
	success: false;
	error: string;
	code: ApiErrorCode;
	failedCount?: number;
	details?: unknown;
}
