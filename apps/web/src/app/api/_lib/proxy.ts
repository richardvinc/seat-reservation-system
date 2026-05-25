type ProxyInit = {
  method?: 'GET' | 'POST';
  body?: unknown;
  request?: Request;
};

function getApiBaseUrl(): string {
  const internalApi = process.env.API_INTERNAL_URL;
  const apiPort = process.env.API_PORT ?? '3100';

  if (internalApi) {
    return internalApi.replace(/\/$/, '');
  }

  return `http://localhost:${apiPort}`;
}

export async function proxyToApi(
  path: string,
  init: ProxyInit = {},
): Promise<Response> {
  const headers = new Headers();

  if (init.body !== undefined) {
    headers.set('content-type', 'application/json');
  }

  const cookie = init.request?.headers.get('cookie');

  if (cookie) {
    headers.set('cookie', cookie);
  }

  const upstreamResponse = await fetch(`${getApiBaseUrl()}${path}`, {
    method: init.method ?? 'GET',
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: 'no-store',
    redirect: 'manual',
  });

  const body = await upstreamResponse.text();
  const responseHeaders = new Headers({
    'content-type':
      upstreamResponse.headers.get('content-type') ?? 'application/json',
  });
  const setCookie = upstreamResponse.headers.get('set-cookie');

  if (setCookie) {
    responseHeaders.set('set-cookie', setCookie);
  }

  return new Response(body, {
    status: upstreamResponse.status,
    headers: responseHeaders,
  });
}

export function proxyErrorResponse(error: unknown): Response {
  return new Response(JSON.stringify({ error: String(error) }), {
    status: 502,
    headers: { 'content-type': 'application/json' },
  });
}
