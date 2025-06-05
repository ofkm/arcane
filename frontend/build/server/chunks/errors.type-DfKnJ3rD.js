var ApiErrorCode = /* @__PURE__ */ ((ApiErrorCode2) => {
  ApiErrorCode2["NOT_FOUND"] = "NOT_FOUND";
  ApiErrorCode2["BAD_REQUEST"] = "BAD_REQUEST";
  ApiErrorCode2["UNAUTHORIZED"] = "UNAUTHORIZED";
  ApiErrorCode2["FORBIDDEN"] = "FORBIDDEN";
  ApiErrorCode2["INTERNAL_SERVER_ERROR"] = "INTERNAL_SERVER_ERROR";
  ApiErrorCode2["SERVICE_UNAVAILABLE"] = "SERVICE_UNAVAILABLE";
  ApiErrorCode2["VALIDATION_ERROR"] = "VALIDATION_ERROR";
  ApiErrorCode2["DOCKER_API_ERROR"] = "DOCKER_API_ERROR";
  ApiErrorCode2["CONFLICT"] = "CONFLICT";
  ApiErrorCode2["REGISTRY_PUBLIC_ACCESS_ERROR"] = "REGISTRY_PUBLIC_ACCESS_ERROR";
  ApiErrorCode2["REGISTRY_PRIVATE_ACCESS_ERROR"] = "REGISTRY_PRIVATE_ACCESS_ERROR";
  ApiErrorCode2["REGISTRY_API_RATE_LIMIT"] = "REGISTRY_API_RATE_LIMIT";
  ApiErrorCode2["REGISTRY_UNSUPPORTED"] = "REGISTRY_UNSUPPORTED";
  return ApiErrorCode2;
})(ApiErrorCode || {});
class BaseError extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}
class NotFoundError extends BaseError {
  constructor(message) {
    super(message);
  }
}
class DockerApiError extends BaseError {
  statusCode;
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}
class RegistryRateLimitError extends BaseError {
  registry;
  repository;
  retryAfter;
  constructor(message, registry, repository, retryAfter) {
    super(message);
    this.registry = registry;
    this.repository = repository;
    this.retryAfter = retryAfter;
    Object.setPrototypeOf(this, RegistryRateLimitError.prototype);
  }
}
class PublicRegistryError extends BaseError {
  registry;
  repository;
  statusCode;
  constructor(message, registry, repository, statusCode) {
    super(message);
    this.registry = registry;
    this.repository = repository;
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, PublicRegistryError.prototype);
  }
}
class PrivateRegistryError extends BaseError {
  registry;
  repository;
  statusCode;
  constructor(message, registry, repository, statusCode) {
    super(message);
    this.registry = registry;
    this.repository = repository;
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, PrivateRegistryError.prototype);
  }
}

export { ApiErrorCode as A, DockerApiError as D, NotFoundError as N, PublicRegistryError as P, RegistryRateLimitError as R, PrivateRegistryError as a };
//# sourceMappingURL=errors.type-DfKnJ3rD.js.map
