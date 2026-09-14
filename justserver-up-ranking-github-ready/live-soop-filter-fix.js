(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root && root.document) api.installLiveSoopFilterFix(root);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  const LIVE_SOOP_REFRESH_MS = 60 * 1000;
  const SOOP_BATCH_SIZE = 120;
  const VERIFIED_DUAL_PLATFORM_SOOP_USERS = new Set(['h66rogi']);

  function toCount(value) {
    if (value === null || value === undefined || value === '') return null;
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? Math.round(number) : null;
  }

  function filterStatusText(dataReady, loadError, count) {
    if (loadError) return '확인 실패';
    if (!dataReady) return '확인 중…';
    return `${Math.max(0, Number(count) || 0)}명`;
  }

  function commentText(item) {
    return String(item?.comment || '').replace(/<br\s*\/?\s*>/gi, '\n').replace(/<[^>]+>/g, '').trim();
  }

  function hasExplicitSoopCount(text) {
    return /(?:SOOP|숲|아프리카(?:TV)?)(?:\s*(?:애청자|즐겨찾기|즐찾|팔로워?|팔로우|팬)(?:\s*수)?)?\s*[:：-]?\s*[0-9]/iu.test(text);
  }

  function isClearlyChzzkOnlyApplicant(item) {
    const userId = String(item?.userId || '').trim().toLowerCase();
    if (VERIFIED_DUAL_PLATFORM_SOOP_USERS.has(userId)) return false;
    const text = commentText(item);
    if (!text) return false;
    if (hasExplicitSoopCount(text)) return false;
    return /치지직|chzzk|옆동네/iu.test(text);
  }

  function chunkUserIds(userIds, size = SOOP_BATCH_SIZE) {
    const limit = Math.max(1, Number(size) || SOOP_BATCH_SIZE);
    const chunks = [];
    for (let index = 0; index < (userIds || []).length; index += limit) {
      chunks.push(userIds.slice(index, index + limit));
    }
    return chunks;
  }

  function resolveVerifiedLowSoopApplicants(comments, liveCounts, limit = 500, utils) {
    const max = Number(limit);
    const counts = liveCounts instanceof Map ? liveCounts : new Map(Object.entries(liveCounts || {}));
    const lowUsers = new Set();
    const lowKeys = new Set();
    if (!Number.isFinite(max) || max < 0 || !utils) return { users: [], keys: [] };

    for (const item of comments || []) {
      if (isClearlyChzzkOnlyApplicant(item)) continue;
      const userId = String(item?.userId || '').trim();
      if (!userId || !counts.has(userId)) continue;
      const current = toCount(counts.get(userId));
      if (current === null || current > max) continue;
      lowUsers.add(userId);
      lowKeys.add(utils.favoriteKey(item));
    }

    return { users: [...lowUsers], keys: [...lowKeys] };
  }

  function ensureAuthoritativeStyle(doc) {
    if (!doc || doc.getElementById('low-soop-authoritative-style')) return;
    const style = doc.createElement('style');
    style.id = 'low-soop-authoritative-style';
    style.textContent = `
      #tbody.low-soop-filter-active[data-low-soop-live-ready="0"] tr[data-rank]{display:none!important}
      #tbody.low-soop-filter-active[data-low-soop-live-ready="1"] tr[data-rank]{display:none!important}
      #tbody.low-soop-filter-active[data-low-soop-live-ready="1"] tr[data-rank][data-low-soop-live="1"]{display:table-row!important}
    `;
    (doc.head || doc.documentElement).appendChild(style);
  }

  function installLiveSoopFilterFix(win) {
    const doc = win?.document;
    const utils = win?.RankingUtils;
    if (!doc || !utils || win.__justserverLiveSoopFilterFixInstalled) return;
    if (typeof utils.favoriteKey !== 'function') return;

    win.__justserverLiveSoopFilterFixInstalled = true;
    const originalFetch = win.fetch;
    if (typeof originalFetch !== 'function') return;

    ensureAuthoritativeStyle(doc);
    const tbody = doc.getElementById('tbody');
    const countNode = doc.getElementById('lowSoopFavoriteCount');
    const lowButton = doc.querySelector('.low-soop-filter-btn');
    let latestComments = [];
    let liveCounts = new Map();
    let verifiedUsers = new Set();
    let verifiedKeys = new Set();
    let liveSignature = '';
    let liveFetchedAt = 0;
    let liveRequest = null;
    let dataReady = false;
    let loadError = false;
    let applyScheduled = false;

    function candidateUserIds(comments) {
      const users = new Set();
      for (const item of comments || []) {
        if (isClearlyChzzkOnlyApplicant(item)) continue;
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

    function repairAuthoritativeUi() {
      const status = filterStatusText(dataReady, loadError, verifiedUsers.size);
      if (countNode && countNode.textContent !== status) countNode.textContent = status;
      if (!tbody) return;
      const readyValue = dataReady && !loadError ? '1' : '0';
      if (tbody.getAttribute('data-low-soop-live-ready') !== readyValue) tbody.setAttribute('data-low-soop-live-ready', readyValue);
      for (const row of tbody.querySelectorAll('tr[data-rank]')) {
        const lowValue = rowMatches(row) ? '1' : '0';
        if (row.getAttribute('data-low-soop-live') !== lowValue) row.setAttribute('data-low-soop-live', lowValue);
        if (row.getAttribute('data-low-soop') !== lowValue) row.setAttribute('data-low-soop', lowValue);
      }
    }

    function apply() {
      applyScheduled = false;
      repairAuthoritativeUi();
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
      loadError = false;
      dataReady = true;
      repairAuthoritativeUi();
    }

    async function fetchCountChunks(userIds) {
      const merged = {};
      for (const chunk of chunkUserIds(userIds)) {
        const response = await originalFetch.call(win, '/api/soop-favorite-counts', {
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

    async function refreshLiveCounts(comments) {
      const userIds = candidateUserIds(comments);
      if (!userIds.length) {
        liveCounts = new Map();
        verifiedUsers = new Set();
        verifiedKeys = new Set();
        loadError = false;
        dataReady = true;
        repairAuthoritativeUi();
        return;
      }

      const signature = userIds.join(',');
      const now = Date.now();
      if (signature === liveSignature && now - liveFetchedAt < LIVE_SOOP_REFRESH_MS) {
        if (liveFetchedAt > 0) applyVerifiedCounts();
        return;
      }
      if (liveRequest) return;

      const hadVerifiedSnapshot = dataReady && !loadError && liveFetchedAt > 0;
      liveSignature = signature;
      loadError = false;
      if (!hadVerifiedSnapshot) {
        dataReady = false;
        scheduleApply();
      }

      liveRequest = fetchCountChunks(userIds)
        .then(counts => {
          liveCounts = new Map(Object.entries(counts));
          liveFetchedAt = Date.now();
          applyVerifiedCounts();
        })
        .catch(() => {
          if (hadVerifiedSnapshot) {
            liveFetchedAt = Date.now();
            dataReady = true;
            loadError = false;
            scheduleApply();
            return;
          }
          liveCounts = new Map();
          verifiedUsers = new Set();
          verifiedKeys = new Set();
          liveFetchedAt = 0;
          liveSignature = '';
          loadError = true;
          dataReady = true;
          scheduleApply();
        })
        .finally(() => { liveRequest = null; });
    }

    function onComments(comments) {
      latestComments = Array.isArray(comments) ? comments : [];
      if (liveFetchedAt > 0 && !loadError) applyVerifiedCounts();
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
      new win.MutationObserver(repairAuthoritativeUi).observe(tbody, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['data-low-soop']
      });
    }
    if (countNode && win.MutationObserver) {
      new win.MutationObserver(repairAuthoritativeUi).observe(countNode, { childList: true, characterData: true, subtree: true });
    }
    if (lowButton) lowButton.addEventListener('click', repairAuthoritativeUi);

    scheduleApply();
  }

  return {
    LIVE_SOOP_REFRESH_MS,
    SOOP_BATCH_SIZE,
    toCount,
    filterStatusText,
    isClearlyChzzkOnlyApplicant,
    chunkUserIds,
    resolveVerifiedLowSoopApplicants,
    installLiveSoopFilterFix
  };
});
