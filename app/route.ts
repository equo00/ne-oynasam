import {siteResponse} from '../lib/site-pages';
export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get('tab') === 'library') {
    url.pathname = '/koleksiyonum';
    url.searchParams.delete('tab');
    return new Response(null, {status: 302, headers: {'Location': url.pathname + url.search, 'Cache-Control': 'no-cache'}});
  }
  return siteResponse('discover');
}
