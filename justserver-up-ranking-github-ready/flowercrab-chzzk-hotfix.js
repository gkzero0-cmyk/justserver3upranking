(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) {
    root.FlowercrabChzzkHotfix = api;
    if (root.RankingUtils) api.patchRankingUtils(root.RankingUtils);
    if (root.document && typeof root.fetch === 'function') api.install(root);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const USER_ID = 'flowercrab12';
  const CHANNEL_ID = '43e3c57feed0478ff9812109a40f9fe8';
  const CHANNEL_URL = `https://chzzk.naver.com/${CHANNEL_ID}`;
  const CHANNEL_NAME = '꽃게대장';
  const REFRESH_MS = 5 * 60 * 1000;

  function normalizeUserId(value) {
    return String(value || '').trim().toLowerCase();
  }

  function isVerifiedApplicant(item) {
    return normalizeUserId(item?.userId ?? item?.user_id ?? item?.writer_id ?? item?.writerId) === USER_ID;
  }

  function patchRankingUtils(utils) {
    if (!utils || utils.__flowercrabChzzkPatched) return utils;
    const originalIsChzzkApplicant = typeof utils.isChzzkApplicant === 'function'
      ? utils.isChzzkApplicant.bind(utils)
      : () => false;
    utils.isChzzkApplicant = item => isVerifiedApplicant(item) || originalIsChzzkApplicant(item);
    utils.countChzzkApplicants = comments => {
      const applicants = new Set();
      for (const item of comments || []) {
        if (!utils.isChzzkApplicant(item)) continue;
        const userId = String(item?.userId || '').trim();
        const key = userId ? `user:${userId}` : (typeof utils.favoriteKey === 'function' ? utils.favoriteKey(item) : '');
        if (key) applicants.add(key);
      }
      return applicants.size;
    };
    utils.__flowercrabChzzkPatched = true;
    return utils;
  }

  function decorateDetailPayload(payload) {
    if (!payload || !payload.ok || !isVerifiedApplicant(payload)) return payload;
    return { ...payload, chzzkStationUrl: CHANNEL_URL };
  }

  function formatCount(value) {
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? new Intl.NumberFormat('ko-KR').format(Math.round(number)) : '-';
  }

  function install(win) {
    if (!win || !win.document || typeof win.fetch !== 'function' || win.__flowercrabChzzkHotfixInstalled) return;
    win.__flowercrabChzzkHotfixInstalled = true;
    patchRankingUtils(win.RankingUtils);
    const doc = win.document;
    const nativeFetch = win.fetch.bind(win);
    const state = { loading: false, count: null, matched: false, at: 0 };
    let renderQueued = false;

    function requestUrl(input) {
      if (typeof input === 'string') return input;
      return String(input?.url || input?.href || '');
    }

    function followerRow() {
      const triggers = doc.querySelectorAll('.detail-trigger[data-detail-user]');
      for (const trigger of triggers) {
        if (normalizeUserId(trigger.dataset.detailUser) === USER_ID) return trigger.closest('tr[data-rank]');
      }
      return null;
    }

    function ensureFollowerLine() {
      renderQueued = false;
      const row = followerRow();
      const stack = row?.querySelector('td.followers .follower-stack');
      if (!stack) return;
      const nativeLine = stack.querySelector('.follower-line[data-platform="chzzk"]:not([data-flowercrab-chzzk])');
      if (nativeLine) return;
      let line = stack.querySelector('[data-flowercrab-chzzk]');
      if (!line) {
        line = doc.createElement('div');
        line.className = 'follower-line loading';
        line.dataset.platform = 'chzzk';
        line.dataset.flowercrabChzzk = '1';
        line.innerHTML = '<span class="follower-platform">치지직</span><span class="follower-value">확인 중…</span>';
        stack.appendChild(line);
      }
      const value = line.querySelector('.follower-value');
      line.classList.toggle('loading', state.loading);
      line.classList.toggle('missing', !state.loading && !state.matched);
      if (value) value.textContent = state.loading ? '확인 중…' : state.matched ? formatCount(state.count) : '-';
    }

    function scheduleRender() {
      if (renderQueued) return;
      renderQueued = true;
      const raf = win.requestAnimationFrame || (callback => win.setTimeout(callback, 0));
      raf(ensureFollowerLine);
    }

    async function loadChannel() {
      if (state.loading || (state.at && Date.now() - state.at < REFRESH_MS)) return;
      state.loading = true;
      scheduleRender();
      try {
        const params = new URLSearchParams({ name: CHANNEL_NAME, channelUrl: CHANNEL_URL });
        const response = await nativeFetch(`/api/chzzk-channel?${params.toString()}`, { cache: 'no-store' });
        const data = await response.json();
        state.matched = Boolean(response.ok && data?.ok && data?.matched && data?.channelId === CHANNEL_ID);
        state.count = state.matched ? data.followerCount : null;
      } catch {
        state.matched = false;
        state.count = null;
      } finally {
        state.loading = false;
        state.at = Date.now();
        scheduleRender();
      }
    }

    win.fetch = async (...args) => {
      const response = await nativeFetch(...args);
      const url = requestUrl(args[0]);
      if (!/\/api\/applicant-detail(?:-v2)?(?:\?|#|$)/.test(url)) return response;
      try {
        const payload = await response.clone().json();
        const decorated = decorateDetailPayload(payload);
        if (decorated === payload || typeof win.Response !== 'function') return response;
        const headers = new win.Headers(response.headers);
        headers.delete('content-length');
        return new win.Response(JSON.stringify(decorated), {
          status: response.status,
          statusText: response.statusText,
          headers
        });
      } catch {
        return response;
      }
    };

    const tbody = doc.getElementById('tbody');
    if (tbody && win.MutationObserver) new win.MutationObserver(scheduleRender).observe(tbody, { childList: true, subtree: true });
    scheduleRender();
    loadChannel();
  }

  return {
    USER_ID,
    CHANNEL_ID,
    CHANNEL_URL,
    CHANNEL_NAME,
    isVerifiedApplicant,
    patchRankingUtils,
    decorateDetailPayload,
    formatCount,
    install
  };
});
