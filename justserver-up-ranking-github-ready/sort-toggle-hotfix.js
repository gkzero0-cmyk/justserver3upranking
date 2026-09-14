(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) {
    root.SortToggleHotfix = api;
    if (root.document) api.install(root);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const DEFAULT_DIRECTIONS = Object.freeze({ up: 'desc', newest: 'desc', followers: 'desc' });
  const SORT_LABELS = Object.freeze({ up: 'UP순', newest: '최신순', followers: '즐겨찾기순' });

  function toCount(value) {
    if (value === null || value === undefined || value === '') return null;
    const number = Number(String(value).replace(/,/g, '').trim());
    return Number.isFinite(number) && number >= 0 ? Math.round(number) : null;
  }

  function parseSortTime(value) {
    if (!value) return 0;
    const raw = String(value).trim();
    const naive = raw.match(/^(\d{4})[.-](\d{1,2})[.-](\d{1,2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
    if (naive) {
      const [, y, m, d, hh = '0', mm = '0', ss = '0'] = naive;
      return Date.UTC(Number(y), Number(m) - 1, Number(d), Number(hh) - 9, Number(mm), Number(ss));
    }
    const parsed = Date.parse(raw.replace(/\./g, '-'));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function countFor(counts, userId) {
    const key = String(userId || '').trim();
    if (!key) return null;
    const value = counts instanceof Map ? counts.get(key) : counts?.[key];
    return toCount(value);
  }

  function sortApplicants(items, mode, direction, counts) {
    const list = [...(items || [])];
    const selected = Object.prototype.hasOwnProperty.call(DEFAULT_DIRECTIONS, mode) ? mode : 'up';
    const dir = direction === 'asc' ? 'asc' : 'desc';
    return list.sort((a, b) => {
      if (selected === 'followers') {
        const ac = countFor(counts, a?.userId);
        const bc = countFor(counts, b?.userId);
        const aKnown = ac !== null;
        const bKnown = bc !== null;
        if (aKnown !== bKnown) return aKnown ? -1 : 1;
        if (aKnown && bKnown && ac !== bc) return dir === 'asc' ? ac - bc : bc - ac;
      } else if (selected === 'newest') {
        const at = parseSortTime(a?.regDate);
        const bt = parseSortTime(b?.regDate);
        if (at !== bt) return dir === 'asc' ? at - bt : bt - at;
      } else {
        const ar = Number(a?.rank);
        const br = Number(b?.rank);
        if (Number.isFinite(ar) && Number.isFinite(br) && ar !== br) return dir === 'asc' ? br - ar : ar - br;
      }
      const ar = Number(a?.rank);
      const br = Number(b?.rank);
      if (Number.isFinite(ar) && Number.isFinite(br) && ar !== br) return ar - br;
      return Number(b?.up || 0) - Number(a?.up || 0);
    });
  }

  function nextSortState(state, clickedMode) {
    const mode = Object.prototype.hasOwnProperty.call(DEFAULT_DIRECTIONS, clickedMode) ? clickedMode : 'up';
    if (state?.mode === mode) return { mode, direction: state.direction === 'asc' ? 'desc' : 'asc' };
    return { mode, direction: DEFAULT_DIRECTIONS[mode] };
  }

  function detailKey(commentNo, userId) {
    return `${String(commentNo || '').trim()}:${String(userId || '').trim().toLowerCase()}`;
  }

  function install(win) {
    const doc = win?.document;
    if (!doc || win.__justserverSortToggleHotfixInstalled || typeof win.fetch !== 'function') return;
    const tabs = doc.querySelector('.sort-tabs');
    const tbody = doc.getElementById('tbody');
    if (!tabs || !tbody) return;
    win.__justserverSortToggleHotfixInstalled = true;

    tabs.querySelector('.sort-btn[data-sort="oldest"]')?.remove();

    const staleFollower = tabs.querySelector('.sort-btn[data-sort="followers"]');
    const followerButton = doc.createElement('button');
    followerButton.className = 'sort-btn';
    followerButton.type = 'button';
    followerButton.dataset.sort = 'followers';
    followerButton.textContent = SORT_LABELS.followers;
    if (staleFollower) staleFollower.replaceWith(followerButton);
    else {
      const favoriteFilter = doc.getElementById('favoriteFilterBtn');
      if (favoriteFilter) tabs.insertBefore(followerButton, favoriteFilter);
      else tabs.appendChild(followerButton);
    }

    const buttons = [...tabs.querySelectorAll('.sort-btn')].filter(button => Object.prototype.hasOwnProperty.call(DEFAULT_DIRECTIONS, button.dataset.sort));
    const nativeFetch = win.fetch.bind(win);
    let state = { mode: 'up', direction: 'desc' };
    let scheduled = false;
    let commentMeta = new Map();

    function updateLabels() {
      for (const button of buttons) {
        const mode = button.dataset.sort;
        const base = SORT_LABELS[mode];
        button.textContent = mode === state.mode ? `${base} ${state.direction === 'asc' ? '↑' : '↓'}` : base;
      }
    }

    function rowData(row) {
      const trigger = row.querySelector('.detail-trigger[data-detail-comment][data-detail-user]');
      const userId = String(trigger?.dataset.detailUser || '').trim();
      const commentNo = String(trigger?.dataset.detailComment || '').trim();
      const cached = commentMeta.get(detailKey(commentNo, userId)) || {};
      const followerText = row.querySelector('td.followers .follower-line[data-platform="soop"] .follower-value')?.textContent || '';
      return {
        userId,
        commentNo,
        rank: Number(row.dataset.rank || 0),
        up: Number(cached.up || 0),
        regDate: cached.regDate || '',
        followerCount: toCount(followerText),
        row
      };
    }

    function applySort() {
      scheduled = false;
      const rows = [...tbody.querySelectorAll('tr[data-rank]')];
      if (!rows.length) return;
      const items = rows.map(rowData);
      const counts = {};
      for (const item of items) if (item.userId) counts[item.userId] = item.followerCount;
      const sortedRows = sortApplicants(items, state.mode, state.direction, counts).map(item => item.row);
      for (const cutRow of tbody.querySelectorAll('.cut-row')) cutRow.hidden = !(state.mode === 'up' && state.direction === 'desc');
      if (rows.length < 2 || rows.every((row, index) => row === sortedRows[index])) return;
      const trailing = [...tbody.children].find(node => node.tagName === 'TR' && !node.matches('tr[data-rank]')) || null;
      for (const row of sortedRows) tbody.insertBefore(row, trailing);
    }

    function scheduleSort() {
      if (scheduled) return;
      scheduled = true;
      const raf = win.requestAnimationFrame || (callback => win.setTimeout(callback, 0));
      raf(applySort);
    }

    function cacheComments(comments) {
      const next = new Map();
      for (const item of comments || []) {
        const key = detailKey(item?.commentNo, item?.userId);
        if (!key || key === ':') continue;
        next.set(key, { regDate: String(item?.regDate || ''), up: Number(item?.up || 0) });
      }
      commentMeta = next;
      scheduleSort();
    }

    for (const button of buttons) {
      button.addEventListener('click', () => {
        state = nextSortState(state, button.dataset.sort);
        const defer = typeof win.queueMicrotask === 'function' ? win.queueMicrotask.bind(win) : callback => win.setTimeout(callback, 0);
        defer(() => {
          updateLabels();
          scheduleSort();
        });
      });
    }

    win.fetch = async (...args) => {
      const response = await nativeFetch(...args);
      try {
        const request = args[0];
        const requestUrl = typeof request === 'string' ? request : request?.url || '';
        if (String(requestUrl).includes('/api/comments')) {
          response.clone().json().then(data => {
            if (Array.isArray(data?.comments)) cacheComments(data.comments);
          }).catch(() => {});
        }
      } catch {}
      return response;
    };

    if (win.MutationObserver) new win.MutationObserver(scheduleSort).observe(tbody, { childList: true, subtree: true, characterData: true });
    updateLabels();
    scheduleSort();
  }

  return { DEFAULT_DIRECTIONS, SORT_LABELS, toCount, parseSortTime, countFor, sortApplicants, nextSortState, detailKey, install };
});
