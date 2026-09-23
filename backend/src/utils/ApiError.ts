export interface FieldIssue {
  field: string;
  message: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly details?: FieldIssue[];

  constructor(status: number, message: string, details?: FieldIssue[]) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }

  static badRequest(msg = 'Bad request', details?: FieldIssue[]): ApiError {
    return new ApiError(400, msg, details);
  }
  static unauthorized(msg = 'Not authenticated'): ApiError {
    return new ApiError(401, msg);
  }
  static forbidden(msg = 'You do not have permission to perform this action'): ApiError {
    return new ApiError(403, msg);
  }
  static notFound(msg = 'Not found'): ApiError {
    return new ApiError(404, msg);
  }
  static conflict(msg = 'Already exists'): ApiError {
    return new ApiError(409, msg);
  }
}
