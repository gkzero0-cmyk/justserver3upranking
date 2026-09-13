const {
  extractChzzkChannelId,
  normalizeChzzkChannelName,
  pickExactChzzkChannel,
  parseChzzkChannel,
  buildChzzkStationUrl
} = require('../chzzk-channel-lookup.js');

const CHZZK_API = 'https://api.chzzk.naver.com/service/v1';
const CACHE_MS = 5 * 60 * 1000;
const cache = new Map();

function queryValue(req, name) {
  const value = req?.query?.[name];
  return String(Array.isArray(value) ? value[0] : value || '').trim();
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      accept: 'application/json, text/plain, */*',
      'accept-language': 'ko-KR,ko;q=0.9,en;q=0.8',
      referer: 'https://chzzk.naver.com/',
      'user-agent': 'Mozilla/5.0 (compatible; JustServerChzzkLookup/1.0)'
    },
    cache: 'no-store'
  });
  if (!response.ok) throw new Error(`CHZZK upstream ${response.status}`);
  return response.json();
}

function cached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.at >= CACHE_MS) {
    cache.delete(key);
    return null;
  }
  return entry.payload;
}

function remember(key, payload) {
  cache.set(key, { at: Date.now(), payload });
  if (cache.size > 300) {
    const cutoff = Date.now() - CACHE_MS;
    for (const [cacheKey, entry] of cache) if (entry.at < cutoff) cache.delete(cacheKey);
  }
}

function resultPayload(channel, source) {
  if (!channel) return { ok: true, matched: false, source };
  return {
    ok: true,
    matched: true,
    source,
    channelId: channel.channelId,
    channelName: channel.channelName,
    followerCount: channel.followerCount,
    stationUrl: buildChzzkStationUrl(channel.channelId),
    channelImageUrl: channel.channelImageUrl || ''
  };
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const name = queryValue(req, 'name');
  const channelUrl = queryValue(req, 'channelUrl');
  if ((!name && !channelUrl) || name.length > 120 || channelUrl.length > 400) {
    return res.status(400).json({ ok: false, error: '유효한 치지직 방송명 또는 방송국 주소가 필요합니다.' });
  }

  try {
    const channelId = extractChzzkChannelId(channelUrl);
    if (channelId) {
      const key = `id:${channelId}`;
      const hit = cached(key);
      if (hit) return res.status(200).json(hit);
      const payload = await fetchJson(`${CHZZK_API}/channels/${encodeURIComponent(channelId)}`);
      const result = resultPayload(parseChzzkChannel(payload), 'comment-url');
      remember(key, result);
      return res.status(200).json(result);
    }

    const normalizedName = normalizeChzzkChannelName(name);
    if (!normalizedName) return res.status(200).json({ ok: true, matched: false, source: 'exact-name-search' });
    const key = `name:${normalizedName}`;
    const hit = cached(key);
    if (hit) return res.status(200).json(hit);

    const searchUrl = new URL(`${CHZZK_API}/search/channels`);
    searchUrl.searchParams.set('keyword', name);
    searchUrl.searchParams.set('size', '50');
    const searchPayload = await fetchJson(searchUrl.toString());
    const exact = pickExactChzzkChannel(searchPayload, name);
    if (!exact) {
      const result = { ok: true, matched: false, source: 'exact-name-search' };
      remember(key, result);
      return res.status(200).json(result);
    }

    let channel = parseChzzkChannel(exact);
    try {
      const detailPayload = await fetchJson(`${CHZZK_API}/channels/${encodeURIComponent(exact.channelId)}`);
      channel = parseChzzkChannel(detailPayload) || channel;
    } catch {}

    const result = resultPayload(channel, 'exact-name-search');
    remember(key, result);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(502).json({ ok: false, error: error?.message || '치지직 방송국 정보를 불러오지 못했습니다.' });
  }
};
