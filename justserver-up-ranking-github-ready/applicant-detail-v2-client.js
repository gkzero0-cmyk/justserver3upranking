(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root && root.document && typeof root.fetch === 'function') api.install(root);
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function urlText(input) {
    if (typeof input === 'string') return input;
    if (input && typeof input.href === 'string') return input.href;
    if (input && typeof input.url === 'string') return input.url;
    return '';
  }

  function isLegacyDetailUrl(input, base = 'https://justserver.local/') {
    const raw = urlText(input);
    if (!raw) return false;
    try {
      return new URL(raw, base).pathname === '/api/applicant-detail';
    } catch {
      return false;
    }
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

  function sanitizeDetailPayload(payload) {
    if (!payload || typeof payload !== 'object' || !payload.ok) return payload;
    const originalName = String(payload.name || '').replace(/\p{Cf}/gu, '').trim();
    if (!originalName) return payload;
    const originalComment = String(payload.originalComment || '');
    const isChzzk = Boolean(
      String(payload.chzzkStationUrl || '').trim() ||
      /치지직|chzzk|옆동네|chzzk\.naver\.com/iu.test(originalComment)
    );
    if (!isChzzk) return payload;

    let markerIndex = originalName.indexOf('>');
    for (const marker of ['＞', '≫', '›', '»', '→', '➡', '➜', '➤']) {
      const index = originalName.indexOf(marker);
      if (index > 0 && (markerIndex <= 0 || index < markerIndex)) markerIndex = index;
    }
    if (markerIndex <= 0) return payload;

    const cleaned = originalName.slice(0, markerIndex).trim();
    if (!cleaned || cleaned === originalName) return payload;
    return { ...payload, name: cleaned };
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
    win.fetch = async (...args) => {
      const base = win.location?.href || 'https://justserver.local/';
      if (!isLegacyDetailUrl(args[0], base)) return nativeFetch(...args);
      const v2Args = [rewriteInput(args[0]), ...args.slice(1)];
      try {
        const response = await nativeFetch(...v2Args);
        if (response?.ok) return sanitizeDetailResponse(win, response);
      } catch {}
      return nativeFetch(...args);
    };
  }

  return { urlText, isLegacyDetailUrl, toV2Url, rewriteInput, sanitizeDetailPayload, sanitizeDetailResponse, install };
});
