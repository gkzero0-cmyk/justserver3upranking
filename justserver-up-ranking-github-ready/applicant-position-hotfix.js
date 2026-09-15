(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) {
    root.ApplicantPositionHotfix = api;
    if (root.document) api.install(root);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const COLUMN_LABELS = Object.freeze(['순위', '신청자', '즐겨찾기', '댓글', 'UP 순위', 'UP', '작성일', '바로가기']);

  function detailKey(commentNo, userId) {
    return `${String(commentNo || '').trim()}:${String(userId || '').trim().toLowerCase()}`;
  }

  function computeVisiblePositions(items) {
    const map = new Map();
    let order = 0;
    for (const item of items || []) {
      if (!item || !item.visible) continue;
      const key = String(item.key || '').trim();
      if (!key) continue;
      map.set(key, ++order);
    }
    return map;
  }

  function normalizeUpRank(value) {
    const rank = Number(value);
    return Number.isFinite(rank) && rank > 0 ? Math.trunc(rank) : null;
  }

  function formatUpRank(value) {
    const rank = normalizeUpRank(value);
    return rank ? `UP ${rank}위` : 'UP -';
  }

  function formatDisplayOrder(value) {
    const order = Number(value);
    return Number.isFinite(order) && order > 0 ? `${Math.trunc(order)}.` : '-';
  }

  function install(win) {
    const doc = win?.document;
    if (!doc || win.__applicantPositionHotfixInstalled) return;
    win.__applicantPositionHotfixInstalled = true;

    const state = { currentKey: '', applyQueued: false };

    function rowVisible(row) {
      if (!row || row.hidden) return false;
      const style = typeof win.getComputedStyle === 'function' ? win.getComputedStyle(row) : null;
      return !style || (style.display !== 'none' && style.visibility !== 'hidden');
    }

    function rowKey(row) {
      const trigger = row?.querySelector?.('.detail-trigger[data-detail-comment][data-detail-user]');
      return trigger ? detailKey(trigger.dataset.detailComment, trigger.dataset.detailUser) : '';
    }

    function ensureStyle() {
      if (doc.getElementById('applicantPositionHotfixStyle')) return;
      const style = doc.createElement('style');
      style.id = 'applicantPositionHotfixStyle';
      style.textContent = `
        th.rank,td.rank{width:72px!important;text-align:center!important}
        th.up-rank-col,td.up-rank-col{width:92px;text-align:center!important}
        .display-order-badge{display:inline-grid;place-items:center;min-width:34px;height:30px;padding:0 8px;border-radius:9px;background:#171e2b;color:#d7e0ef;font-weight:900}
        .up-rank-wrap{display:flex;flex-direction:column;align-items:center;gap:5px}
        .up-rank-value{font-size:12px;font-weight:950;color:#9fb2ff;white-space:nowrap}
        tr[data-rank="1"] .up-rank-value{color:#ffd66b}tr[data-rank="2"] .up-rank-value{color:#cad5e4}tr[data-rank="3"] .up-rank-value{color:#d89462}
        .detail-list-order{margin-right:7px;color:#9fb2ff;font-weight:950}
        .detail-up-rank{display:inline-flex;align-items:center;height:24px;margin-left:10px;padding:0 8px;border:1px solid #35435e;border-radius:999px;background:#171e2b;color:#9fb2ff;font-size:11px;font-weight:900;vertical-align:middle;transform:translateY(-2px)}
        @media(max-width:820px){th.rank,td.rank{width:64px!important}th.up-rank-col,td.up-rank-col{width:84px}.detail-up-rank{margin-left:7px}}
      `;
      (doc.head || doc.documentElement).appendChild(style);
    }

    function ensureHeader() {
      const headerRow = doc.querySelector('.table-card thead tr') || doc.querySelector('thead tr');
      if (!headerRow) return 0;
      const headers = Array.from(headerRow.children).filter(node => node.tagName === 'TH');
      const first = headers.find(th => th.classList.contains('rank')) || headers[0];
      if (first) {
        first.textContent = '순위';
        first.classList.add('rank');
      }
      let upRank = headerRow.querySelector('th.up-rank-col');
      const up = Array.from(headerRow.querySelectorAll('th')).find(th => String(th.textContent || '').trim() === 'UP' || th.classList.contains('up'));
      const comment = Array.from(headerRow.querySelectorAll('th')).find(th => String(th.textContent || '').trim() === '댓글');
      if (!upRank) {
        upRank = doc.createElement('th');
        upRank.className = 'up-rank-col';
        upRank.textContent = 'UP 순위';
      }
      if (up && upRank.nextSibling !== up) headerRow.insertBefore(upRank, up);
      else if (!up && comment && comment.nextSibling !== upRank) comment.after(upRank);
      return headerRow.querySelectorAll('th').length;
    }

    function ensureUpRankCell(row) {
      let cell = row.querySelector('td.up-rank-col');
      const upCell = row.querySelector('td.up');
      const commentCell = row.querySelector('td.comment') || row.querySelector('.comment-wrap')?.closest('td');
      if (!cell) {
        cell = doc.createElement('td');
        cell.className = 'up-rank-col';
      }
      if (upCell && cell.nextSibling !== upCell) row.insertBefore(cell, upCell);
      else if (!upCell && commentCell && commentCell.nextSibling !== cell) commentCell.after(cell);
      return cell;
    }

    function syncRowStructure(row) {
      const left = row.querySelector('td.rank') || row.children[0];
      if (!left) return;
      const existingChange = left.querySelector('.rank-change');
      const upRankCell = ensureUpRankCell(row);
      let wrap = upRankCell.querySelector('.up-rank-wrap');
      if (!wrap) {
        wrap = doc.createElement('div');
        wrap.className = 'up-rank-wrap';
        upRankCell.appendChild(wrap);
      }
      let value = wrap.querySelector('.up-rank-value');
      if (!value) {
        value = doc.createElement('span');
        value.className = 'up-rank-value';
        wrap.appendChild(value);
      }
      const upRank = normalizeUpRank(row.dataset.rank);
      value.textContent = upRank ? `${upRank}위` : '-';
      if (existingChange) wrap.appendChild(existingChange);

      let badge = left.querySelector('.display-order-badge');
      if (!badge) {
        left.textContent = '';
        badge = doc.createElement('span');
        badge.className = 'display-order-badge';
        left.appendChild(badge);
      }
    }

    function syncDetail(rows) {
      if (!state.currentKey) return;
      const row = rows.find(item => item.key === state.currentKey)?.row;
      const title = doc.getElementById('applicantDetailTitle');
      if (!row || !title) return;
      const order = Number(row.dataset.displayOrder || 0);
      const upRank = normalizeUpRank(row.dataset.rank);
      let orderBadge = title.querySelector('.detail-list-order');
      if (!orderBadge) {
        orderBadge = doc.createElement('span');
        orderBadge.className = 'detail-list-order';
        title.insertBefore(orderBadge, title.firstChild);
      }
      orderBadge.textContent = formatDisplayOrder(order);

      let upBadge = title.querySelector('.detail-up-rank');
      if (!upBadge) {
        upBadge = doc.createElement('span');
        upBadge.className = 'detail-up-rank';
      }
      upBadge.textContent = formatUpRank(upRank);
      const freepass = title.querySelector('.detail-freepass-badge');
      if (freepass) title.insertBefore(upBadge, freepass);
      else if (!upBadge.isConnected) title.appendChild(upBadge);
    }

    function apply() {
      state.applyQueued = false;
      ensureStyle();
      const columnCount = ensureHeader();
      const rowNodes = Array.from(doc.querySelectorAll('#tbody tr[data-rank]'));
      const rows = rowNodes.map(row => ({ row, key: rowKey(row), visible: rowVisible(row) }));
      const positions = computeVisiblePositions(rows);
      for (const item of rows) {
        syncRowStructure(item.row);
        const order = positions.get(item.key) || 0;
        if (order) item.row.dataset.displayOrder = String(order);
        else delete item.row.dataset.displayOrder;
        const badge = item.row.querySelector('.display-order-badge');
        if (badge) badge.textContent = order ? String(order) : '';
      }
      if (columnCount) {
        for (const cell of doc.querySelectorAll('#tbody tr:not([data-rank]) td[colspan]')) {
          cell.colSpan = columnCount;
        }
      }
      syncDetail(rows);
    }

    function scheduleApply() {
      if (state.applyQueued) return;
      state.applyQueued = true;
      const raf = win.requestAnimationFrame || (callback => win.setTimeout(callback, 0));
      raf(() => raf(apply));
    }

    doc.addEventListener('click', event => {
      const trigger = event.target.closest?.('.detail-trigger[data-detail-comment][data-detail-user]');
      if (trigger) {
        state.currentKey = detailKey(trigger.dataset.detailComment, trigger.dataset.detailUser);
        scheduleApply();
        return;
      }
      if (event.target.closest?.('.sort-btn,.favorite-filter-btn,.chzzk-filter-btn,.freepass-filter-btn,#lowSoopFavoriteFilterBtn')) scheduleApply();
    }, true);
    doc.addEventListener('input', event => {
      if (event.target.matches?.('.search input,input[type="search"]')) scheduleApply();
    }, true);

    const tbody = doc.getElementById('tbody');
    if (tbody && typeof win.MutationObserver === 'function') {
      const observer = new win.MutationObserver(scheduleApply);
      observer.observe(tbody, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style', 'hidden', 'data-rank'] });
    }
    const modal = doc.getElementById('applicantDetailModal');
    if (modal && typeof win.MutationObserver === 'function') {
      const observer = new win.MutationObserver(scheduleApply);
      observer.observe(modal, { childList: true, subtree: true });
    }
    scheduleApply();
  }

  return { COLUMN_LABELS, detailKey, computeVisiblePositions, normalizeUpRank, formatUpRank, formatDisplayOrder, install };
});
