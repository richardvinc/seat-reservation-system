import { proxyErrorResponse, proxyToApi } from '../../_lib/proxy';

export async function GET(request: Request) {
  try {
    return await proxyToApi('/api/reservations/status', { request });
  } catch (error) {
    return proxyErrorResponse(error);
  }
}
