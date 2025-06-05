const ApiErrorCode = {
  // User does not have permission (403)
  NOT_FOUND: "NOT_FOUND",
  // Resource not found (404)
  CONFLICT: "CONFLICT",
  // General bad request, often for config/state issues (400)
  // Server-side errors (5xx)
  DOCKER_API_ERROR: "DOCKER_API_ERROR",
  // Error interacting with Docker daemon (500/503)
  SERVICE_ERROR: "SERVICE_ERROR"
};
class ServiceError extends Error {
  code;
  status;
  constructor(message, code = ApiErrorCode.SERVICE_ERROR, status = 500) {
    super(message);
    this.name = "ServiceError";
    this.code = code;
    this.status = status;
    Object.setPrototypeOf(this, ServiceError.prototype);
  }
}
class NotFoundError extends ServiceError {
  constructor(message = "Resource not found") {
    super(message, ApiErrorCode.NOT_FOUND, 404);
    this.name = "NotFoundError";
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}
class DockerApiError extends ServiceError {
  dockerStatusCode;
  constructor(message, dockerStatusCode) {
    const status = dockerStatusCode && dockerStatusCode >= 400 && dockerStatusCode < 500 ? dockerStatusCode : 503;
    super(message, ApiErrorCode.DOCKER_API_ERROR, status);
    this.name = "DockerApiError";
    this.dockerStatusCode = dockerStatusCode;
    Object.setPrototypeOf(this, DockerApiError.prototype);
  }
}
class ConflictError extends ServiceError {
  constructor(message = "Resource conflict") {
    super(message, ApiErrorCode.CONFLICT, 409);
    this.name = "ConflictError";
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}
export {
  ConflictError as C,
  DockerApiError as D,
  NotFoundError as N
};
