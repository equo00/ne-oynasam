// Source identifiers are stored relationships, never generated from game names.
const legacyPlatforms = new Set(['pc','playstation','playstation-2','playstation-3','playstation-4','playstation-5','psp','ps-vita','xbox','xbox-360','xbox-one','xbox-series-x','switch','nintendo-switch','wii','wii-u','ds','3ds','gamecube','dreamcast','ios','android']);

/** @param {unknown} value */
export function metacriticResource(value) {
  if (typeof value !== 'string') return null;
  try {
    const u = new URL(value);
    if (!['http:','https:'].includes(u.protocol) || !['metacritic.com','www.metacritic.com'].includes(u.hostname) || u.username || u.password || u.port) return null;
    const path = u.pathname.split('/').filter(Boolean);
    if (path[0] !== 'game') return null;
    const rawId = path[legacyPlatforms.has(path[1]) ? 2 : 1];
    const id = rawId ? decodeURIComponent(rawId) : '';
    if (!id || !/^[a-z0-9][a-z0-9!-]{0,199}$/.test(id)) return null;
    return {id, url:`https://www.metacritic.com/game/${id}/`};
  } catch { return null; }
}

/**
 * @param {{id:string, steamAppId?:number|null}} game
 * @param {Record<string,any>} identities
 * @param {Record<string,any>} records
 */
export function metacriticScoreForGame(game, identities, records) {
  const identity = identities[game.id];
  if (!Number.isSafeInteger(game.steamAppId) || !identity || identity.gameId !== game.id || identity.steamAppId !== game.steamAppId || identity.status !== 'ready') return null;
  const record = records[identity.scoreRecordId];
  const resource = metacriticResource(record?.url);
  if (!record || record.recordId !== identity.scoreRecordId || record.metric !== 'user-score' || record.metacriticId !== identity.metacritic?.resourceId || resource?.id !== record.metacriticId) return null;
  if (record.metacriticNumericId !== (identity.metacritic.numericId || null) || record.platform !== identity.scorePlatform || typeof record.score !== 'number' || !Number.isFinite(record.score) || record.score < 0 || record.score > 10) return null;
  if (record.platform === 'PC') {
    const url = new URL(record.url), first = url.pathname.split('/').filter(Boolean)[1];
    if (url.searchParams.getAll('platform').some(platform=>platform!=='pc') || legacyPlatforms.has(first) && first!=='pc') return null;
  }
  return record;
}
