/**
 * Base class for every business-level failure the domain/application
 * layers can raise. Framework-agnostic on purpose: nothing in here knows
 * about HTTP. presentation/middlewares/error-handler.ts is the ONLY place
 * that maps a subclass to a status code, so a use case never has to import
 * Express to fail correctly.
 */
export abstract class AppError extends Error {
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ValidationError extends AppError {
  readonly code = "VALIDATION_ERROR";
}

export class UnauthorizedError extends AppError {
  readonly code = "UNAUTHORIZED";
}

export class ForbiddenError extends AppError {
  readonly code = "FORBIDDEN";
}

export class NotFoundError extends AppError {
  readonly code = "NOT_FOUND";
}

export class ConflictError extends AppError {
  readonly code = "CONFLICT";
}
