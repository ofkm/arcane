//This file replaces errors.ts

export enum ApiErrorCode {
	NOT_FOUND = 'NOT_FOUND',
	BAD_REQUEST = 'BAD_REQUEST',
	UNAUTHORIZED = 'UNAUTHORIZED',
	FORBIDDEN = 'FORBIDDEN',
	INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
	SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
	VALIDATION_ERROR = 'VALIDATION_ERROR',
	DOCKER_API_ERROR = 'DOCKER_API_ERROR',
	CONFLICT = 'CONFLICT',
	REGISTRY_PUBLIC_ACCESS_ERROR = 'REGISTRY_PUBLIC_ACCESS_ERROR',
	REGISTRY_PRIVATE_ACCESS_ERROR = 'REGISTRY_PRIVATE_ACCESS_ERROR',
	REGISTRY_API_RATE_LIMIT = 'REGISTRY_API_RATE_LIMIT',
	REGISTRY_UNSUPPORTED = 'REGISTRY_UNSUPPORTED'
}

export interface ApiErrorResponse {
	success: false;
	error: string;
	code: ApiErrorCode;
	details?: any;
	failedCount?: number;
}

export class BaseError extends Error {
	constructor(message: string) {
		super(message);
		this.name = this.constructor.name;
		Error.captureStackTrace(this, this.constructor);
	}
}

export class NotFoundError extends BaseError {
	constructor(message: string) {
		super(message);
		// Object.setPrototypeOf(this, NotFoundError.prototype); might be needed here too.
		// However, the prompt is specific to the registry errors.
	}
}

export class DockerApiError extends BaseError {
	statusCode: number;

	constructor(message: string, statusCode: number) {
		super(message);
		this.statusCode = statusCode;
		// If targeting ES5 and BaseError directly extends Error,
		// Object.setPrototypeOf(this, DockerApiError.prototype); might be needed here too.
	}
}

export class RegistryRateLimitError extends BaseError {
	registry: string;
	repository: string;
	retryAfter?: Date;

	constructor(message: string, registry: string, repository: string, retryAfter?: Date) {
		super(message);
		this.registry = registry;
		this.repository = repository;
		this.retryAfter = retryAfter;
		Object.setPrototypeOf(this, RegistryRateLimitError.prototype);
	}
}

export class PublicRegistryError extends BaseError {
	registry: string;
	repository: string;
	statusCode?: number;

	constructor(message: string, registry: string, repository: string, statusCode?: number) {
		super(message);
		this.registry = registry;
		this.repository = repository;
		this.statusCode = statusCode;
		Object.setPrototypeOf(this, PublicRegistryError.prototype);
	}
}

export class PrivateRegistryError extends BaseError {
	registry: string;
	repository: string;
	statusCode?: number;

	constructor(message: string, registry: string, repository: string, statusCode?: number) {
		super(message);
		this.registry = registry;
		this.repository = repository;
		this.statusCode = statusCode;
		Object.setPrototypeOf(this, PrivateRegistryError.prototype);
	}
}
