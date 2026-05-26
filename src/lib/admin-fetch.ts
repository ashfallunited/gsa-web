export class AdminFetchError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'AdminFetchError'
    this.status = status
  }
}

export async function fetchAdminJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  const text = await res.text()

  let data: unknown = null
  if (text.trim()) {
    try {
      data = JSON.parse(text) as unknown
    } catch {
      throw new AdminFetchError('Invalid response from server', res.status)
    }
  }

  if (!res.ok) {
    const message =
      data !== null &&
      typeof data === 'object' &&
      'error' in data &&
      typeof (data as { error: unknown }).error === 'string'
        ? (data as { error: string }).error
        : `Request failed (${res.status})`
    throw new AdminFetchError(message, res.status)
  }

  return data as T
}
