const CACHE_MS = 60 * 1000;
const MAX_USER_IDS = 120;
const CONCURRENCY = 8;
const stationCache = new Map();

function normalizeFanCount(value) {
  if (typeof value === 'number') return Number.isFinite(value) && value >= 0 ? Math.round(value) : null;
  const raw = String(value ?? '').replace(/\s+/g, '');
  if (!raw) return null;
  const plain = raw.match(/[0-9][0-9,]*/);
  if (!plain) return null;
  const number = Number(plain[0].replace(/,/g, ''));
  return Number.isFinite(number) && number >= 0 ? Math.round(number) : null;
}

function requestedUserIds(req) {
  const fromBody = Array.isArray(req?.body?.userIds) ? req.body.userIds : [];
  const rawQuery = req?.query?.userIds;
  const fromQuery = Array.isArray(rawQuery) ? rawQuery : String(rawQuery || '').split(',');
  const source = fromBody.length ? fromBody : fromQuery;
  const seen = new Set();
  const ids = [];
  for (const value of source) {
    const id = String(value || '').trim();
    if (!/^[A-Za-z0-9._-]{1,80}$/.test(id)) continue;
    const key = id.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    ids.push(id);
    if (ids.length >= MAX_USER_IDS) break;
  }
  return ids;
}

async function fetchStationCount(userId) {
  const url = `https://bjapi.afreecatv.com/api/${encodeURIComponent(userId)}/station`;
  const response = await fetch(url, {
    headers: {
      accept: 'application/json, text/plain, */*',
      'accept-language': 'ko-KR,ko;q=0.9,en;q=0.8',
      referer: `https://www.sooplive.com/station/${encodeURIComponent(userId)}`,
      'user-agent': 'Mozilla/5.0 (compatible; JustServerSOOPFavoriteCounts/1.0)'
    },
    cache: 'no-store'
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`SOOP station ${response.status}: ${body.slice(0, 80)}`);
  }
  const station = await response.json();
  return normalizeFanCount(
    station?.station?.upd?.fan_cnt ?? station?.upd?.fan_cnt ?? station?.fan_cnt ?? station?.fanCount
  );
}

async function currentCount(userId, now) {
  const key = userId.toLowerCase();
  const cached = stationCache.get(key);
  if (cached && now - cached.cachedAt < CACHE_MS) return cached.count;
  try {
    const count = await fetchStationCount(userId);
    stationCache.set(key, { count, cachedAt: now });
    return count;
  } catch {
    stationCache.set(key, { count: null, cachedAt: now });
    return null;
  }
}

async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let next = 0;
  async function run() {
    while (true) {
      const index = next++;
      if (index >= items.length) return;
      results[index] = await worker(items[index], index);
    }
  }
  const runners = Array.from({ length: Math.min(limit, items.length) }, () => run());
  await Promise.all(runners);
  return results;
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req?.method === 'OPTIONS') {
    if (typeof res.status === 'function') res.status(204);
    return typeof res.end === 'function' ? res.end() : undefined;
  }

  const userIds = requestedUserIds(req);
  if (!userIds.length) {
    return res.status(400).json({ ok: false, error: '유효한 SOOP 방송국 아이디가 필요합니다.' });
  }

  const now = Date.now();
  const pairs = await mapWithConcurrency(
    userIds,
    CONCURRENCY,
    async userId => [userId, await currentCount(userId, now)]
  );
  const counts = Object.fromEntries(pairs);
  return res.status(200).json({
    ok: true,
    counts,
    total: userIds.length,
    resolved: Object.values(counts).filter(value => Number.isFinite(value)).length,
    fetchedAt: new Date().toISOString()
  });
};

module.exports._test = { normalizeFanCount, requestedUserIds, mapWithConcurrency };
