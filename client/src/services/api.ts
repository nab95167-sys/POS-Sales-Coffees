export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

let refreshPromise: Promise<boolean> | null = null;

async function tryRefreshSession(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = fetch('/api/v1/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    })
      .then((res) => res.ok)
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

export interface ApiFetchOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  skipAuthRefresh?: boolean;
}

export async function apiFetch<T = unknown>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const { body, headers: customHeaders, skipAuthRefresh, ...rest } = options;

  const headers: Record<string, string> = {
    ...(customHeaders as Record<string, string> | undefined),
  };

  let serializedBody: BodyInit | undefined;
  if (body !== undefined) {
    if (typeof body === 'string' || body instanceof FormData) {
      serializedBody = body as BodyInit;
    } else {
      headers['Content-Type'] = 'application/json';
      serializedBody = JSON.stringify(body);
    }
  }

  const doRequest = () =>
    fetch(path, {
      ...rest,
      headers,
      body: serializedBody,
      credentials: 'include',
    });

  let response = await doRequest();

  const isAuthEndpoint =
    path.includes('/auth/login') ||
    path.includes('/auth/refresh') ||
    path.includes('/security/verify-pin');

  if (response.status === 401 && !skipAuthRefresh && !isAuthEndpoint) {
    const refreshed = await tryRefreshSession();
    if (refreshed) {
      response = await doRequest();
    } else {
      window.dispatchEvent(new Event('coffee_session_expired'));
    }
  }

  const text = await response.text();
  let parsed: Record<string, unknown> | null = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }
  }

  if (!response.ok) {
    const errorMessage =
      (parsed && typeof parsed.error === 'string' && parsed.error) ||
      `Request failed (${response.status})`;
    throw new ApiError(response.status, errorMessage);
  }

  return (parsed ?? {}) as T;
}
