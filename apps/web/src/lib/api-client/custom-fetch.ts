export interface CustomFetchOptions extends RequestInit {
  params?: Record<string, unknown>;
}

export const customFetch = async <T>(
  url: string,
  options: CustomFetchOptions = {},
): Promise<T> => {
  const { params, ...fetchOptions } = options;

  let requestUrl = url;

  if (requestUrl.startsWith('/api/v1/')) {
    const pathSegments = window.location.pathname.split('/').filter(Boolean);
    const currentMfe = pathSegments[0]; 

    if (currentMfe) {
      requestUrl = requestUrl.replace('/api/v1/', `/api/v1/${currentMfe}/`);
    }
  }

  if (params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    }
    const queryString = searchParams.toString();
    if (queryString) {
      requestUrl += (requestUrl.includes('?') ? '&' : '?') + queryString;
    }
  }

  const devHeaders: Record<string, string> = {};
  if (import.meta.env.DEV) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const devPerfil = window.localStorage.getItem('dev_perfil');
        if (devPerfil) {
          devHeaders['X-Dev-Perfil'] = devPerfil;
        }
      }
    } catch {
      // Ignora falhas de acesso ao localStorage (ex.: iframe restrito)
    }
  }

  const response = await fetch(requestUrl, {
    ...fetchOptions,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...devHeaders,
      ...fetchOptions.headers,
    },
  });

  if (!response.ok) {
    let errorBody: unknown;
    const text = await response.text();
    try {
      errorBody = text ? JSON.parse(text) : undefined;
    } catch {
      errorBody = text;
    }
    throw errorBody;
  }

  let data: unknown = undefined;
  if (response.status !== 204) {
    const contentType = response.headers.get('content-type');
    const text = await response.text();
    if (contentType && contentType.includes('application/json')) {
      try {
        data = text ? JSON.parse(text) : undefined;
      } catch {
        data = text;
      }
    } else {
      data = text;
    }
  }

  return {
    data,
    status: response.status,
    headers: response.headers,
  } as unknown as T;
};
