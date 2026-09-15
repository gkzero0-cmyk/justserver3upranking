(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root && root.document && typeof root.fetch === 'function') api.install(root);
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const DETAIL_TIMEOUT_MS = 12000;

  function urlText(input) {
    if (typeof input === 'string') return input;
    if (input && typeof input.href === 'string') return input.href;
    if (input && typeof input.url === 'string') return input.url;
    return '';
  }

  function parseUrl(input, base = 'https://justserver.local/') {
    const raw = urlText(input);
    if (!raw) return null;
    try {
      return new URL(raw, base);
    } catch {
      return null;
    }
  }

  function isLegacyDetailUrl(input, base = 'https://justserver.local/') {
    return parseUrl(input, base)?.pathname === '/api/applicant-detail';
  }

  function isCommentsUrl(input, base = 'https://justserver.local/') {
    return parseUrl(input, base)?.pathname === '/api/comments';
  }

  function detailIdentity(input, base = 'https://justserver.local/') {
    const url = parseUrl(input, base);
    if (!url || !/^\/api\/applicant-detail(?:-v2)?$/.test(url.pathname)) return null;
    const commentNo = String(url.searchParams.get('commentNo') || '').trim();
    const userId = String(url.searchParams.get('userId') || '').trim();
    if (!commentNo || !userId) return null;
    return { commentNo, userId };
  }

  function detailCacheKey(commentNo, userId) {
    return `${String(commentNo || '').trim()}:${String(userId || '').trim().toLowerCase()}`;
  }

  function createCommentCache() {
    return new Map();
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

  function jsonHeaders(headers) {
    if (typeof Headers !== 'undefined') {
      const next = new Headers(headers || {});
      next.set('content-type', 'application/json');
      return next;
    }
    return { ...(headers || {}), 'content-type': 'application/json' };
  }

  function buildFastDetailInit(input, init = {}, cache, base = 'https://justserver.local/') {
    const identity = detailIdentity(input, base);
    if (!identity || !(cache instanceof Map)) return init;
    const item = cache.get(detailCacheKey(identity.commentNo, identity.userId));
    if (!item) return init;
    const method = String(init?.method || 'GET').toUpperCase();
    if (method !== 'GET') return init;
    return {
      ...init,
      method: 'POST',
      headers: jsonHeaders(init?.headers),
      body: JSON.stringify({
        commentNo: item.commentNo,
        userId: item.userId,
        userNick: item.userNick,
        applicationComment: item.comment,
        photoUrl: item.photoUrl
      })
    };
  }

  function fetchDetailWithTimeout(fetchFn, args, timeoutMs = DETAIL_TIMEOUT_MS) {
    let timer = null;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => {
        const error = new Error('상세 정보 조회 시간이 초과되었습니다. 다시 시도해주세요.');
        error.name = 'DetailTimeoutError';
        reject(error);
      }, timeoutMs);
    });
    const request = Promise.resolve().then(() => fetchFn(...args));
    return Promise.race([request, timeout]).finally(() => {
      if (timer !== null) clearTimeout(timer);
    });
  }

  function toV2Url(input) {
    const raw = urlText(input);
    return raw.replace(/\/api\/applicant-detail(?=\?|#|$)/, '/api/applicant-detail-v2');
  }

  function rewriteInput(input) {
    if (typeof input === 'string') return toV2Url(input);
    if (typeof URL !== 'undefined' && input instanceof URL) return new URL(toV2Url(input));
    if (typeof Request !== 'undefined' && input instanceof Request) return new Request(toV2Url(input.url), input);
    return input;
  }

  function firstNonEmptyLine(value) {
    return String(value ?? '')
      .split(/\r?\n/)
      .map(line => line.trim())
      .find(Boolean) || '';
  }

  function sanitizeDetailPayload(payload) {
    if (!payload || typeof payload !== 'object' || !payload.ok) return payload;

    let sanitized = payload;
    const originalMoveInFee = String(payload.moveInFee || '').trim();
    const moveInFee = firstNonEmptyLine(originalMoveInFee);
    if (moveInFee && moveInFee !== originalMoveInFee) {
      sanitized = { ...sanitized, moveInFee };
    }

    const originalName = String(payload.name || '').replace(/\p{Cf}/gu, '').trim();
    if (!originalName) return sanitized;
    const originalComment = String(payload.originalComment || '');
    const isChzzk = Boolean(
      String(payload.chzzkStationUrl || '').trim() ||
      /치지직|chzzk|옆동네|chzzk\.naver\.com/iu.test(originalComment)
    );
    if (!isChzzk) return sanitized;

    let markerIndex = originalName.indexOf('>');
    for (const marker of ['＞', '≫', '›', '»', '→', '➡', '➜', '➤']) {
      const index = originalName.indexOf(marker);
      if (index > 0 && (markerIndex <= 0 || index < markerIndex)) markerIndex = index;
    }
    if (markerIndex <= 0) return sanitized;

    const cleaned = originalName.slice(0, markerIndex).trim();
    if (!cleaned || cleaned === originalName) return sanitized;
    return { ...sanitized, name: cleaned };
  }

  async function sanitizeDetailResponse(win, response) {
    if (!response?.ok || typeof response.clone !== 'function' || typeof win?.Response !== 'function' || typeof win?.Headers !== 'function') {
      return response;
    }
    try {
      const payload = await response.clone().json();
      const sanitized = sanitizeDetailPayload(payload);
      if (sanitized === payload) return response;
      const headers = new win.Headers(response.headers);
      headers.delete('content-length');
      return new win.Response(JSON.stringify(sanitized), {
        status: response.status,
        statusText: response.statusText,
        headers
      });
    } catch {
      return response;
    }
  }

  function install(win) {
    if (!win || typeof win.fetch !== 'function' || win.__justserverApplicantDetailV2Installed) return;
    win.__justserverApplicantDetailV2Installed = true;
    const nativeFetch = win.fetch.bind(win);
    const commentCache = createCommentCache();

    win.fetch = async (...args) => {
      const base = win.location?.href || 'https://justserver.local/';

      if (isCommentsUrl(args[0], base)) {
        const response = await nativeFetch(...args);
        if (response?.ok && typeof response.clone === 'function') {
          response.clone().json().then(payload => rememberCommentPayload(commentCache, payload)).catch(() => {});
        }
        return response;
      }

      if (!isLegacyDetailUrl(args[0], base)) return nativeFetch(...args);

      const fastInit = buildFastDetailInit(args[0], args[1] || {}, commentCache, base);
      const v2Args = [rewriteInput(args[0]), fastInit, ...args.slice(2)];
      try {
        const response = await fetchDetailWithTimeout(nativeFetch, v2Args);
        if (response?.ok) return sanitizeDetailResponse(win, response);
      } catch (error) {
        if (error?.name === 'AbortError' || error?.name === 'DetailTimeoutError') throw error;
      }

      const fallbackArgs = [args[0], fastInit, ...args.slice(2)];
      return fetchDetailWithTimeout(nativeFetch, fallbackArgs);
    };
  }

  return {
    DETAIL_TIMEOUT_MS,
    urlText,
    parseUrl,
    isLegacyDetailUrl,
    isCommentsUrl,
    detailIdentity,
    detailCacheKey,
    createCommentCache,
    rememberCommentPayload,
    buildFastDetailInit,
    fetchDetailWithTimeout,
    toV2Url,
    rewriteInput,
    firstNonEmptyLine,
    sanitizeDetailPayload,
    sanitizeDetailResponse,
    install
  };
});
