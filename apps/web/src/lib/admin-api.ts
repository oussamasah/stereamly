const api = process.env.NEXT_PUBLIC_API_URL;
function sessionChanged(detail: unknown) { window.dispatchEvent(new CustomEvent('streamly:auth', { detail })); }

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
  if (!refresh.ok) { sessionStorage.removeItem('accessToken'); sessionChanged(null); return response; }
  const session = await refresh.json() as { accessToken?: string; user?: unknown };
  if (!session.accessToken) { sessionStorage.removeItem('accessToken'); sessionChanged(null); return response; }
  token = session.accessToken;
  sessionStorage.setItem('accessToken', token);
  if (session.user) sessionChanged({ accessToken: token, user: session.user });
  response = await request(token);
  return response;
}
