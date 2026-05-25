import { proxyErrorResponse, proxyToApi } from '../../_lib/proxy';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    return await proxyToApi('/api/auth/login', {
      method: 'POST',
      body,
      request,
    });
  } catch (error) {
    return proxyErrorResponse(error);
  }
}
