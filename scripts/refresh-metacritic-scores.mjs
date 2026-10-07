// SPDX-License-Identifier: GPL-3.0-or-later
// Rebuild the numerical subset using stored external-ID relationships.
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {metacriticResource} from '../lib/metacritic-identity.mjs';

function reviewedFactIndex(games, reviewed) {
  if (reviewed.schemaVersion !== 1 || !Array.isArray(reviewed.facts)) throw Error('Invalid reviewed score input');
  const byGame = new Map(), recordIds = new Set(), gameById = new Map(games.map(g=>[g.id,g]));
  for (const fact of reviewed.facts) {
    const game = gameById.get(fact.gameId), proof = fact.provenance;
    const fail = reason => { throw Error(`Invalid reviewed score fact ${fact.recordId || '(no ID)'}: ${reason}`); };
    if (!game || game.steamAppId !== fact.steamAppId) fail('catalog game / store app ID mismatch');
    if (!/^mc-user:reviewed:[a-zA-Z0-9:-]{1,150}$/.test(fact.recordId || '') || recordIds.has(fact.recordId) || byGame.has(fact.gameId)) fail('duplicate or invalid stable fact ID');
    if (fact.metric !== 'user-score' || fact.platform !== 'PC' || typeof fact.score !== 'number' || !Number.isFinite(fact.score) || fact.score < 0 || fact.score > 10) fail('metric, PC platform, or 0–10 average');
    const resource = metacriticResource(fact.sourceUrl);
    if (!resource || resource.id !== fact.metacriticId) fail('primary source resource ID mismatch');
    const url = new URL(fact.sourceUrl);
    if (url.protocol !== 'https:' || url.searchParams.getAll('platform').some(platform=>platform!=='pc') || /^\/game\/(?:playstation|xbox|switch|nintendo|ios|android)/.test(url.pathname)) fail('source URL contradicts PC platform');
    if (!proof || proof.metricLabel !== 'User score' || proof.platformLabel !== 'PC' || !['user-supplied-capture','public-primary-cache'].includes(proof.method)) fail('missing explicit primary metric/platform evidence');
    if (proof.method === 'user-supplied-capture' && !/^[a-f0-9]{64}$/.test(proof.captureSha256 || '')) fail('missing capture fingerprint');
    if (proof.method === 'public-primary-cache' && (proof.pageHeading !== 'PC User Reviews' || !proof.sourceCrawlLabel || !proof.retrievalReference)) fail('missing cached page evidence / age');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fact.snapshotDate || '') || !Number.isFinite(Date.parse(fact.retrievedAt)) || fact.retrievedAt.slice(0,10) !== fact.snapshotDate || fact.scoreDate !== null) fail('invalid retrieval date or invented score measurement date');
    if (fact.userRatings !== null && (!Number.isSafeInteger(fact.userRatings) || fact.userRatings < 1)) fail('invalid ratings count');
    recordIds.add(fact.recordId); byGame.set(fact.gameId,fact);
  }
  return byGame;
}

export function buildScoreCatalog(games, input, evidence, reviewed = {schemaVersion:1,facts:[]}) {
  const identities = {}, records = {}, missing = [], recovered = [], removed = [];
  const reviewedByGame = reviewedFactIndex(games,reviewed);
  const old = evidence.previousApproved || {};
  const manual = new Map(evidence.manualReviews.map(r => [r.steamAppId,r]));
  const audit = new Map(evidence.editionAudit.map(r => [r.steamAppId,r]));
  const steam = new Map(evidence.steam.map(r => [r.steamAppId,r]));
  const wd = new Map();
  for (const r of evidence.wikidata) {
    const rows = wd.get(r.steamAppId) || [];
    rows.push(r); wd.set(r.steamAppId,rows);
  }
  const aliases = new Map();
  for (const review of manual.values()) if (review.status === 'approved') {
    for (const alias of review.approvedResourceAliases || []) aliases.set(alias,review.metacriticId);
  }
  // One immutable numeric Metacritic ID can corroborate changed URL identifiers.
  // Neither roman numerals nor title similarity establish these aliases.
  const numbersForId = new Map(), idsForNumber = new Map();
  for (const r of [...evidence.wikidata,...[...manual.values()].filter(r=>r.status==='approved').map(r=>({metacriticId:r.metacriticId,metacriticNumericId:r.numericId}))]) {
    if (!r.metacriticId || !r.metacriticNumericId) continue;
    const numbers = numbersForId.get(r.metacriticId) || new Set(); numbers.add(r.metacriticNumericId); numbersForId.set(r.metacriticId,numbers);
    const ids = idsForNumber.get(r.metacriticNumericId) || new Set(); ids.add(r.metacriticId); idsForNumber.set(r.metacriticNumericId,ids);
  }
  for (const ids of idsForNumber.values()) {
    const eligible = [...ids].filter(id=>numbersForId.get(id)?.size===1);
    if (eligible.length < 2) continue;
    const reviewed = [...manual.values()].find(r=>r.status==='approved' && eligible.includes(r.metacriticId));
    const retained = Object.values(old).map(r=>metacriticResource(r.url)?.id).find(id=>eligible.includes(id));
    const target = reviewed?.metacriticId || retained || eligible.sort()[0];
    for (const id of eligible) if (!aliases.has(id)) aliases.set(id,target);
  }
  const canonical = id => aliases.get(id) || id;
  const numericByResource = new Map();
  for (const r of evidence.wikidata) if (r.metacriticId && r.metacriticNumericId) {
    const id = canonical(r.metacriticId), values = numericByResource.get(id) || new Set();
    values.add(r.metacriticNumericId); numericByResource.set(id,values);
  }
  for (const r of manual.values()) if (r.status === 'approved' && r.numericId) numericByResource.set(r.metacriticId,new Set([r.numericId]));
  const rows = input.rows.map(r => ({...r,resource:metacriticResource(r.metacriticUrl)}));
  const byApp = new Map(rows.filter(r => Number.isSafeInteger(r.steamAppId) && r.sourceKind === 'steam').map(r => [r.steamAppId,r]));
  const byResource = new Map();
  for (const r of rows) {
    if (!r.resource || typeof r.userScore !== 'number' || !Number.isFinite(r.userScore) || r.userScore < 0 || r.userScore > 10) continue;
    // Invalid source associations are removed before they can contaminate another game.
    const warning = audit.get(r.steamAppId);
    if (warning && ['reject_current_resource','replace_resource','hold_for_scope_verification','verified_rebrand_with_expanded_scope','verified_lineage_needs_scope_decision'].includes(warning.status) && canonical(r.resource.id) === canonical(warning.currentCandidateSlug)) continue;
    if (manual.get(r.steamAppId)?.status === 'hold') continue;
    const key = canonical(r.resource.id), group = byResource.get(key) || [];
    group.push(r); byResource.set(key,group);
  }

  for (const g of games) {
    const appid = g.steamAppId, previous = old[appid], review = manual.get(appid), warning = audit.get(appid);
    const primary = steam.get(appid), entities = wd.get(appid) || [], source = byApp.get(appid);
    const rawPrimaryId = primary?.ok ? metacriticResource(primary.metacriticUrl)?.id : null;
    const rawSourceId = source?.resource?.id;
    const oldId = metacriticResource(previous?.url)?.id;
    const blocked = id => !!id && (review?.status === 'hold' || warning && ['reject_current_resource','replace_resource','hold_for_scope_verification','verified_rebrand_with_expanded_scope','verified_lineage_needs_scope_decision'].includes(warning.status) && canonical(id) === canonical(warning.currentCandidateSlug));
    const entityIds = [...new Set(entities.map(r => r.metacriticId).filter(id => id && !blocked(id)).map(canonical))];
    let resourceId = null, proof = [], numericId = null;
    if (review?.status === 'approved') {
      resourceId = review.metacriticId; numericId = review.numericId || null;
      proof = [{kind:'reviewed-id-crosswalk',urls:review.evidenceURLs,reviewedAt:review.reviewedAt,rationale:review.rationale,approvedResourceAliases:review.approvedResourceAliases || []}];
    } else if (oldId && !blocked(oldId)) {
      resourceId = canonical(oldId);
      proof = [{kind:'migrated-approved-id-link',url:previous.url,sourceUrl:previous.sourceUrl,snapshotDate:previous.snapshotDate}];
    } else if (rawSourceId && !blocked(rawSourceId) && (canonical(rawPrimaryId) === canonical(rawSourceId) || entityIds.includes(canonical(rawSourceId)))) {
      resourceId = canonical(rawSourceId);
    } else if (rawPrimaryId && !blocked(rawPrimaryId)) {
      resourceId = canonical(rawPrimaryId);
    } else if (entityIds.length === 1) {
      resourceId = entityIds[0];
    }
    if (resourceId) {
      if (rawPrimaryId && canonical(rawPrimaryId) === resourceId) proof.push({kind:'store-app-id-crosslink',steamAppId:appid,url:primary.sourceUrl,referenceUrl:primary.metacriticUrl,retrievedAt:primary.retrievedAt});
      const matches = entities.filter(r => canonical(r.metacriticId) === resourceId);
      const numericIds = [...new Set(matches.map(r => r.metacriticNumericId).filter(Boolean))];
      const externalNumericIds = numericByResource.get(resourceId);
      if (!numericId && externalNumericIds?.size === 1) numericId = [...externalNumericIds][0];
      if (!numericId && numericIds.length === 1) numericId = numericIds[0];
      for (const r of matches) proof.push({kind:'wikidata-external-ids',qid:r.qid,steamAppId:appid,metacriticId:r.metacriticId,numericId:r.metacriticNumericId,url:r.sourceUrl,retrievedAt:r.retrievedAt});
    }
    const identity = {schemaVersion:1,gameId:g.id,steamAppId:appid,revision:1,status:'missing_score',metacritic:resourceId ? {resourceId,numericId,url:`https://www.metacritic.com/game/${resourceId}/`,editionScope:'Reviewed store product / Metacritic work relationship',evidence:proof} : null,scoreRecordId:null,scorePlatform:null};
    let selected = null;
    const historical = previous?.license === 'CC0 1.0' && oldId && canonical(oldId) === resourceId ? previous : null;
    const supplements = (evidence.supplementalRecords || []).filter(r=>r.steamAppId===appid && canonical(r.metacriticId)===resourceId);
    const group = resourceId ? (byResource.get(resourceId) || []).filter(r=>r.steamAppId===appid || supplements.some(s=>s.sourceRecordId===r.sourceRecordId)) : [];
    for (const supplement of supplements) if (identity.metacritic) identity.metacritic.evidence.push({kind:'reviewed-store-record-crosslink',sourceRecordId:supplement.sourceRecordId,steamAppId:appid,url:supplement.sourceUrl,storeUrl:supplement.storeUrl,retrievedAt:supplement.retrievedAt});
    const direct = group.find(r => r.steamAppId === appid && r.sourceKind === 'steam');
    const distinct = [...new Set(group.map(r => r.userScore))];
    // Prefer the source row for this store app. A different store row may supplement
    // it only after the work ID is established and all available facts agree.
    const fact = direct || (distinct.length === 1 ? group[0] : null);
    const primaryFact = reviewedByGame.get(g.id);
    if (primaryFact) {
      if (!identity.metacritic || canonical(primaryFact.metacriticId) !== resourceId || primaryFact.metacriticNumericId !== numericId) throw Error('Reviewed score lacks the approved external ID relationship: '+g.id);
      const primaryLink = new URL(primaryFact.sourceUrl); primaryLink.searchParams.set('platform','pc');
      selected = {...primaryFact,metacriticId:resourceId,url:primaryLink.toString(),sourceFactUrl:primaryFact.sourceUrl,sourceSteamAppIds:[appid],sourceLabel:'Metacritic (PC kullanıcı puanı)',license:'Source rights retained',verification:'Reviewed primary numerical average, explicit PC platform, joined by persisted catalog / store / Metacritic IDs. Retrieval date is not the score measurement date; cached observations are not live scores.'};
      identity.metacritic.evidence.push({kind:'reviewed-primary-score',recordId:primaryFact.recordId,url:primaryFact.sourceUrl,retrievedAt:primaryFact.retrievedAt,method:primaryFact.provenance.method});
    } else if (historical) {
      const recordId = `mc-user:wikidata:${resourceId}:PC`;
      selected = {...historical,recordId,metric:'user-score',metacriticId:resourceId,metacriticNumericId:numericId,url:identity.metacritic.url+'?platform=pc',sourceFactUrl:historical.url,sourceSteamAppIds:[appid],verification:'Persisted Steam app ID / Metacritic work ID relationship; historical explicitly identified PC user-score fact'};
    } else if (fact) {
      const recordId = `mc-user:steamdb:${fact.sourceRecordId}`;
      selected = {recordId,metric:'user-score',metacriticId:resourceId,metacriticNumericId:numericId,score:fact.userScore,url:identity.metacritic.url,sourceFactUrl:fact.metacriticUrl,sourceRecordId:fact.sourceRecordId,sourceSteamAppIds:fact.steamAppId ? [fact.steamAppId] : [],sourceLabel:'leinstay/steamdb (ikincil kayıt)',sourceUrl:input.sourceUrl,snapshotDate:input.snapshotDate,scoreDate:null,platform:null,license:'GPL-3.0',verification:'Stored game ID / Steam app ID / Metacritic resource ID crosswalk; source row ID joins the user-score fact. No live score or platform verification.'};
    }
    if (selected) {
      const existing = records[selected.recordId];
      if (existing && (existing.metacriticId !== selected.metacriticId || existing.metacriticNumericId !== selected.metacriticNumericId || existing.score !== selected.score)) throw Error('Conflicting score record ID: '+selected.recordId);
      records[selected.recordId] = selected; identity.status = 'ready'; identity.scoreRecordId = selected.recordId; identity.scorePlatform = selected.platform;
      if (!previous) recovered.push({gameId:g.id,steamAppId:appid,name:g.name,metacriticId:resourceId,score:selected.score});
    } else {
      if (!resourceId) identity.status = warning || review?.status === 'hold' || blocked(rawSourceId) ? 'identity_conflict' : 'unverified_identity';
      else if (distinct.length > 1) identity.status = 'conflicting_score_facts';
      identity.reason = identity.status === 'identity_conflict' ? review?.rationale || warning?.rationale : identity.status === 'unverified_identity' ? 'No approved ID crosslink available' : identity.status === 'conflicting_score_facts' ? 'Source rows for this resource disagree; score platform is unknown' : 'No verified user-score fact for the approved Metacritic resource';
      const sourceHadScore = typeof source?.userScore === 'number';
      const sourceGap = sourceHadScore ? 'unusable_source_association' : resourceId ? 'approved_identity_without_score_fact' : 'identity_and_score_fact_unavailable';
      missing.push({gameId:g.id,steamAppId:appid,name:g.name,status:identity.status,metacriticId:resourceId,reason:identity.reason,sourceHadScore,sourceGap,metacriticScoreAvailability:'not_established'});
      if (previous) removed.push({gameId:g.id,steamAppId:appid,name:g.name,reason:identity.reason});
    }
    identities[g.id] = identity;
  }
  const scored = Object.values(identities).filter(r => r.status === 'ready').length;
  const reviewedPrimaryScores = Object.values(records).filter(r=>r.provenance).length;
  const sourceCoverage = {secondaryDatasetScores:Object.values(records).filter(r=>r.license==='GPL-3.0').length,historicalWikidataScores:Object.values(records).filter(r=>r.license==='CC0 1.0').length,reviewedPrimaryScores,missingByStatus:missing.reduce((all,r)=>(all[r.status]=(all[r.status]||0)+1,all),{}),missingWithoutSecondaryFact:missing.filter(r=>!r.sourceHadScore).length,missingWithUnusableSecondaryFact:missing.filter(r=>r.sourceHadScore).length,notice:'Missing from imported sources does not establish absence of a Metacritic user score. Primary cached observations retain their crawl-age labels; retrieval is not a live measurement.'};
  return {identities,records,report:{schemaVersion:2,catalogGames:games.length,previousUserScores:Object.keys(old).length,userScores:scored,distinctScoreRecords:Object.keys(records).length,initiallyMissing:games.length-Object.keys(old).length,initiallyMissingAudited:games.length-Object.keys(old).length,recoveredUserScores:recovered.length,removedInvalidMappings:removed.length,remainingMissing:missing.length,numericIdMappings:Object.values(identities).filter(r=>r.metacritic?.numericId).length,sourceSnapshotDate:input.snapshotDate,reviewedPrimaryScores,sourceCoverage,recovered,removed,missing}};
}

export function refreshScoreFiles() {
  const read = name => JSON.parse(fs.readFileSync(name,'utf8'));
  const games = read('data/catalog.json'), input = read('data/metacritic-score-input.json'), evidence = read('data/metacritic-identity-evidence.json'), reviewed = read('data/metacritic-reviewed-facts.json');
  const result = buildScoreCatalog(games,input,evidence,reviewed);
  const write = (name,data) => fs.writeFileSync(name,JSON.stringify(data,null,2)+'\n');
  write('data/game-identities.json',result.identities);
  write('data/metacritic-users.json',result.records);
  write('data/METACRITIC-REPORT.json',result.report);
  write('public/metacritic-users.json',{schemaVersion:3,license:'GPL-3.0 (secondary subset); CC0 for marked Wikidata entries; source rights retained for reviewed primary numerical observations',attribution:'Numerical facts from leinstay/steamdb; explicit historical Wikidata PC facts; reviewed Metacritic PC user-score observations',sourceRelease:input.downloadUrl,notice:'Records are keyed by source record ID, linked through game-identities.json. Snapshot date is the source import/capture date, not the score measurement date. Primary cached observations retain crawl-age labels. Platform is unknown unless specified. No live Metacritic score feed.',sourceCoverage:result.report.sourceCoverage,scores:result.records});
  write('public/game-identities.json',result.identities);
  const report = read('data/PC-IMPORT-REPORT.json');
  report.userScores = result.report.userScores; report.verifiedHistoricalPcScores = Object.values(result.records).filter(r=>r.license==='CC0 1.0' && r.platform==='PC').length;
  report.reviewedPrimaryPcScores = result.report.reviewedPrimaryScores;
  report.excludedScoreMappings = result.report.missing.filter(r=>r.sourceHadScore); report.scoreIdentityReport = 'METACRITIC-REPORT.json';
  write('data/PC-IMPORT-REPORT.json',report);
  console.log(JSON.stringify({...result.report,recovered:undefined,removed:undefined,missing:undefined}));
  return result;
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) refreshScoreFiles();
