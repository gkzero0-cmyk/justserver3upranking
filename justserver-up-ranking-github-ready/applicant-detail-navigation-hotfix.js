(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.ApplicantDetailNavigationHotfix = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function detailKey(commentNo, userId) {
    return `${String(commentNo || '').trim()}:${String(userId || '').trim().toLowerCase()}`;
  }

  function findNeighbor(items, currentKey, direction) {
    const list = Array.isArray(items) ? items : [];
    const index = list.findIndex(item => item && item.key === currentKey);
    if (index < 0) return null;
    const nextIndex = index + (direction < 0 ? -1 : 1);
    return nextIndex >= 0 && nextIndex < list.length ? list[nextIndex] : null;
  }

  return { detailKey, findNeighbor };
});

(() => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const api = window.ApplicantDetailNavigationHotfix;
  if (!api) return;

  const state = {
    currentKey: '',
    latestDetail: null
  };

  function modalIsOpen() {
    return document.getElementById('applicantDetailModal')?.classList.contains('open');
  }

  function visibleItems() {
    const seen = new Set();
    const items = [];
    document.querySelectorAll('#tbody tr').forEach(row => {
      const trigger = row.querySelector('.detail-trigger[data-detail-comment][data-detail-user]');
      if (!trigger) return;
      const key = api.detailKey(trigger.dataset.detailComment, trigger.dataset.detailUser);
      if (!key || seen.has(key)) return;
      seen.add(key);
      items.push({
        key,
        name: String(row.querySelector('.nick')?.textContent || trigger.dataset.detailUser || '신청자').trim(),
        trigger
      });
    });
    return items;
  }

  function ensureStyle() {
    if (document.getElementById('applicantDetailNavigationHotfixStyle')) return;
    const style = document.createElement('style');
    style.id = 'applicantDetailNavigationHotfixStyle';
    style.textContent = `
      .detail-nav-row{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:-4px 0 16px;min-width:0}
      .detail-nav{position:static;z-index:auto;transform:none;flex:0 1 220px;max-width:46%;min-width:0;height:40px;padding:0 12px;border:1px solid #35435e;border-radius:11px;background:#171e2b;color:#d8e2f6;font-weight:850;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;box-shadow:0 8px 22px rgba(0,0,0,.18)}
      .detail-nav:hover:not(:disabled){border-color:#637eb4;background:#202a3c;color:#fff}.detail-nav:disabled{opacity:.28;cursor:not-allowed}.detail-nav-prev{text-align:left}.detail-nav-next{text-align:right;margin-left:auto}
      @media(max-width:820px){.detail-nav-row{gap:8px;margin:0 0 14px}.detail-nav{height:38px;max-width:48%;padding:0 10px;font-size:11px}}
    `;
    document.head.appendChild(style);
  }

  function ensureButtons() {
    const dialog = document.querySelector('#applicantDetailModal .detail-dialog');
    const content = dialog?.querySelector('.detail-content');
    const grid = content?.querySelector('.detail-grid');
    if (!dialog || !content || !grid) return null;
    ensureStyle();

    let row = content.querySelector('.detail-nav-row');
    if (!row) {
      row = document.createElement('div');
      row.className = 'detail-nav-row';
      row.setAttribute('aria-label', '신청자 상세 이동');
      content.insertBefore(row, grid);
    }

    let prev = dialog.querySelector('[data-detail-nav="-1"]');
    let next = dialog.querySelector('[data-detail-nav="1"]');
    if (!prev) {
      prev = document.createElement('button');
      prev.type = 'button';
      prev.className = 'detail-nav detail-nav-prev';
      prev.dataset.detailNav = '-1';
      prev.setAttribute('aria-label', '이전 신청자 상세 보기');
    }
    if (!next) {
      next = document.createElement('button');
      next.type = 'button';
      next.className = 'detail-nav detail-nav-next';
      next.dataset.detailNav = '1';
      next.setAttribute('aria-label', '다음 신청자 상세 보기');
    }
    if (prev.parentNode !== row) row.appendChild(prev);
    if (next.parentNode !== row) row.appendChild(next);
    return { prev, next };
  }

  function syncNavigation() {
    const buttons = ensureButtons();
    if (!buttons) return;
    const items = visibleItems();
    const prevItem = api.findNeighbor(items, state.currentKey, -1);
    const nextItem = api.findNeighbor(items, state.currentKey, 1);
    const prevText = prevItem ? `← ${prevItem.name}` : '←';
    const nextText = nextItem ? `${nextItem.name} →` : '→';
    const prevTitle = prevItem ? `이전: ${prevItem.name}` : '이전 신청자 없음';
    const nextTitle = nextItem ? `다음: ${nextItem.name}` : '다음 신청자 없음';
    if (buttons.prev.disabled !== !prevItem) buttons.prev.disabled = !prevItem;
    if (buttons.next.disabled !== !nextItem) buttons.next.disabled = !nextItem;
    if (buttons.prev.textContent !== prevText) buttons.prev.textContent = prevText;
    if (buttons.next.textContent !== nextText) buttons.next.textContent = nextText;
    if (buttons.prev.title !== prevTitle) buttons.prev.title = prevTitle;
    if (buttons.next.title !== nextTitle) buttons.next.title = nextTitle;
  }

  function applyChzzkLink() {
    const links = document.querySelector('#applicantDetailBody .detail-links');
    if (!links) return;
    const existing = links.querySelector('[data-chzzk-station-link]');
    const url = String(state.latestDetail?.chzzkStationUrl || '').trim();
    if (!/^https:\/\/chzzk\.naver\.com\/[A-Za-z0-9_-]+$/i.test(url)) {
      existing?.remove();
      return;
    }
    if (existing && existing.href === url) return;
    if (existing) existing.remove();
    const anchor = document.createElement('a');
    anchor.className = 'detail-link';
    anchor.dataset.chzzkStationLink = '1';
    anchor.href = url;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    anchor.textContent = '치지직 방송국 ↗';
    const soop = Array.from(links.querySelectorAll('a.detail-link')).find(item => /SOOP 방송국/.test(item.textContent || ''));
    if (soop) soop.after(anchor); else links.prepend(anchor);
  }

  function navigate(direction) {
    const target = api.findNeighbor(visibleItems(), state.currentKey, direction);
    if (!target?.trigger) return;
    target.trigger.click();
  }

  const nativeFetch = window.fetch.bind(window);
  window.fetch = async (...args) => {
    const response = await nativeFetch(...args);
    const rawUrl = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
    if (String(rawUrl).includes('/api/applicant-detail')) {
      response.clone().json().then(data => {
        if (!data?.ok) return;
        state.latestDetail = data;
        const url = new URL(String(rawUrl), location.href);
        state.currentKey = api.detailKey(url.searchParams.get('commentNo') || data.commentNo, url.searchParams.get('userId') || data.userId);
        queueMicrotask(() => {
          applyChzzkLink();
          syncNavigation();
        });
      }).catch(() => {});
    }
    return response;
  };

  document.addEventListener('click', event => {
    const detailTrigger = event.target.closest('#tbody .detail-trigger[data-detail-comment][data-detail-user]');
    if (detailTrigger) {
      state.currentKey = api.detailKey(detailTrigger.dataset.detailComment, detailTrigger.dataset.detailUser);
      state.latestDetail = null;
      queueMicrotask(syncNavigation);
      return;
    }
    const nav = event.target.closest('[data-detail-nav]');
    if (!nav || nav.disabled) return;
    event.preventDefault();
    navigate(Number(nav.dataset.detailNav));
  }, true);

  document.addEventListener('keydown', event => {
    if (!modalIsOpen() || event.altKey || event.ctrlKey || event.metaKey) return;
    const tag = String(event.target?.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      navigate(-1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      navigate(1);
    }
  }, true);

  const observer = new MutationObserver(() => {
    if (!modalIsOpen()) return;
    applyChzzkLink();
    syncNavigation();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  ensureButtons();
})();
