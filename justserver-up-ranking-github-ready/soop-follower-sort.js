(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) {
    root.SoopFollowerSort = api;
    if (root.document) api.install(root);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function toCount(value) {
    if (value === null || value === undefined || value === '') return null;
    const number = Number(String(value).replace(/,/g, '').trim());
    return Number.isFinite(number) && number >= 0 ? Math.round(number) : null;
  }

  function countFor(counts, userId) {
    const key = String(userId || '').trim();
    if (!key) return null;
    const value = counts instanceof Map ? counts.get(key) : counts?.[key];
    return toCount(value);
  }

  function sortBySoopFollowers(items, counts) {
    return [...(items || [])].sort((a, b) => {
      const ac = countFor(counts, a?.userId);
      const bc = countFor(counts, b?.userId);
      const aKnown = ac !== null;
      const bKnown = bc !== null;
      if (aKnown !== bKnown) return aKnown ? -1 : 1;
      if (aKnown && bKnown && ac !== bc) return bc - ac;
      const ar = Number(a?.rank);
      const br = Number(b?.rank);
      if (Number.isFinite(ar) && Number.isFinite(br) && ar !== br) return ar - br;
      return Number(b?.up || 0) - Number(a?.up || 0);
    });
  }

  function install(win) {
    const doc = win?.document;
    if (!doc || win.__justserverSoopFollowerSortInstalled) return;
    const tabs = doc.querySelector('.sort-tabs');
    const tbody = doc.getElementById('tbody');
    if (!tabs || !tbody) return;
    win.__justserverSoopFollowerSortInstalled = true;

    let button = tabs.querySelector('.sort-btn[data-sort="followers"]');
    if (!button) {
      button = doc.createElement('button');
      button.className = 'sort-btn';
      button.type = 'button';
      button.dataset.sort = 'followers';
      button.textContent = '즐겨찾기순';
      const favoriteFilter = doc.getElementById('favoriteFilterBtn');
      if (favoriteFilter) tabs.insertBefore(button, favoriteFilter);
      else tabs.appendChild(button);
    }

    let scheduled = false;
    function applySort() {
      scheduled = false;
      if (!button.classList.contains('active')) return;
      const rows = [...tbody.querySelectorAll('tr[data-rank]')];
      if (rows.length < 2) return;
      const counts = {};
      const items = rows.map(row => {
        const trigger = row.querySelector('.detail-trigger[data-detail-user]');
        const userId = String(trigger?.dataset.detailUser || '').trim();
        const rank = Number(row.dataset.rank || 0);
        const upText = row.querySelector('.upnum')?.textContent || '0';
        const followerText = row.querySelector('td.followers .follower-line[data-platform="soop"] .follower-value')?.textContent || '';
        if (userId) counts[userId] = toCount(followerText);
        return { userId, rank, up: toCount(upText) || 0, row };
      });
      const sortedRows = sortBySoopFollowers(items, counts).map(item => item.row);
      const current = rows;
      if (current.every((row, index) => row === sortedRows[index])) return;
      const trailing = [...tbody.children].find(node => node.tagName === 'TR' && !node.matches('tr[data-rank]')) || null;
      for (const row of sortedRows) tbody.insertBefore(row, trailing);
    }

    function scheduleSort() {
      if (scheduled) return;
      scheduled = true;
      const raf = win.requestAnimationFrame || (callback => win.setTimeout(callback, 0));
      raf(applySort);
    }

    button.addEventListener('click', () => win.queueMicrotask ? win.queueMicrotask(scheduleSort) : win.setTimeout(scheduleSort, 0));
    if (win.MutationObserver) {
      new win.MutationObserver(scheduleSort).observe(tbody, { childList: true, subtree: true, characterData: true });
    }
  }

  return { toCount, countFor, sortBySoopFollowers, install };
});
