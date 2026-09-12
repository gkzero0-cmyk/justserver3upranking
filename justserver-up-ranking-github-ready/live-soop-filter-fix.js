(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root && root.document) api.installLiveSoopFilterFix(root);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  const LIVE_SOOP_REFRESH_MS = 60 * 1000;

  function toCount(value) {
    if (value === null || value === undefined || value === '') return null;
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? Math.round(number) : null;
  }

  function resolveVerifiedLowSoopApplicants(comments, liveCounts, limit = 500, utils) {
    const max = Number(limit);
    const counts = liveCounts instanceof Map ? liveCounts : new Map(Object.entries(liveCounts || {}));
    const lowUsers = new Set();
    const lowKeys = new Set();
    if (!Number.isFinite(max) || max < 0 || !utils) return { users: [], keys: [] };

    for (const item of comments || []) {
      if (!utils.isLowSoopFavoriteApplicant(item, max)) continue;
      const userId = String(item?.userId || '').trim();
      if (!userId || !counts.has(userId)) continue;
      const current = toCount(counts.get(userId));
      if (current === null || current > max) continue;
      lowUsers.add(userId);
      lowKeys.add(utils.favoriteKey(item));
    }

    return { users: [...lowUsers], keys: [...lowKeys] };
  }

  function installLiveSoopFilterFix(win) {
    const doc = win?.document;
    const utils = win?.RankingUtils;
    if (!doc || !utils || win.__justserverLiveSoopFilterFixInstalled) return;
    if (typeof utils.isLowSoopFavoriteApplicant !== 'function' || typeof utils.favoriteKey !== 'function') return;

    win.__justserverLiveSoopFilterFixInstalled = true;
    const originalFetch = win.fetch;
    if (typeof originalFetch !== 'function') return;

    const tbody = doc.getElementById('tbody');
    const countNode = doc.getElementById('lowSoopFavoriteCount');
    let latestComments = [];
    let liveCounts = new Map();
    let verifiedUsers = new Set();
    let verifiedKeys = new Set();
    let liveSignature = '';
    let liveFetchedAt = 0;
    let liveRequest = null;
    let dataReady = false;
    let applyScheduled = false;

    function candidateUserIds(comments) {
      const users = new Set();
      for (const item of comments || []) {
        if (!utils.isLowSoopFavoriteApplicant(item, 500)) continue;
        const userId = String(item?.userId || '').trim();
        if (userId) users.add(userId);
      }
      return [...users].sort();
    }

    function rowMatches(row) {
      const detail = row.querySelector('[data-detail-user]');
      const userId = detail?.getAttribute('data-detail-user') || '';
      if (userId) return verifiedUsers.has(userId);
      const favoriteButton = row.querySelector('.favorite-btn[data-favorite-key]');
      const key = favoriteButton?.getAttribute('data-favorite-key') || '';
      return Boolean(key && verifiedKeys.has(key));
    }

    function apply() {
      applyScheduled = false;
      if (countNode) countNode.textContent = dataReady ? `${verifiedUsers.size}명` : '확인 중…';
      if (!tbody) return;
      for (const row of tbody.querySelectorAll('tr[data-rank]')) {
        row.setAttribute('data-low-soop', rowMatches(row) ? '1' : '0');
      }
    }

    function scheduleApply() {
      if (applyScheduled) return;
      applyScheduled = true;
      const raf = win.requestAnimationFrame || (callback => win.setTimeout(callback, 0));
      raf(() => raf(apply));
    }

    function applyVerifiedCounts() {
      const verified = resolveVerifiedLowSoopApplicants(latestComments, liveCounts, 500, utils);
      verifiedUsers = new Set(verified.users);
      verifiedKeys = new Set(verified.keys);
      dataReady = true;
      scheduleApply();
    }

    async function refreshLiveCounts(comments) {
      const userIds = candidateUserIds(comments);
      if (!userIds.length) {
        liveCounts = new Map();
        verifiedUsers = new Set();
        verifiedKeys = new Set();
        dataReady = true;
        scheduleApply();
        return;
      }

      const signature = userIds.join(',');
      const now = Date.now();
      if (signature === liveSignature && now - liveFetchedAt < LIVE_SOOP_REFRESH_MS) {
        if (liveFetchedAt > 0) applyVerifiedCounts();
        return;
      }
      if (liveRequest) return;

      liveSignature = signature;
      dataReady = false;
      scheduleApply();

      liveRequest = originalFetch.call(win, '/api/soop-favorite-counts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ userIds }),
        cache: 'no-store'
      })
        .then(response => response.ok ? response.json() : Promise.reject(new Error(`HTTP ${response.status}`)))
        .then(data => {
          if (!data?.ok || !data.counts || typeof data.counts !== 'object') throw new Error('invalid response');
          liveCounts = new Map(Object.entries(data.counts));
          liveFetchedAt = Date.now();
          applyVerifiedCounts();
        })
        .catch(() => {
          liveCounts = new Map();
          verifiedUsers = new Set();
          verifiedKeys = new Set();
          liveFetchedAt = Date.now();
          dataReady = true;
          if (countNode) countNode.textContent = '확인 실패';
          scheduleApply();
        })
        .finally(() => { liveRequest = null; });
    }

    function onComments(comments) {
      latestComments = Array.isArray(comments) ? comments : [];
      if (liveFetchedAt > 0) applyVerifiedCounts();
      refreshLiveCounts(latestComments);
    }

    win.fetch = async function (...args) {
      const response = await originalFetch.apply(this, args);
      try {
        const request = args[0];
        const requestUrl = typeof request === 'string' ? request : request?.url || '';
        if (String(requestUrl).includes('/api/comments')) {
          response.clone().json().then(data => {
            if (Array.isArray(data?.comments)) onComments(data.comments);
          }).catch(() => {});
        }
      } catch {}
      return response;
    };

    if (tbody && win.MutationObserver) {
      new win.MutationObserver(scheduleApply).observe(tbody, { childList: true, subtree: true });
    }

    scheduleApply();
  }

  return { LIVE_SOOP_REFRESH_MS, toCount, resolveVerifiedLowSoopApplicants, installLiveSoopFilterFix };
});
