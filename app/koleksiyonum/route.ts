import {siteResponse} from '../../lib/site-pages';

export async function GET() {
  return siteResponse('library');
}
