/**
 * Defines standard error codes for API responses.
 */
export const ApiErrorCode = {
	// Client-side errors (4xx)
	VALIDATION_ERROR: 'VALIDATION_ERROR', // Input data failed validation (400)
	UNAUTHENTICATED: 'UNAUTHENTICATED', // Missing or invalid authentication (401)
	FORBIDDEN: 'FORBIDDEN', // User does not have permission (403)
	NOT_FOUND: 'NOT_FOUND', // Resource not found (404)
	CONFLICT: 'CONFLICT', // Resource already exists or state conflict (409)
	BAD_REQUEST: 'BAD_REQUEST', // General bad request, often for config/state issues (400)

	// Server-side errors (5xx)
	DOCKER_API_ERROR: 'DOCKER_API_ERROR', // Error interacting with Docker daemon (500/503)
	SERVICE_ERROR: 'SERVICE_ERROR', // General error in backend service logic (500)
	INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR' // Unexpected server error (500)
} as const; // Use 'as const' for stricter typing

// Base Service Error
export class ServiceError extends Error {
	public readonly code: string;
	public readonly status: number;

	constructor(message: string, code: string = ApiErrorCode.SERVICE_ERROR, status: number = 500) {
		super(message);
		this.name = 'ServiceError';
		this.code = code;
		this.status = status;
		Object.setPrototypeOf(this, ServiceError.prototype);
	}
}

// Not Found Error
export class NotFoundError extends ServiceError {
	constructor(message: string = 'Resource not found') {
		super(message, ApiErrorCode.NOT_FOUND, 404);
		this.name = 'NotFoundError';
		Object.setPrototypeOf(this, NotFoundError.prototype);
	}
}

// Validation Error
export class ValidationError extends ServiceError {
	public readonly details?: Record<string, string> | string;

	constructor(message: string = 'Input validation failed', details?: Record<string, string> | string) {
		super(message, ApiErrorCode.VALIDATION_ERROR, 400);
		this.name = 'ValidationError';
		this.details = details;
		Object.setPrototypeOf(this, ValidationError.prototype);
	}
}

// Docker API Error
export class DockerApiError extends ServiceError {
	public readonly dockerStatusCode?: number;

	constructor(message: string, dockerStatusCode?: number) {
		const status = dockerStatusCode && dockerStatusCode >= 400 && dockerStatusCode < 500 ? dockerStatusCode : 503;
		super(message, ApiErrorCode.DOCKER_API_ERROR, status);
		this.name = 'DockerApiError';
		this.dockerStatusCode = dockerStatusCode;
		Object.setPrototypeOf(this, DockerApiError.prototype);
	}
}

// Conflict Error (e.g., resource already exists, or removing running container without force)
export class ConflictError extends ServiceError {
	constructor(message: string = 'Resource conflict') {
		super(message, ApiErrorCode.CONFLICT, 409);
		this.name = 'ConflictError';
		Object.setPrototypeOf(this, ConflictError.prototype);
	}
}

// NEW: Container State Error (e.g., trying to stop a stopped container)
export class ContainerStateError extends ServiceError {
	constructor(message: string) {
		// Using 409 Conflict as the state prevents the action
		super(message, ApiErrorCode.CONFLICT, 409);
		this.name = 'ContainerStateError';
		Object.setPrototypeOf(this, ContainerStateError.prototype);
	}
}

// NEW: Configuration Error (e.g., invalid settings during creation)
export class ConfigurationError extends ServiceError {
	constructor(message: string) {
		// Using 400 Bad Request as the provided config is invalid
		super(message, ApiErrorCode.BAD_REQUEST, 400);
		this.name = 'ConfigurationError';
		Object.setPrototypeOf(this, ConfigurationError.prototype);
	}
}
