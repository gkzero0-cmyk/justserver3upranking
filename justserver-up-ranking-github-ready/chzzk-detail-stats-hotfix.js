(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.ChzzkDetailStatsHotfix = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function isChzzkDetail(detail) {
    const text = String(detail?.originalComment || '');
    return Boolean(String(detail?.chzzkStationUrl || '').trim() || /치지직|chzzk|옆동네/iu.test(text));
  }

  function formatFollowerCount(value) {
    if (value === null || value === undefined || String(value).trim() === '') return '정보 없음';
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? new Intl.NumberFormat('ko-KR').format(Math.round(number)) : '정보 없음';
  }

  function buildChzzkLookupUrl(detail) {
    const params = new URLSearchParams();
    const name = String(detail?.name || '').trim();
    const channelUrl = String(detail?.chzzkStationUrl || '').trim();
    if (name) params.set('name', name);
    if (channelUrl) params.set('channelUrl', channelUrl);
    return `/api/chzzk-channel?${params.toString()}`;
  }

  return { isChzzkDetail, formatFollowerCount, buildChzzkLookupUrl };
});

(() => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const api = window.ChzzkDetailStatsHotfix;
  if (!api) return;

  const state = { detail: null, channel: null, loading: false, requestToken: 0 };

  function ensureStyle() {
    if (document.getElementById('chzzk-detail-stats-hotfix-style')) return;
    const style = document.createElement('style');
    style.id = 'chzzk-detail-stats-hotfix-style';
    style.textContent = `
      .detail-field.detail-platform-stats{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:0;padding:0;border:1px solid #273146;border-radius:13px;overflow:hidden;background:#0d131d}
      .detail-platform-stat{padding:15px 16px;min-width:0}.detail-platform-stat+.detail-platform-stat{border-left:1px solid rgba(255,255,255,.08)}
      .detail-platform-stat .detail-label{margin-bottom:7px}.detail-platform-stat .detail-fan{font-size:28px}.detail-platform-stat.chzzk .detail-fan{color:#5de3c2}
      .detail-platform-stat .detail-source{line-height:1.45;min-height:29px}
      @media(max-width:560px){.detail-field.detail-platform-stats{grid-template-columns:1fr}.detail-platform-stat+.detail-platform-stat{border-left:0;border-top:1px solid rgba(255,255,255,.08)}}
    `;
    document.head.appendChild(style);
  }

  function currentSoopCountText() {
    const value = state.detail?.soopFanCount;
    if (value !== null && value !== undefined && Number.isFinite(Number(value))) return api.formatFollowerCount(value);
    if (state.detail?.fanCountSource === 'soop') return api.formatFollowerCount(state.detail?.fanCount);
    return '정보 없음';
  }

  function applyStats() {
    if (!state.detail || !api.isChzzkDetail(state.detail)) return;
    const panel = document.querySelector('#applicantDetailBody .detail-grid .detail-panel');
    const field = panel?.querySelector('.detail-field');
    if (!field) return;
    ensureStyle();

    let left = field.querySelector('[data-platform-stat="soop"]');
    let right = field.querySelector('[data-platform-stat="chzzk"]');
    if (!left || !right) {
      left = document.createElement('div');
      left.className = 'detail-platform-stat soop';
      left.dataset.platformStat = 'soop';
      while (field.firstChild) left.appendChild(field.firstChild);
      right = document.createElement('div');
      right.className = 'detail-platform-stat chzzk';
      right.dataset.platformStat = 'chzzk';
      field.appendChild(left);
      field.appendChild(right);
      field.classList.add('detail-platform-stats');
    }

    const soopFan = left.querySelector('.detail-fan');
    const soopSource = left.querySelector('.detail-source');
    if (soopFan) soopFan.textContent = currentSoopCountText();
    if (soopSource) soopSource.textContent = 'SOOP 방송국의 현재 애청자 · 즐겨찾기 수';

    const chzzkCount = state.loading
      ? '조회 중…'
      : state.channel?.matched
        ? api.formatFollowerCount(state.channel.followerCount)
        : '정보 없음';
    const chzzkSource = state.loading
      ? '치지직 방송국 정보를 확인하고 있습니다.'
      : state.channel?.matched
        ? state.channel.source === 'exact-name-search'
          ? '치지직 현재 팔로워 수 · 방송명 정확 일치'
          : '치지직 방송국의 현재 팔로워 수'
        : '정확히 일치하는 치지직 방송국을 찾지 못했습니다.';
    right.innerHTML = `<div class="detail-label">치지직 팔로워</div><div class="detail-fan">${chzzkCount}</div><div class="detail-source"></div>`;
    right.querySelector('.detail-source').textContent = chzzkSource;
  }

  function applyLink() {
    const links = document.querySelector('#applicantDetailBody .detail-links');
    if (!links) return;
    const url = String(state.channel?.stationUrl || state.detail?.chzzkStationUrl || '').trim();
    let link = links.querySelector('[data-chzzk-station-link]');
    if (!/^https:\/\/chzzk\.naver\.com\/[A-Za-z0-9_-]+$/i.test(url)) {
      if (link && !state.detail?.chzzkStationUrl) link.remove();
      return;
    }
    if (!link) {
      link = document.createElement('a');
      link.className = 'detail-link';
      link.dataset.chzzkStationLink = '1';
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = '치지직 방송국 ↗';
      const soop = Array.from(links.querySelectorAll('a.detail-link')).find(item => /SOOP 방송국/.test(item.textContent || ''));
      if (soop) soop.after(link); else links.prepend(link);
    }
    link.href = url;
  }

  function apply() {
    applyStats();
    applyLink();
  }

  async function lookup(detail, token) {
    state.loading = true;
    state.channel = null;
    apply();
    try {
      const response = await nativeFetch(api.buildChzzkLookupUrl(detail), { cache: 'no-store' });
      const payload = await response.json();
      if (token !== state.requestToken) return;
      state.channel = payload?.ok ? payload : { ok: false, matched: false };
    } catch {
      if (token !== state.requestToken) return;
      state.channel = { ok: false, matched: false };
    } finally {
      if (token !== state.requestToken) return;
      state.loading = false;
      queueMicrotask(apply);
    }
  }

  const nativeFetch = window.fetch.bind(window);
  window.fetch = async (...args) => {
    const response = await nativeFetch(...args);
    const rawUrl = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
    if (String(rawUrl).includes('/api/applicant-detail')) {
      response.clone().json().then(detail => {
        if (!detail?.ok) return;
        state.detail = detail;
        state.channel = null;
        state.loading = false;
        state.requestToken += 1;
        const token = state.requestToken;
        if (api.isChzzkDetail(detail)) lookup(detail, token);
      }).catch(() => {});
    }
    return response;
  };

  const observer = new MutationObserver(() => {
    if (state.detail && api.isChzzkDetail(state.detail)) apply();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
