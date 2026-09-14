const { formatApplicationDetail, normalizeFanCount } = require('../applicant-detail-utils.js');
const { repairStructuredDetail } = require('../applicant-detail-v2-normalizer.js');

const CHANNEL_ID = 'chunbongtv';
const POST_ID = '204274449';
const SOOP_API = `https://chapi.sooplive.co.kr/api/${CHANNEL_ID}/title/${POST_ID}/comment`;
const POST_URL = `https://www.sooplive.com/station/${CHANNEL_ID}/post/${POST_ID}`;
const DETAIL_CACHE_MS = 30 * 1000;
const BUILD_REVISION = '2026-09-14d';
const detailCache = new Map();

function queryValue(req, name) {
  const value = req?.query?.[name];
  return String(Array.isArray(value) ? value[0] : value || '').trim();
}

function bodyValue(req, name) {
  const value = req?.body?.[name];
  return String(Array.isArray(value) ? value[0] : value || '').trim();
}

function rawCommentNo(raw) {
  return String(raw?.p_comment_no ?? raw?.comment_no ?? raw?.commentNo ?? raw?.comment_id ?? raw?.commentId ?? '').trim();
}

function rawUserId(raw) {
  return String(raw?.user_id ?? raw?.userId ?? raw?.writer_id ?? raw?.writerId ?? '').trim();
}

function requestRawComment(req, commentNo, userId) {
  const applicationComment = bodyValue(req, 'applicationComment');
  if (!applicationComment || applicationComment.length > 30000) return null;
  const bodyCommentNo = bodyValue(req, 'commentNo');
  const bodyUserId = bodyValue(req, 'userId');
  if (bodyCommentNo && bodyCommentNo !== commentNo) return null;
  if (bodyUserId && bodyUserId.toLowerCase() !== userId.toLowerCase()) return null;
  const userNick = bodyValue(req, 'userNick').slice(0, 200);
  const requestedPhotoUrl = bodyValue(req, 'photoUrl').slice(0, 2000);
  const photoUrl = /^https?:\/\//i.test(requestedPhotoUrl) ? requestedPhotoUrl : '';
  return { commentNo, userId, userNick, comment: applicationComment, photo: photoUrl };
}

function rawFromRequest(req, commentNo, userId) {
  return requestRawComment(req, commentNo, userId);
}

function sanitizeV2Name(detail) {
  const originalName = String(detail?.name || '').replace(/\p{Cf}/gu, '').trim();
  if (!originalName) return '';
  const originalComment = String(detail?.originalComment || '');
  const isChzzk = Boolean(String(detail?.chzzkStationUrl || '').trim() || /치지직|chzzk|옆동네/iu.test(originalComment));
  if (!isChzzk) return originalName;

  const asciiRedirect = originalName.indexOf('>');
  if (asciiRedirect > 0) {
    const candidate = originalName.slice(0, asciiRedirect).trim();
    if (candidate) return candidate;
  }

  for (const marker of ['＞', '≫', '›', '»', '→', '➡', '➜', '➤']) {
    const markerIndex = originalName.indexOf(marker);
    if (markerIndex <= 0) continue;
    const candidate = originalName.slice(0, markerIndex).trim();
    if (candidate) return candidate;
  }

  return originalName;
}

async function fetchJson(url, referer) {
  const options = {
    headers: {
      accept: 'application/json, text/plain, */*',
      'accept-language': 'ko-KR,ko;q=0.9,en;q=0.8',
      referer,
      'user-agent': 'Mozilla/5.0 (compatible; JustServerApplicantDetailV2/2.0)'
    },
    cache: 'no-store'
  };
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    options.signal = AbortSignal.timeout(8000);
  }
  const response = await fetch(url, options);
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

function currentSoopFanCount(station) {
  return normalizeFanCount(
    station?.station?.upd?.fan_cnt ?? station?.upd?.fan_cnt ?? station?.fan_cnt ?? station?.fanCount
  );
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

async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('X-Applicant-Detail-Version', '2');
  res.setHeader('X-Applicant-Detail-Build', BUILD_REVISION);

  const commentNo = queryValue(req, 'commentNo') || bodyValue(req, 'commentNo');
  const userId = queryValue(req, 'userId') || bodyValue(req, 'userId');
  if (!/^\d{1,20}$/.test(commentNo) || !/^[A-Za-z0-9._-]{1,80}$/.test(userId)) {
    return res.status(400).json({ ok: false, error: '유효한 신청 댓글 번호와 방송국 아이디가 필요합니다.' });
  }

  const cacheKey = `${commentNo}:${userId.toLowerCase()}`;
  const now = Date.now();
  const cached = getCached(cacheKey, now);
  if (cached) return res.status(200).json(cached);

  try {
    const stationPromise = fetchStation(userId).catch(() => null);
    const raw = rawFromRequest(req, commentNo, userId) || await findComment(commentNo);
    if (!raw) return res.status(404).json({ ok: false, error: '신청 댓글을 찾지 못했습니다.' });

    const actualUserId = rawUserId(raw) || userId;
    let station = await stationPromise;
    if (actualUserId.toLowerCase() !== userId.toLowerCase()) {
      station = await fetchStation(actualUserId).catch(() => null);
    }

    const detail = repairStructuredDetail(formatApplicationDetail(raw, station));
    const sanitizedName = sanitizeV2Name(detail);
    if (sanitizedName) detail.name = sanitizedName;
    const finalUserId = detail.userId || actualUserId;
    const payload = {
      ok: true,
      apiVersion: 'v2',
      apiBuild: BUILD_REVISION,
      ...detail,
      name: sanitizeV2Name(detail) || detail.name,
      userId: finalUserId,
      fanCountSource: detail.fanCountSource,
      soopFanCount: currentSoopFanCount(station),
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
      apiVersion: 'v2',
      apiBuild: BUILD_REVISION,
      error: error?.message || '신청자 상세 정보를 불러오지 못했습니다.',
      fetchedAt: new Date().toISOString()
    });
  }
}

module.exports = handler;
module.exports._test = { apiVersion: 'v2', buildRevision: BUILD_REVISION, requestRawComment, rawFromRequest, rawCommentNo, rawUserId, sanitizeV2Name };
