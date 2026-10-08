// Extract aggregate facts only; individual reviews and critic scores are excluded.
export function parseMetacriticObservations(raw, retrievedAt = new Date().toISOString()) {
  const observations = [];
  for (const part of raw.split(/\n-{10,}\n/)) {
    const sourceUrl = part.match(/^.*?\((https?:\/\/www\.metacritic\.com\/game\/[^\s)]+)\)/m)?.[1];
    const retrievalReference = part.match(/【(turn\d+(?:search|view)\d+)】/)?.[1];
    if (!sourceUrl || !retrievalReference) continue;
    const url = new URL(sourceUrl);
    if (!url.pathname.includes('/user-reviews/') || url.searchParams.getAll('platform').some(p => p !== 'pc')) continue;
    const plain = part.replace(/^L\d+: ?/gm, '');
    const heading = plain.match(/^# PC User Reviews\s*$/m);
    if (!heading) continue;
    const aggregate = plain.slice(heading.index).split(/Showing \d[\d,.k]* User Reviews/)[0].slice(0, 1500);
    const average = aggregate.match(/(?:^|\n)\s*(\d+(?:\.\d+)?)\s*\n\s*User score(?:\n|$)/)?.[1];
    if (!average || Number(average) > 10) continue;
    const ratingBuckets = ['positive', 'mixed', 'negative'].map(kind => aggregate.match(new RegExp('(?:^|\\n)\\s*' + kind + '\\s*\\n\\s*([\\d.,k]+)\\s*\\('))?.[1] || null);
    const exact = ratingBuckets.every(count => count && /^\d+(?:,\d{3})*$/.test(count));
    const count = exact ? ratingBuckets.reduce((sum, value) => sum + Number(value.replaceAll(',', '')), 0) : null;
    const sourceCrawlLabel = part.match(/Crawled:\s*([^;\n]+)(?:;|$)/)?.[1]?.trim();
    if (!sourceCrawlLabel) continue;
    observations.push({resourceId:url.pathname.split('/')[2], score:Number(average), userRatings:count > 0 ? count : null,
      ratingBuckets, sourceUrl, retrievalReference, sourceCrawlLabel, retrievedAt, pageHeading:'PC User Reviews'});
  }
  return observations;
}

export function validateObservation(observation) {
  const url = new URL(observation.sourceUrl);
  if (url.protocol !== 'https:' || url.hostname !== 'www.metacritic.com' || url.username || url.password || url.port ||
      url.pathname !== '/game/' + observation.resourceId + '/user-reviews/' ||
      url.searchParams.getAll('platform').some(p => p !== 'pc') || observation.pageHeading !== 'PC User Reviews' ||
      typeof observation.score !== 'number' || !Number.isFinite(observation.score) || observation.score < 0 || observation.score > 10 ||
      !observation.sourceCrawlLabel || !/^turn\d+(?:search|view)\d+$/.test(observation.retrievalReference || '') ||
      !Number.isFinite(Date.parse(observation.retrievedAt))) throw Error('PC kullanıcı puanı gözlemi geçersiz.');
  if (!Array.isArray(observation.ratingBuckets) || observation.ratingBuckets.length !== 3) throw Error('Değerlendirme grupları eksik.');
  const exact = observation.ratingBuckets.every(value => typeof value === 'string' && /^\d+(?:,\d{3})*$/.test(value));
  const count = exact ? observation.ratingBuckets.reduce((sum, value) => sum + Number(value.replaceAll(',', '')), 0) : null;
  if (observation.userRatings !== (count > 0 ? count : null)) throw Error('Kesin değerlendirme sayısı gözlemle uyuşmuyor.');
  return observation;
}
