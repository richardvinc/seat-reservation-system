import { proxyErrorResponse, proxyToApi } from '../../_lib/proxy';

export async function POST(request: Request) {
  try {
    return await proxyToApi('/api/auth/logout', {
      method: 'POST',
      request,
    });
  } catch (error) {
    return proxyErrorResponse(error);
  }
}
