const { formatApplicationDetail } = require('../applicant-detail-utils.js');

const CHANNEL_ID = 'chunbongtv';
const POST_ID = '204274449';
const SOOP_API = `https://chapi.sooplive.co.kr/api/${CHANNEL_ID}/title/${POST_ID}/comment`;
const POST_URL = `https://www.sooplive.com/station/${CHANNEL_ID}/post/${POST_ID}`;
const DETAIL_CACHE_MS = 30 * 1000;
const detailCache = new Map();

function queryValue(req, name) {
  const value = req?.query?.[name];
  return String(Array.isArray(value) ? value[0] : value || '').trim();
}

function rawCommentNo(raw) {
  return String(raw?.p_comment_no ?? raw?.comment_no ?? raw?.commentNo ?? raw?.comment_id ?? raw?.commentId ?? '').trim();
}

function rawUserId(raw) {
  return String(raw?.user_id ?? raw?.userId ?? raw?.writer_id ?? raw?.writerId ?? '').trim();
}

async function fetchJson(url, referer) {
  const response = await fetch(url, {
    headers: {
      accept: 'application/json, text/plain, */*',
      'accept-language': 'ko-KR,ko;q=0.9,en;q=0.8',
      referer,
      'user-agent': 'Mozilla/5.0 (compatible; JustServerApplicantDetail/1.0)'
    },
    cache: 'no-store'
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`upstream ${response.status}: ${body.slice(0, 120)}`);
  }
  return response.json();
}

async function fetchCommentPage(page) {
  const url = new URL(SOOP_API);
  url.searchParams.set('page', String(page));
  url.searchParams.set('orderby', 'reg_date');
  return fetchJson(url, POST_URL);
}

function findInPage(payload, commentNo) {
  const rows = Array.isArray(payload?.data) ? payload.data : [];
  return rows.find(row => rawCommentNo(row) === commentNo) || null;
}

async function findComment(commentNo) {
  const first = await fetchCommentPage(1);
  const firstMatch = findInPage(first, commentNo);
  if (firstMatch) return firstMatch;

  const lastPage = Math.max(1, Number(first?.meta?.last_page || 1));
  const maxPages = Math.min(lastPage, 200);
  for (let start = 2; start <= maxPages; start += 10) {
    const pages = [];
    for (let page = start; page < start + 10 && page <= maxPages; page++) pages.push(fetchCommentPage(page));
    const results = await Promise.all(pages);
    for (const result of results) {
      const match = findInPage(result, commentNo);
      if (match) return match;
    }
  }
  return null;
}

async function fetchStation(userId) {
  const url = `https://bjapi.afreecatv.com/api/${encodeURIComponent(userId)}/station`;
  return fetchJson(url, `https://www.sooplive.com/station/${encodeURIComponent(userId)}`);
}

function getCached(key, now) {
  const cached = detailCache.get(key);
  if (!cached) return null;
  if (now - cached.cachedAt >= DETAIL_CACHE_MS) {
    detailCache.delete(key);
    return null;
  }
  return cached.payload;
}

function putCached(key, payload, now) {
  detailCache.set(key, { payload, cachedAt: now });
  if (detailCache.size > 200) {
    for (const [cacheKey, entry] of detailCache) {
      if (now - entry.cachedAt >= DETAIL_CACHE_MS) detailCache.delete(cacheKey);
    }
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const commentNo = queryValue(req, 'commentNo');
  const userId = queryValue(req, 'userId');
  if (!/^\d{1,20}$/.test(commentNo) || !/^[A-Za-z0-9._-]{1,80}$/.test(userId)) {
    return res.status(400).json({ ok: false, error: '유효한 신청 댓글 번호와 방송국 아이디가 필요합니다.' });
  }

  const cacheKey = `${commentNo}:${userId.toLowerCase()}`;
  const now = Date.now();
  const cached = getCached(cacheKey, now);
  if (cached) return res.status(200).json(cached);

  try {
    const stationPromise = fetchStation(userId).catch(() => null);
    const raw = await findComment(commentNo);
    if (!raw) return res.status(404).json({ ok: false, error: '신청 댓글을 찾지 못했습니다.' });

    const actualUserId = rawUserId(raw) || userId;
    let station = await stationPromise;
    if (actualUserId.toLowerCase() !== userId.toLowerCase()) {
      station = await fetchStation(actualUserId).catch(() => null);
    }

    // The public station JSON exposes the current SOOP favorite/fan count as fan_cnt.
    const currentFanCount = station?.fan_cnt;
    const stationForDetail = station ? { ...station, fan_cnt: currentFanCount } : null;
    const detail = formatApplicationDetail(raw, stationForDetail);
    const finalUserId = detail.userId || actualUserId;
    const payload = {
      ok: true,
      ...detail,
      userId: finalUserId,
      fanCountSource: detail.fanCountSource,
      photoUrl: detail.photoUrl,
      commentUrl: `${POST_URL}#comment_noti${encodeURIComponent(commentNo)}`,
      stationUrl: `https://www.sooplive.com/station/${encodeURIComponent(finalUserId)}`,
      fetchedAt: new Date().toISOString()
    };

    putCached(cacheKey, payload, now);
    return res.status(200).json(payload);
  } catch (error) {
    return res.status(502).json({
      ok: false,
      error: error?.message || '신청자 상세 정보를 불러오지 못했습니다.',
      fetchedAt: new Date().toISOString()
    });
  }
};
