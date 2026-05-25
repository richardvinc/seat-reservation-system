import { proxyErrorResponse, proxyToApi } from '../../_lib/proxy';

export async function GET(request: Request) {
  try {
    return await proxyToApi('/api/auth/me', { request });
  } catch (error) {
    return proxyErrorResponse(error);
  }
}
