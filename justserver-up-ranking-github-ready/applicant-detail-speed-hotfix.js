(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) {
    root.ApplicantDetailSpeedHotfix = api;
    if (root.document && typeof root.fetch === 'function') api.install(root);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const DETAIL_MEMORY_CACHE_MS = 3 * 60 * 1000;
  const DETAIL_PREFETCH_LIMIT = 2;

  function urlText(input) {
    if (typeof input === 'string') return input;
    if (input && typeof input.url === 'string') return input.url;
    if (input && typeof input.href === 'string') return input.href;
    return '';
  }

  function parseUrl(input, base = 'https://justserver.local/') {
    try {
      const raw = urlText(input);
      return raw ? new URL(raw, base) : null;
    } catch {
      return null;
    }
  }

  function isCommentsRequest(input, base) {
    return parseUrl(input, base)?.pathname === '/api/comments';
  }

  function isDetailRequest(input, base) {
    return /^\/api\/applicant-detail(?:-v2)?$/.test(parseUrl(input, base)?.pathname || '');
  }

  function detailCacheKey(commentNo, userId) {
    return `${String(commentNo || '').trim()}:${String(userId || '').trim().toLowerCase()}`;
  }

  function toCount(value) {
    if (value === null || value === undefined || value === '') return null;
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? Math.round(number) : null;
  }

  function createDetailMemoryCache() {
    return new Map();
  }

  function putCachedDetail(cache, key, payload, now = Date.now()) {
    if (!(cache instanceof Map) || !key || !payload || typeof payload !== 'object') return payload;
    cache.set(String(key), { payload, cachedAt: Number(now) || Date.now() });
    while (cache.size > 300) cache.delete(cache.keys().next().value);
    return payload;
  }

  function getCachedDetail(cache, key, now = Date.now(), ttlMs = DETAIL_MEMORY_CACHE_MS) {
    if (!(cache instanceof Map) || !key) return null;
    const entry = cache.get(String(key));
    if (!entry) return null;
    if ((Number(now) || Date.now()) - Number(entry.cachedAt || 0) >= ttlMs) {
      cache.delete(String(key));
      return null;
    }
    return entry.payload || null;
  }

  function rememberCommentPayload(cache, payload) {
    if (!(cache instanceof Map) || !Array.isArray(payload?.comments)) return cache;
    for (const item of payload.comments) {
      const commentNo = String(item?.commentNo || '').trim();
      const userId = String(item?.userId || '').trim();
      if (!commentNo || !userId) continue;
      cache.set(detailCacheKey(commentNo, userId), {
        commentNo,
        userId,
        userNick: String(item?.userNick || '').trim(),
        comment: String(item?.comment || ''),
        photoUrl: String(item?.photoUrl || '').trim()
      });
    }
    return cache;
  }

  function requestBodyItem(init, identity) {
    try {
      const body = typeof init?.body === 'string' ? JSON.parse(init.body) : null;
      const comment = String(body?.applicationComment || '').trim();
      if (!body || !comment) return null;
      return {
        commentNo: String(body.commentNo || identity?.commentNo || '').trim(),
        userId: String(body.userId || identity?.userId || '').trim(),
        userNick: String(body.userNick || '').trim(),
        comment,
        photoUrl: String(body.photoUrl || '').trim()
      };
    } catch {
      return null;
    }
  }

  function detailIdentity(input, init, base) {
    const url = parseUrl(input, base);
    if (!url || !/^\/api\/applicant-detail(?:-v2)?$/.test(url.pathname)) return null;
    let commentNo = String(url.searchParams.get('commentNo') || '').trim();
    let userId = String(url.searchParams.get('userId') || '').trim();
    if ((!commentNo || !userId) && typeof init?.body === 'string') {
      try {
        const body = JSON.parse(init.body);
        commentNo ||= String(body?.commentNo || '').trim();
        userId ||= String(body?.userId || '').trim();
      } catch {}
    }
    return commentNo && userId ? { commentNo, userId, key: detailCacheKey(commentNo, userId) } : null;
  }

  function buildOptimisticDetail(item, liveSoopCount, detailUtils, verifiedApi) {
    if (!item) return null;
    const commentNo = String(item.commentNo || '').trim();
    const userId = String(item.userId || '').trim();
    const userNick = String(item.userNick || userId || '신청자').trim();
    const comment = String(item.comment || '').trim();
    if (!commentNo || !userId || !comment) return null;

    let parsed = { name: userNick, declaredFanCount: null, message: comment, moveInFee: '' };
    try {
      if (typeof detailUtils?.parseApplicationComment === 'function') {
        parsed = detailUtils.parseApplicationComment(comment, userNick) || parsed;
      }
    } catch {}

    let name = String(parsed?.name || userNick || userId || '신청자').trim();
    try {
      const override = String(detailUtils?.resolveDetailNameOverride?.(userId) || '').trim();
      if (override) name = override;
    } catch {}

    let chzzkStationUrl = '';
    let isChzzk = false;
    try {
      chzzkStationUrl = String(detailUtils?.extractChzzkStationUrl?.(comment) || '').trim();
      isChzzk = Boolean(detailUtils?.isChzzkApplication?.(comment) || chzzkStationUrl);
    } catch {}
    try {
      const verified = verifiedApi?.getVerifiedApplicant?.({ userId });
      if (verified?.channelUrl) {
        chzzkStationUrl = String(verified.channelUrl);
        isChzzk = true;
      }
    } catch {}

    const current = toCount(liveSoopCount);
    const declared = toCount(parsed?.declaredFanCount);
    const fanCount = isChzzk && declared !== null ? declared : (current ?? declared);
    const fanCountSource = isChzzk && declared !== null
      ? 'chzzk-application'
      : current !== null
        ? 'soop'
        : declared !== null
          ? 'application'
          : '';
    const photoUrl = /^https?:\/\//i.test(String(item.photoUrl || '')) ? String(item.photoUrl) : '';

    return {
      ok: true,
      apiVersion: 'preview',
      optimistic: true,
      name,
      userId,
      commentNo,
      fanCount,
      soopFanCount: current,
      fanCountSource,
      declaredFanCount: declared,
      message: String(parsed?.message || comment || '정보 없음').trim(),
      moveInFee: String(parsed?.moveInFee || '정보 없음').trim(),
      originalComment: comment,
      photoUrl,
      chzzkStationUrl,
      commentUrl: `https://www.sooplive.com/station/chunbongtv/post/204274449#comment_noti${encodeURIComponent(commentNo)}`,
      stationUrl: `https://www.sooplive.com/station/${encodeURIComponent(userId)}`,
      fetchedAt: new Date().toISOString()
    };
  }

  function neighborPrefetchTargets(items, currentKey) {
    const list = Array.isArray(items) ? items : [];
    const index = list.findIndex(item => item && item.key === currentKey);
    if (index < 0) return [];
    const result = [];
    const seen = new Set();
    for (const candidate of [list[index - 1], list[index + 1]]) {
      if (!candidate?.commentNo || !candidate?.userId || !candidate?.key || seen.has(candidate.key)) continue;
      seen.add(candidate.key);
      result.push(candidate);
      if (result.length >= DETAIL_PREFETCH_LIMIT) break;
    }
    return result;
  }

  function responseFromPayload(win, payload, headerValue = 'preview') {
    if (typeof win?.Response !== 'function') return null;
    const headers = typeof win.Headers === 'function' ? new win.Headers() : { 'content-type': 'application/json' };
    if (headers?.set) {
      headers.set('content-type', 'application/json; charset=utf-8');
      headers.set('x-justserver-detail-speed', headerValue);
    }
    return new win.Response(JSON.stringify(payload), { status: 200, headers });
  }

  function install(win) {
    if (!win?.document || typeof win.fetch !== 'function' || win.__justserverApplicantDetailSpeedInstalled) return;
    win.__justserverApplicantDetailSpeedInstalled = true;

    const doc = win.document;
    const nativeFetch = win.fetch.bind(win);
    const commentCache = new Map();
    const detailCache = createDetailMemoryCache();
    const inflight = new Map();
    const detailUtils = win.ApplicantDetailUtils || null;
    const verifiedApi = win.VerifiedChzzkApplicantsHotfix || null;

    win.__justserverApplicantDetailSpeedStats = {
      previews: 0,
      memoryHits: 0,
      backgroundFetches: 0,
      prefetched: 0
    };

    function liveSoopCount(userId) {
      const counts = win.__justserverSoopFavoriteCounts || {};
      return toCount(counts[userId] ?? counts[String(userId || '').toLowerCase()]);
    }

    async function cacheResponse(key, response) {
      if (!response?.ok || typeof response.clone !== 'function') return null;
      try {
        const payload = await response.clone().json();
        if (payload?.ok) putCachedDetail(detailCache, key, payload);
        return payload;
      } catch {
        return null;
      }
    }

    function backgroundFetch(args, key) {
      if (!key || inflight.has(key)) return inflight.get(key) || null;
      win.__justserverApplicantDetailSpeedStats.backgroundFetches += 1;
      const promise = Promise.resolve()
        .then(() => nativeFetch(...args))
        .then(async response => {
          await cacheResponse(key, response);
          return response;
        })
        .catch(() => null)
        .finally(() => inflight.delete(key));
      inflight.set(key, promise);
      return promise;
    }

    function itemFor(identity, init) {
      return commentCache.get(identity.key) || requestBodyItem(init, identity);
    }

    function visibleItems() {
      const items = [];
      const seen = new Set();
      for (const row of doc.querySelectorAll('#tbody tr[data-rank]')) {
        if (row.hidden) continue;
        const style = typeof win.getComputedStyle === 'function' ? win.getComputedStyle(row) : null;
        if (style && (style.display === 'none' || style.visibility === 'hidden')) continue;
        const trigger = row.querySelector('.detail-trigger[data-detail-comment][data-detail-user]');
        if (!trigger) continue;
        const commentNo = String(trigger.dataset.detailComment || '').trim();
        const userId = String(trigger.dataset.detailUser || '').trim();
        const key = detailCacheKey(commentNo, userId);
        if (!commentNo || !userId || seen.has(key)) continue;
        seen.add(key);
        items.push({ key, commentNo, userId });
      }
      return items;
    }

    function prefetchItem(target) {
      if (!target?.key || getCachedDetail(detailCache, target.key) || inflight.has(target.key)) return;
      const item = commentCache.get(target.key);
      if (!item?.comment) return;
      const params = new URLSearchParams({ commentNo: target.commentNo, userId: target.userId, prefetch: '1' });
      const args = [`/api/applicant-detail-v2?${params.toString()}`, {
        method: 'POST',
        cache: 'no-store',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          commentNo: item.commentNo,
          userId: item.userId,
          userNick: item.userNick,
          applicationComment: item.comment,
          photoUrl: item.photoUrl || ''
        })
      }];
      win.__justserverApplicantDetailSpeedStats.prefetched += 1;
      backgroundFetch(args, target.key);
    }

    function scheduleNeighborPrefetch(currentKey) {
      const run = () => {
        for (const target of neighborPrefetchTargets(visibleItems(), currentKey)) prefetchItem(target);
      };
      if (typeof win.requestIdleCallback === 'function') win.requestIdleCallback(run, { timeout: 1200 });
      else win.setTimeout(run, 350);
    }

    win.fetch = async (...args) => {
      const base = win.location?.href || 'https://justserver.local/';
      if (isCommentsRequest(args[0], base)) {
        const response = await nativeFetch(...args);
        if (response?.ok && typeof response.clone === 'function') {
          response.clone().json().then(payload => rememberCommentPayload(commentCache, payload)).catch(() => {});
        }
        return response;
      }

      if (!isDetailRequest(args[0], base)) return nativeFetch(...args);
      const identity = detailIdentity(args[0], args[1], base);
      if (!identity) return nativeFetch(...args);

      const cached = getCachedDetail(detailCache, identity.key);
      if (cached) {
        win.__justserverApplicantDetailSpeedStats.memoryHits += 1;
        scheduleNeighborPrefetch(identity.key);
        return responseFromPayload(win, cached, 'memory') || nativeFetch(...args);
      }

      const item = itemFor(identity, args[1]);
      const preview = buildOptimisticDetail(item, liveSoopCount(identity.userId), detailUtils, verifiedApi);
      if (!preview) {
        const response = await nativeFetch(...args);
        await cacheResponse(identity.key, response);
        return response;
      }

      win.__justserverApplicantDetailSpeedStats.previews += 1;
      backgroundFetch(args, identity.key);
      scheduleNeighborPrefetch(identity.key);
      return responseFromPayload(win, preview, 'preview') || nativeFetch(...args);
    };
  }

  return {
    DETAIL_MEMORY_CACHE_MS,
    DETAIL_PREFETCH_LIMIT,
    urlText,
    parseUrl,
    isCommentsRequest,
    isDetailRequest,
    detailCacheKey,
    toCount,
    createDetailMemoryCache,
    putCachedDetail,
    getCachedDetail,
    rememberCommentPayload,
    requestBodyItem,
    detailIdentity,
    buildOptimisticDetail,
    neighborPrefetchTargets,
    responseFromPayload,
    install
  };
});