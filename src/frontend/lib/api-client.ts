import type { ApiError, ApiResponse, RateLimitError } from '#types/api';

const API_BASE_URL = '';

/**
 * Custom error class for API errors
 */
export class ApiClientError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public errorCode?: string,
    public details?: Array<{ field: string; message: string }>,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

/**
 * Custom error class for rate limit errors
 */
export class ApiRateLimitError extends ApiClientError {
  constructor(
    message: string,
    public retryAfter: number,
  ) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
    this.name = 'RateLimitError';
  }
}

/**
 * HTTP client with error handling and TypeScript support
 */
class ApiClient {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  /**
   * Make a generic API request
   */
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;

    const defaultHeaders = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      // Handle empty responses
      if (response.status === 204) {
        return { success: true } as ApiResponse<T>;
      }

      const data = await response.json();
      return data as ApiResponse<T>;
    } catch (error) {
      // Re-throw our custom errors
      if (error instanceof ApiClientError) {
        throw error;
      }

      // Handle network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new ApiClientError('Network error - please check your connection', 0, 'NETWORK_ERROR');
      }

      // Handle JSON parsing errors
      throw new ApiClientError('Failed to parse server response', 500, 'PARSE_ERROR');
    }
  }

  /**
   * Handle error responses and throw appropriate errors
   */
  private async handleErrorResponse(response: Response): Promise<never> {
    let errorData: ApiError | RateLimitError;

    try {
      errorData = await response.json();
    } catch {
      throw new ApiClientError(`HTTP ${response.status}: ${response.statusText}`, response.status);
    }

    // Handle rate limit errors
    if (response.status === 429 && 'retryAfter' in errorData) {
      throw new ApiRateLimitError(errorData.message, (errorData as RateLimitError).retryAfter);
    }

    // Handle validation errors
    if (response.status === 400 && 'details' in errorData) {
      throw new ApiClientError(errorData.message, response.status, errorData.error, (errorData as ApiError).details);
    }

    // Handle general API errors
    throw new ApiClientError(errorData.message, response.status, errorData.error);
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, params?: Record<string, string | number>): Promise<ApiResponse<T>> {
    const fullUrl = `${this.baseURL}${endpoint}`;

    // Handle URL construction for both absolute and relative URLs
    const url = this.baseURL ? new URL(fullUrl) : new URL(endpoint, window.location.origin);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    // Always pass just the path and search params to request method
    // The request method will handle prepending the base URL
    return this.request<T>(url.pathname + url.search);
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
    const body = data ? JSON.stringify(data) : null;
    return this.request<T>(endpoint, {
      method: 'POST',
      body,
    });
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
    const body = data ? JSON.stringify(data) : null;
    return this.request<T>(endpoint, {
      method: 'PUT',
      body,
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    });
  }

  /**
   * Health check
   */
  async healthCheck() {
    return this.get('/health');
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export constructor for testing
export { ApiClient };
