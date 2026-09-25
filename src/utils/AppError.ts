/**
 * Represents an expected, operational error (bad input, not found, etc.)
 * as opposed to an unexpected programming error. Controllers throw this;
 * the error-handling middleware knows how to translate it into an HTTP
 * response.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational = true;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}
