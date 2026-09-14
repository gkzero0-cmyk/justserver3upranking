(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) {
    root.FlowercrabChzzkHotfix = api;
    root.VerifiedChzzkApplicantsHotfix = api;
    if (root.RankingUtils) api.patchRankingUtils(root.RankingUtils);
    if (root.document && typeof root.fetch === 'function') api.install(root);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const REFRESH_MS = 5 * 60 * 1000;
  const VERIFIED_APPLICANTS = Object.freeze({
    flowercrab12: Object.freeze({
      channelName: '꽃게대장',
      channelId: '43e3c57feed0478ff9812109a40f9fe8'
    }),
    changdudn50: Object.freeze({
      channelName: '자율2025',
      channelId: '4b2477f3cf709125fa17ece64ad66ffc'
    }),
    jemin18: Object.freeze({
      channelName: '예준찡',
      channelId: 'e997149e0941aabdefdbaec44ed04a3e'
    }),
    rorobi: Object.freeze({
      channelName: '로로비',
      channelId: 'f8f9c0d0029b58c79eb6070ff501cac1'
    })
  });

  // Backward-compatible exports for the original flowercrab hotfix.
  const USER_ID = 'flowercrab12';
  const CHANNEL_ID = VERIFIED_APPLICANTS[USER_ID].channelId;
  const CHANNEL_URL = `https://chzzk.naver.com/${CHANNEL_ID}`;
  const CHANNEL_NAME = VERIFIED_APPLICANTS[USER_ID].channelName;

  function normalizeUserId(value) {
    return String(value || '').trim().toLowerCase();
  }

  function itemUserId(item) {
    if (typeof item === 'string') return normalizeUserId(item);
    return normalizeUserId(item?.userId ?? item?.user_id ?? item?.writer_id ?? item?.writerId);
  }

  function getVerifiedApplicant(item) {
    const userId = itemUserId(item);
    const config = VERIFIED_APPLICANTS[userId];
    if (!config) return null;
    return {
      userId,
      channelName: config.channelName,
      channelId: config.channelId,
      channelUrl: `https://chzzk.naver.com/${config.channelId}`
    };
  }

  function isVerifiedApplicant(item) {
    return Boolean(getVerifiedApplicant(item));
  }

  function patchRankingUtils(utils) {
    if (!utils || utils.__verifiedChzzkApplicantsPatched) return utils;
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
    utils.__verifiedChzzkApplicantsPatched = true;
    utils.__flowercrabChzzkPatched = true;
    return utils;
  }

  function decorateDetailPayload(payload) {
    if (!payload || !payload.ok) return payload;
    const verified = getVerifiedApplicant(payload);
    if (!verified) return payload;
    return { ...payload, chzzkStationUrl: verified.channelUrl };
  }

  function formatCount(value) {
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? new Intl.NumberFormat('ko-KR').format(Math.round(number)) : '-';
  }

  function install(win) {
    if (!win || !win.document || typeof win.fetch !== 'function' || win.__verifiedChzzkApplicantsHotfixInstalled) return;
    win.__verifiedChzzkApplicantsHotfixInstalled = true;
    win.__flowercrabChzzkHotfixInstalled = true;
    patchRankingUtils(win.RankingUtils);
    const doc = win.document;
    const nativeFetch = win.fetch.bind(win);
    const states = new Map();
    let renderQueued = false;

    function stateFor(userId) {
      let state = states.get(userId);
      if (!state) {
        state = { loading: false, count: null, matched: false, at: 0 };
        states.set(userId, state);
      }
      return state;
    }

    function requestUrl(input) {
      if (typeof input === 'string') return input;
      return String(input?.url || input?.href || '');
    }

    function rowForUser(userId) {
      const triggers = doc.querySelectorAll('.detail-trigger[data-detail-user]');
      for (const trigger of triggers) {
        if (normalizeUserId(trigger.dataset.detailUser) === userId) return trigger.closest('tr[data-rank]');
      }
      return null;
    }

    function ensureFollowerLines() {
      renderQueued = false;
      for (const userId of Object.keys(VERIFIED_APPLICANTS)) {
        const row = rowForUser(userId);
        const stack = row?.querySelector('td.followers .follower-stack');
        if (!stack) continue;

        // Reuse and override a native CHZZK line when the original comment points
        // to an outdated/different channel. User-verified mappings are authoritative.
        let line = stack.querySelector('.follower-line[data-platform="chzzk"]');
        if (!line) {
          line = doc.createElement('div');
          line.className = 'follower-line loading';
          line.dataset.platform = 'chzzk';
          line.innerHTML = '<span class="follower-platform">치지직</span><span class="follower-value">확인 중…</span>';
          stack.appendChild(line);
        }
        line.dataset.verifiedChzzk = userId;

        const state = stateFor(userId);
        const value = line.querySelector('.follower-value');
        line.classList.toggle('loading', state.loading);
        line.classList.toggle('missing', !state.loading && !state.matched);
        if (value) value.textContent = state.loading ? '확인 중…' : state.matched ? formatCount(state.count) : '-';
      }
    }

    function scheduleRender() {
      if (renderQueued) return;
      renderQueued = true;
      const raf = win.requestAnimationFrame || (callback => win.setTimeout(callback, 0));
      raf(ensureFollowerLines);
    }

    async function loadChannel(userId) {
      const verified = getVerifiedApplicant(userId);
      if (!verified) return;
      const state = stateFor(userId);
      if (state.loading || (state.at && Date.now() - state.at < REFRESH_MS)) return;
      state.loading = true;
      scheduleRender();
      try {
        const params = new URLSearchParams({
          name: verified.channelName,
          channelUrl: verified.channelUrl
        });
        const response = await nativeFetch(`/api/chzzk-channel?${params.toString()}`, { cache: 'no-store' });
        const data = await response.json();
        state.matched = Boolean(response.ok && data?.ok && data?.matched && data?.channelId === verified.channelId);
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

    function loadAllChannels() {
      for (const userId of Object.keys(VERIFIED_APPLICANTS)) loadChannel(userId);
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
    loadAllChannels();
  }

  return {
    VERIFIED_APPLICANTS,
    USER_ID,
    CHANNEL_ID,
    CHANNEL_URL,
    CHANNEL_NAME,
    normalizeUserId,
    getVerifiedApplicant,
    isVerifiedApplicant,
    patchRankingUtils,
    decorateDetailPayload,
    formatCount,
    install
  };
});
