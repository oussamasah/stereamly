const api = process.env.NEXT_PUBLIC_API_URL;

export async function adminFetch(path: string, init: RequestInit = {}) {
  const request = (token: string) => fetch(`${api}${path}`, {
    ...init,
    cache: init.cache ?? 'no-store',
    credentials: 'include',
    headers: { ...init.headers, authorization: `Bearer ${token}` },
  });
  let token = sessionStorage.getItem('accessToken') ?? '';
  let response = await request(token);
  if (response.status !== 401) return response;
  const refresh = await fetch(`${api}/auth/refresh`, { method: 'POST', credentials: 'include' });
  if (!refresh.ok) return response;
  const session = await refresh.json() as { accessToken?: string };
  if (!session.accessToken) return response;
  token = session.accessToken;
  sessionStorage.setItem('accessToken', token);
  response = await request(token);
  return response;
}
