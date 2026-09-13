const api = process.env.NEXT_PUBLIC_API_URL;
let refreshing: Promise<string | null> | null = null;
function sessionChanged(detail: unknown) { window.dispatchEvent(new CustomEvent('streamly:auth', { detail })); }
async function refreshSession() {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    const response = await fetch(`${api}/auth/refresh`, { method: 'POST', credentials: 'include' });
    if (!response.ok) { sessionStorage.removeItem('accessToken'); sessionStorage.removeItem('streamly.userId'); sessionChanged(null); return null; }
    const session = await response.json() as { accessToken?: string; user?: { id: string } };
    if (!session.accessToken || !session.user) return null;
    sessionStorage.setItem('accessToken', session.accessToken);
    sessionStorage.setItem('streamly.userId', session.user.id);
    sessionChanged(session);
    return session.accessToken;
  })().finally(() => { refreshing = null; });
  return refreshing;
}
export async function adminFetch(path: string, init: RequestInit = {}) {
  const identity = sessionStorage.getItem('streamly.userId');
  const request = (token: string) => fetch(`${api}${path}`, {
    ...init, cache: init.cache ?? 'no-store', credentials: 'include',
    headers: { ...init.headers, authorization: `Bearer ${token}` },
  });
  const response = await request(sessionStorage.getItem('accessToken') ?? '');
  if (response.status !== 401 || identity !== sessionStorage.getItem('streamly.userId')) return response;
  const token = await refreshSession();
  // Never replay an earlier account's mutation under a newly signed-in identity.
  if (!token || identity !== sessionStorage.getItem('streamly.userId')) return response;
  return request(token);
}
