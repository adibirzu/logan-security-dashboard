/**
 * Base API utilities for consistent RESTful design
 * Provides standardized request/response patterns and error handling
 */

import { NextRequest, NextResponse } from 'next/server'
import { config } from '@/config'

// Standard API response structure
export interface APIResponse<T = any> {
  success: boolean
  data?: T
  error?: APIError
  metadata?: APIMetadata
}

export interface APIError {
  code: string
  message: string
  details?: any
  stack?: string
}

export interface APIMetadata {
  timestamp: string
  requestId: string
  version: string
  pagination?: PaginationMetadata
  rateLimit?: RateLimitMetadata
}

export interface PaginationMetadata {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrevious: boolean
}

export interface RateLimitMetadata {
  limit: number
  remaining: number
  resetTime: number
}

// Standard query parameters
export interface StandardQueryParams {
  page?: number
  limit?: number
  sort?: string
  order?: 'asc' | 'desc'
  search?: string
  filter?: Record<string, any>
}

// HTTP status codes
export const HttpStatusCode = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
} as const

// Error codes
export const ErrorCode = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',
} as const

// Base API handler class
export abstract class BaseAPIHandler {
  protected request: NextRequest
  protected requestId: string

  constructor(request: NextRequest) {
    this.request = request
    this.requestId = this.generateRequestId()
  }

  // Abstract methods to be implemented by subclasses
  abstract handle(): Promise<NextResponse>

  // Helper methods for consistent responses
  protected success<T>(data: T, metadata?: Partial<APIMetadata>): NextResponse {
    return NextResponse.json(this.createResponse(true, data, undefined, metadata), {
      status: HttpStatusCode.OK,
    })
  }

  protected created<T>(data: T, metadata?: Partial<APIMetadata>): NextResponse {
    return NextResponse.json(this.createResponse(true, data, undefined, metadata), {
      status: HttpStatusCode.CREATED,
    })
  }

  protected noContent(): NextResponse {
    return new NextResponse(null, { status: HttpStatusCode.NO_CONTENT })
  }

  protected badRequest(message: string, details?: any): NextResponse {
    return NextResponse.json(
      this.createResponse(false, undefined, {
        code: ErrorCode.VALIDATION_ERROR,
        message,
        details,
      }),
      { status: HttpStatusCode.BAD_REQUEST }
    )
  }

  protected notFound(message: string = 'Resource not found'): NextResponse {
    return NextResponse.json(
      this.createResponse(false, undefined, {
        code: ErrorCode.NOT_FOUND,
        message,
      }),
      { status: HttpStatusCode.NOT_FOUND }
    )
  }

  protected unauthorized(message: string = 'Unauthorized'): NextResponse {
    return NextResponse.json(
      this.createResponse(false, undefined, {
        code: ErrorCode.UNAUTHORIZED,
        message,
      }),
      { status: HttpStatusCode.UNAUTHORIZED }
    )
  }

  protected forbidden(message: string = 'Forbidden'): NextResponse {
    return NextResponse.json(
      this.createResponse(false, undefined, {
        code: ErrorCode.FORBIDDEN,
        message,
      }),
      { status: HttpStatusCode.FORBIDDEN }
    )
  }

  protected conflict(message: string, details?: any): NextResponse {
    return NextResponse.json(
      this.createResponse(false, undefined, {
        code: ErrorCode.CONFLICT,
        message,
        details,
      }),
      { status: HttpStatusCode.CONFLICT }
    )
  }

  protected internalError(message: string = 'Internal server error', error?: Error): NextResponse {
    const apiError: APIError = {
      code: ErrorCode.INTERNAL_ERROR,
      message,
    }

    if (config.app.environment === 'development' && error) {
      apiError.stack = error.stack
    }

    return NextResponse.json(
      this.createResponse(false, undefined, apiError),
      { status: HttpStatusCode.INTERNAL_SERVER_ERROR }
    )
  }

  protected methodNotAllowed(): NextResponse {
    return NextResponse.json(
      this.createResponse(false, undefined, {
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Method not allowed',
      }),
      { status: HttpStatusCode.METHOD_NOT_ALLOWED }
    )
  }

  // Utility methods
  protected parseQueryParams(): StandardQueryParams {
    const { searchParams } = new URL(this.request.url)
    
    return {
      page: this.parseIntParam(searchParams, 'page', 1),
      limit: this.parseIntParam(searchParams, 'limit', 20),
      sort: searchParams.get('sort') || undefined,
      order: (searchParams.get('order') as 'asc' | 'desc') || 'asc',
      search: searchParams.get('search') || undefined,
      filter: this.parseFilterParam(searchParams),
    }
  }

  protected async parseBody<T>(): Promise<T> {
    try {
      return await this.request.json()
    } catch (error) {
      throw new Error('Invalid JSON body')
    }
  }

  protected validateRequired(data: any, fields: string[]): void {
    for (const field of fields) {
      if (data[field] === undefined || data[field] === null) {
        throw new Error(`Required field '${field}' is missing`)
      }
    }
  }

  protected createPaginationMetadata(
    page: number,
    limit: number,
    total: number
  ): PaginationMetadata {
    const totalPages = Math.ceil(total / limit)
    
    return {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    }
  }

  private createResponse<T>(
    success: boolean,
    data?: T,
    error?: APIError,
    metadata?: Partial<APIMetadata>
  ): APIResponse<T> {
    const response: APIResponse<T> = {
      success,
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: this.requestId,
        version: config.app.version,
        ...metadata,
      },
    }

    if (success && data !== undefined) {
      response.data = data
    }

    if (!success && error) {
      response.error = error
    }

    return response
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
  }

  private parseIntParam(searchParams: URLSearchParams, name: string, defaultValue: number): number {
    const value = searchParams.get(name)
    if (!value) return defaultValue
    
    const parsed = parseInt(value, 10)
    return isNaN(parsed) ? defaultValue : Math.max(1, parsed)
  }

  private parseFilterParam(searchParams: URLSearchParams): Record<string, any> | undefined {
    const filterParam = searchParams.get('filter')
    if (!filterParam) return undefined
    
    try {
      return JSON.parse(filterParam)
    } catch {
      return undefined
    }
  }
}

// Factory function for creating API handlers
export function createAPIHandler(handler: (request: NextRequest) => BaseAPIHandler) {
  return async function(request: NextRequest) {
    try {
      const apiHandler = handler(request)
      return await apiHandler.handle()
    } catch (error) {
      console.error('API Handler Error:', error)
      
      // Create a temporary handler for error response
      const tempHandler = new (class extends BaseAPIHandler {
        async handle(): Promise<NextResponse> {
          return this.internalError()
        }
        
        public getInternalError(message?: string, err?: Error): NextResponse {
          return this.internalError(message, err)
        }
      })(request)
      
      return tempHandler.getInternalError(
        'An unexpected error occurred',
        error instanceof Error ? error : undefined
      )
    }
  }
}

// Validation helpers
export class Validator {
  static email(value: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(value)
  }

  static url(value: string): boolean {
    try {
      new URL(value)
      return true
    } catch {
      return false
    }
  }

  static ipAddress(value: string): boolean {
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/
    return ipv4Regex.test(value) || ipv6Regex.test(value)
  }

  static hash(value: string, type: 'md5' | 'sha1' | 'sha256'): boolean {
    const lengths = { md5: 32, sha1: 40, sha256: 64 }
    const hexRegex = /^[a-fA-F0-9]+$/
    return value.length === lengths[type] && hexRegex.test(value)
  }

  static dateRange(start: string, end: string): boolean {
    const startDate = new Date(start)
    const endDate = new Date(end)
    return !isNaN(startDate.getTime()) && !isNaN(endDate.getTime()) && startDate <= endDate
  }
}

// Rate limiting helper
export class RateLimiter {
  private static requests = new Map<string, { count: number; resetTime: number }>()

  static check(identifier: string, limit: number, windowMs: number): RateLimitMetadata {
    const now = Date.now()
    const current = this.requests.get(identifier)

    if (!current || now > current.resetTime) {
      // Reset or initialize
      this.requests.set(identifier, { count: 1, resetTime: now + windowMs })
      return { limit, remaining: limit - 1, resetTime: now + windowMs }
    }

    current.count++
    return { 
      limit, 
      remaining: Math.max(0, limit - current.count), 
      resetTime: current.resetTime 
    }
  }

  static isLimited(identifier: string, limit: number, windowMs: number): boolean {
    const rateLimitInfo = this.check(identifier, limit, windowMs)
    return rateLimitInfo.remaining <= 0
  }
}