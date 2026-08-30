const API_BASE = import.meta.env.VITE_API_BASE ?? '/api/v1'

let authToken: string | null = null

export function setAuthToken(token: string | null) {
  authToken = token
}

export class ApiError extends Error {
  status: number
  code?: string

  constructor(status: number, message: string, code?: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

interface RequestOptions {
  method?: string
  body?: unknown
  signal?: AbortSignal
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  }
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`
  }
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
  })

  if (!response.ok) {
    let detail = response.statusText
    try {
      const body = (await response.json()) as { detail?: string; code?: string }
      detail = body.detail ?? detail
      const error = new ApiError(response.status, detail, body.code)
      throw error
    } catch (error) {
      if (error instanceof ApiError) throw error
      throw new ApiError(response.status, detail)
    }
  }

  if (response.status === 204) {
    return undefined as T
  }
  return (await response.json()) as T
}

export const apiClient = {
  get: <T>(path: string, signal?: AbortSignal) => api<T>(path, { signal }),
  post: <T>(path: string, body?: unknown) => api<T>(path, { method: 'POST', body }),
  patch: <T>(path: string, body?: unknown) => api<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string) => api<T>(path, { method: 'DELETE' }),
}