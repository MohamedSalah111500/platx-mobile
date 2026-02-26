// Common API response types matching the web project patterns

export interface PaginatedResponse<T> {
  items: T[];
  totalCount: number;
}

export interface SuccessResponse {
  success: boolean | string;
  message: string;
}

export interface ErrorResponse {
  errors: boolean | string;
  message: string;
}
