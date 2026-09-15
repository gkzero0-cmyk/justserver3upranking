(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) {
    root.ApplicantDetailOriginalGuard = api;
    if (root.document && typeof root.fetch === 'function') api.install(root);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
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

  function detailKey(commentNo, userId) {
    return `${String(commentNo || '').trim()}:${String(userId || '').trim().toLowerCase()}`;
  }

  function detailIdentity(input, init, base = 'https://justserver.local/') {
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
    if (!commentNo || !userId) return null;
    return { commentNo, userId, key: detailKey(commentNo, userId) };
  }

  function isPrefetchRequest(input, base = 'https://justserver.local/') {
    const url = parseUrl(input, base);
    return Boolean(url && /^\/api\/applicant-detail(?:-v2)?$/.test(url.pathname) && url.searchParams.get('prefetch') === '1');
  }

  function shouldAcceptDetailRequest(input, activeKey, init, base = 'https://justserver.local/') {
    if (isPrefetchRequest(input, base)) return false;
    const identity = detailIdentity(input, init, base);
    return Boolean(identity && identity.key === String(activeKey || ''));
  }

  function rememberCommentPayload(cache, payload) {
    if (!(cache instanceof Map) || !Array.isArray(payload?.comments)) return cache;
    for (const item of payload.comments) {
      const commentNo = String(item?.commentNo || '').trim();
      const userId = String(item?.userId || '').trim();
      const comment = String(item?.comment || '').trim();
      if (!commentNo || !userId || !comment) continue;
      cache.set(detailKey(commentNo, userId), comment);
    }
    return cache;
  }

  function getCachedOriginal(cache, key) {
    if (!(cache instanceof Map)) return '';
    return String(cache.get(String(key || '')) || '').trim();
  }

  function requestBodyOriginal(init) {
    if (typeof init?.body !== 'string') return '';
    try {
      return String(JSON.parse(init.body)?.applicationComment || '').trim();
    } catch {
      return '';
    }
  }

  function install(win) {
    if (!win?.document || typeof win.fetch !== 'function' || win.__justserverApplicantDetailOriginalGuardInstalled) return;
    win.__justserverApplicantDetailOriginalGuardInstalled = true;
    const doc = win.document;
    const nativeFetch = win.fetch.bind(win);
    const commentCache = new Map();
    let activeKey = '';
    let activeOriginal = '';
    let applyQueued = false;

    function ensureOriginalPanel() {
      const detailBody = doc.getElementById('applicantDetailBody');
      const content = detailBody?.querySelector('.detail-content');
      const panel = content?.querySelector('.detail-grid .detail-panel');
      if (!panel || !activeKey) return;

      let wrap = panel.querySelector('[data-detail-original]');
      if (!activeOriginal) {
        if (wrap) wrap.remove();
        return;
      }
      if (!wrap) {
        wrap = doc.createElement('div');
        wrap.className = 'detail-original';
        wrap.setAttribute('data-detail-original', '1');
        const button = doc.createElement('button');
        button.type = 'button';
        button.className = 'detail-original-toggle';
        button.setAttribute('data-detail-original-toggle', '1');
        button.setAttribute('aria-expanded', 'false');
        button.textContent = '신청 댓글 원문 보기';
        const body = doc.createElement('pre');
        body.className = 'detail-original-body';
        body.hidden = true;
        wrap.append(button, body);
        const links = panel.querySelector('.detail-links');
        panel.insertBefore(wrap, links || null);
      }
      const body = wrap.querySelector('.detail-original-body');
      if (body && body.textContent !== activeOriginal) body.textContent = activeOriginal;
      wrap.dataset.detailOriginalKey = activeKey;
    }

    function scheduleApply() {
      if (applyQueued) return;
      applyQueued = true;
      (win.requestAnimationFrame || (cb => win.setTimeout(cb, 0)))(() => {
        applyQueued = false;
        ensureOriginalPanel();
      });
    }

    win.fetch = async (...args) => {
      const base = win.location?.href || 'https://justserver.local/';
      const url = parseUrl(args[0], base);
      if (url?.pathname === '/api/comments') {
        const response = await nativeFetch(...args);
        if (response?.ok && typeof response.clone === 'function') {
          response.clone().json().then(payload => rememberCommentPayload(commentCache, payload)).catch(() => {});
        }
        return response;
      }

      const identity = detailIdentity(args[0], args[1], base);
      const prefetch = isPrefetchRequest(args[0], base);
      if (!identity) return nativeFetch(...args);

      if (!prefetch) {
        activeKey = identity.key;
        activeOriginal = getCachedOriginal(commentCache, activeKey) || requestBodyOriginal(args[1]);
        scheduleApply();
      }

      const response = await nativeFetch(...args);
      if (!prefetch && identity.key === activeKey && response?.ok && typeof response.clone === 'function') {
        response.clone().json().then(data => {
          if (!data?.ok) return;
          const responseKey = detailKey(data.commentNo || identity.commentNo, data.userId || identity.userId);
          if (responseKey !== activeKey) return;
          const original = String(data.originalComment || '').trim();
          if (original) activeOriginal = original;
          scheduleApply();
        }).catch(() => {});
      }
      return response;
    };

    const detailBody = doc.getElementById('applicantDetailBody');
    if (detailBody && win.MutationObserver) {
      new win.MutationObserver(scheduleApply).observe(detailBody, { childList: true, subtree: true });
    }
  }

  return {
    urlText,
    parseUrl,
    detailKey,
    detailIdentity,
    isPrefetchRequest,
    shouldAcceptDetailRequest,
    rememberCommentPayload,
    getCachedOriginal,
    requestBodyOriginal,
    install
  };
});
