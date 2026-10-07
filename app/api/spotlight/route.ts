import {dailySpotlight} from '../../../lib/spotlight';
import {json} from '../../../lib/security';
export const dynamic='force-dynamic';
export async function GET(){return json(dailySpotlight());}
