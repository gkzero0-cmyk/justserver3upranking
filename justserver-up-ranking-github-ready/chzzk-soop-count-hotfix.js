(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) {
    root.ChzzkSoopCountHotfix = api;
    if (root.document) api.install(root);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const REFRESH_MS = 60 * 1000;
  const BATCH_SIZE = 120;

  function collectChzzkSoopUserIds(comments, isChzzkApplicant) {
    if (typeof isChzzkApplicant !== 'function') return [];
    const users = new Set();
    for (const item of comments || []) {
      if (!isChzzkApplicant(item)) continue;
      const userId = String(item?.userId || '').trim();
      if (userId) users.add(userId);
    }
    return [...users].sort();
  }

  function install(win) {
    const doc = win?.document;
    if (!doc || win.__justserverChzzkSoopCountHotfixInstalled || typeof win.fetch !== 'function') return;
    win.__justserverChzzkSoopCountHotfixInstalled = true;

    const nativeFetch = win.fetch.bind(win);
    let signature = '';
    let attemptedAt = 0;
    let request = null;

    async function fetchCounts(userIds) {
      const merged = {};
      for (let index = 0; index < userIds.length; index += BATCH_SIZE) {
        const chunk = userIds.slice(index, index + BATCH_SIZE);
        const response = await nativeFetch('/api/soop-favorite-counts', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ userIds: chunk }),
          cache: 'no-store'
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (!data?.ok || !data.counts || typeof data.counts !== 'object') throw new Error('invalid response');
        Object.assign(merged, data.counts);
      }
      return merged;
    }

    function emitCounts(counts) {
      if (!counts || typeof counts !== 'object') return;
      if (typeof win.CustomEvent === 'function' && typeof win.dispatchEvent === 'function') {
        win.dispatchEvent(new win.CustomEvent('justserver:soop-favorite-counts', { detail: { counts } }));
      }
    }

    function refresh(comments) {
      const userIds = collectChzzkSoopUserIds(comments, win.RankingUtils?.isChzzkApplicant);
      if (!userIds.length || request) return;
      const nextSignature = userIds.join(',');
      const now = Date.now();
      if (nextSignature === signature && now - attemptedAt < REFRESH_MS) return;
      signature = nextSignature;
      attemptedAt = now;
      request = fetchCounts(userIds)
        .then(emitCounts)
        .catch(() => {})
        .finally(() => { request = null; });
    }

    win.fetch = async (...args) => {
      const response = await nativeFetch(...args);
      try {
        const input = args[0];
        const requestUrl = typeof input === 'string' ? input : input?.url || '';
        if (String(requestUrl).includes('/api/comments')) {
          response.clone().json().then(data => {
            if (Array.isArray(data?.comments)) refresh(data.comments);
          }).catch(() => {});
        }
      } catch {}
      return response;
    };
  }

  return { REFRESH_MS, BATCH_SIZE, collectChzzkSoopUserIds, install };
});
