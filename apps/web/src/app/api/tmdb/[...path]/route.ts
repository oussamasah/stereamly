import { NextRequest, NextResponse } from 'next/server';

const allowedRoots = new Set(['movie', 'tv', 'search', 'configuration']);

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const key = process.env.NEXT_PUBLIC_TMDB_API_KEY;
  const { path } = await params;
  if (!key) return NextResponse.json({ message: 'TMDB_API_KEY_MISSING' }, { status: 503 });
  if (!path.length || !allowedRoots.has(path[0]) || path.some(part => !/^[\w.-]+$/.test(part))) {
    return NextResponse.json({ message: 'TMDB_PATH_NOT_ALLOWED' }, { status: 400 });
  }
  const upstream = new URL(`https://api.themoviedb.org/3/${path.join('/')}`);
  upstream.searchParams.set('api_key', key);
  for (const [name, value] of request.nextUrl.searchParams) {
    if (['language', 'query', 'page', 'include_adult', 'append_to_response'].includes(name)) upstream.searchParams.set(name, value);
  }
  const response = await fetch(upstream, { next: { revalidate: 1800 } });
  const body = await response.text();
  return new NextResponse(body, {
    status: response.status,
    headers: {
      'content-type': response.headers.get('content-type') ?? 'application/json',
      'cache-control': response.ok ? 'public, max-age=900, stale-while-revalidate=1800' : 'no-store',
    },
  });
}
