//This file replaces errors.ts

export enum ApiErrorCode {
	VALIDATION_ERROR = 'VALIDATION_ERROR',
	NOT_FOUND = 'NOT_FOUND',
	DOCKER_API_ERROR = 'DOCKER_API_ERROR',
	CONFLICT = 'CONFLICT',
	BAD_REQUEST = 'BAD_REQUEST',
	INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
	UNAUTHORIZED = 'UNAUTHORIZED',
	FORBIDDEN = 'FORBIDDEN',
	REGISTRY_PUBLIC_ACCESS_ERROR = 'REGISTRY_PUBLIC_ACCESS_ERROR',
	REGISTRY_PRIVATE_ACCESS_ERROR = 'REGISTRY_PRIVATE_ACCESS_ERROR',
	REGISTRY_API_RATE_LIMIT = 'REGISTRY_API_RATE_LIMIT',
	REGISTRY_UNSUPPORTED = 'REGISTRY_UNSUPPORTED'
}

export interface ApiErrorResponse {
	success: false;
	error: string;
	code: ApiErrorCode;
	failedCount?: number;
	details?: unknown;
}

export interface RegistryError extends Error {
	code: ApiErrorCode;
	status?: number;
	registry?: string;
	repository?: string;
}

export class PublicRegistryError extends Error implements RegistryError {
	code: ApiErrorCode;
	status?: number;
	registry?: string;
	repository?: string;

	constructor(message: string, registry?: string, repository?: string, status?: number) {
		super(message);
		this.name = 'PublicRegistryError';
		this.code = ApiErrorCode.REGISTRY_PUBLIC_ACCESS_ERROR;
		this.registry = registry;
		this.repository = repository;
		this.status = status;
	}
}

export class PrivateRegistryError extends Error implements RegistryError {
	code: ApiErrorCode;
	status?: number;
	registry?: string;
	repository?: string;

	constructor(message: string, registry?: string, repository?: string, status?: number) {
		super(message);
		this.name = 'PrivateRegistryError';
		this.code = ApiErrorCode.REGISTRY_PRIVATE_ACCESS_ERROR;
		this.registry = registry;
		this.repository = repository;
		this.status = status;
	}
}

export class RegistryRateLimitError extends Error implements RegistryError {
	code: ApiErrorCode;
	registry?: string;
	repository?: string;
	resetTime?: Date;

	constructor(message: string, registry?: string, repository?: string, resetTime?: Date) {
		super(message);
		this.name = 'RegistryRateLimitError';
		this.code = ApiErrorCode.REGISTRY_API_RATE_LIMIT;
		this.registry = registry;
		this.repository = repository;
		this.resetTime = resetTime;
	}
}
