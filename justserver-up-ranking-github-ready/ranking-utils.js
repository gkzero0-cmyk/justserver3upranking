(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) {
    root.RankingUtils = api;
    if (root.document) api.installNewApplicantUi(root);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

  function favoriteKey(item) {
    const commentNo = String(item?.commentNo || '').trim();
    if (commentNo) return `comment:${commentNo}`;
    const userId = String(item?.userId || '').trim();
    const regDate = String(item?.regDate || '').trim();
    return `user:${userId}|${regDate}`;
  }

  function buildRankMap(ranked) {
    const map = new Map();
    for (const item of ranked || []) {
      const rank = Number(item?.rank);
      if (Number.isFinite(rank) && rank > 0) map.set(favoriteKey(item), rank);
    }
    return map;
  }

  function getRankChange(currentRank, previousRank) {
    const current = Number(currentRank);
    const previous = Number(previousRank);
    if (!Number.isFinite(current) || !Number.isFinite(previous) || current === previous) return null;
    return {
      direction: current < previous ? 'up' : 'down',
      from: previous,
      to: current,
      delta: Math.abs(previous - current)
    };
  }

  function parseKstDate(value) {
    if (!value) return 0;
    const raw = String(value).trim();
    const naive = raw.match(/^(\d{4})[.-](\d{1,2})[.-](\d{1,2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
    if (naive) {
      const [, y, m, d, hh = '0', mm = '0', ss = '0'] = naive;
      return Date.UTC(Number(y), Number(m) - 1, Number(d), Number(hh) - 9, Number(mm), Number(ss));
    }
    const normalized = raw.replace(/\./g, '-');
    const parsed = Date.parse(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function kstDayKey(ms) {
    if (!Number.isFinite(ms)) return '';
    const shifted = new Date(ms + KST_OFFSET_MS);
    return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}-${String(shifted.getUTCDate()).padStart(2, '0')}`;
  }

  function countKstToday(comments, nowMs = Date.now()) {
    const today = kstDayKey(nowMs);
    return (comments || []).reduce((count, item) => {
      const timestamp = parseKstDate(item?.regDate);
      return count + (timestamp && timestamp <= nowMs && kstDayKey(timestamp) === today ? 1 : 0);
    }, 0);
  }

  function getKstTodayKeys(comments, nowMs = Date.now()) {
    const today = kstDayKey(nowMs);
    const keys = [];
    for (const item of comments || []) {
      const timestamp = parseKstDate(item?.regDate);
      if (timestamp && timestamp <= nowMs && kstDayKey(timestamp) === today) keys.push(favoriteKey(item));
    }
    return [...new Set(keys)];
  }

  function readFavoriteIds(raw) {
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return [...new Set(parsed.map(x => String(x || '').trim()).filter(Boolean))];
    } catch {
      return [];
    }
  }

  function toggleFavoriteId(ids, id) {
    const key = String(id || '').trim();
    const set = new Set((ids || []).map(x => String(x || '').trim()).filter(Boolean));
    if (!key) return [...set];
    if (set.has(key)) set.delete(key); else set.add(key);
    return [...set];
  }

  function installNewApplicantUi(root) {
    const doc = root?.document;
    if (!doc || root.__justserverNewApplicantUiInstalled) return;
    root.__justserverNewApplicantUiInstalled = true;

    let newApplicantKeys = new Set();
    let dataReady = false;
    let filterActive = false;
    let scheduled = false;

    const style = doc.createElement('style');
    style.id = 'new-applicant-ui-style';
    style.textContent = `
      .new-applicant-label{display:inline-flex;align-items:center;height:18px;padding:0 6px;border-radius:6px;background:#17382b;border:1px solid #2f7658;color:#7ff0bd;font-size:10px;font-weight:950;letter-spacing:.02em;line-height:1;flex:0 0 auto}
      .new-applicant-badge[role="button"]{cursor:pointer;user-select:none;transition:.15s}
      .new-applicant-badge[role="button"]:hover{background:#153126;border-color:#36765c}
      .new-applicant-badge.new-applicant-filter-active{background:#1a4030;border-color:#5dd6a6;box-shadow:inset 0 0 0 1px rgba(93,214,166,.25)}
      .new-applicant-badge[role="button"]:focus-visible{outline:2px solid #5dd6a6;outline-offset:2px}
    `;
    (doc.head || doc.documentElement).appendChild(style);

    const getTopBadge = () => doc.getElementById('newApplicantCount')?.closest('.new-applicant-badge');
    const getTbody = () => doc.getElementById('tbody');

    function apply() {
      scheduled = false;
      const badge = getTopBadge();
      if (badge) {
        badge.classList.toggle('new-applicant-filter-active', filterActive);
        badge.setAttribute('aria-pressed', filterActive ? 'true' : 'false');
        badge.title = filterActive
          ? '새로운 신청자만 보는 중입니다. 클릭하면 전체 목록으로 돌아갑니다.'
          : '클릭하여 오늘 새로 등록된 신청자만 봅니다.';
      }

      const tbody = getTbody();
      if (!tbody) return;
      const rows = [...tbody.querySelectorAll('tr[data-rank]')];
      let visibleNewRows = 0;

      for (const row of rows) {
        const favoriteButton = row.querySelector('.favorite-btn[data-favorite-key]');
        const key = favoriteButton?.getAttribute('data-favorite-key') || '';
        const isNew = Boolean(key && newApplicantKeys.has(key));
        const nameRow = row.querySelector('.name-row');
        const nick = nameRow?.querySelector('.nick');
        let label = nameRow?.querySelector('.new-applicant-label');

        if (isNew && nameRow && nick && !label) {
          label = doc.createElement('span');
          label.className = 'new-applicant-label';
          label.textContent = 'New';
          label.title = '오늘 새로 등록된 신청자';
          nick.insertAdjacentElement('afterend', label);
        } else if (!isNew && label) {
          label.remove();
        }

        row.hidden = filterActive && !isNew;
        if (filterActive && isNew) visibleNewRows += 1;
      }

      for (const cutRow of tbody.querySelectorAll('.cut-row')) cutRow.hidden = filterActive;

      let emptyRow = tbody.querySelector('tr[data-new-applicant-empty="1"]');
      if (filterActive && dataReady && visibleNewRows === 0) {
        if (!emptyRow) {
          emptyRow = doc.createElement('tr');
          emptyRow.setAttribute('data-new-applicant-empty', '1');
          emptyRow.innerHTML = '<td colspan="6"><div class="empty">오늘 등록된 새로운 신청자가 없습니다.</div></td>';
          tbody.appendChild(emptyRow);
        }
      } else if (emptyRow) {
        emptyRow.remove();
      }
    }

    function scheduleApply() {
      if (scheduled) return;
      scheduled = true;
      (root.requestAnimationFrame || root.setTimeout)(apply, 0);
    }

    function activateNewApplicantFilter(next) {
      filterActive = Boolean(next);
      if (filterActive) {
        const favoriteFilter = doc.getElementById('favoriteFilterBtn');
        if (favoriteFilter?.getAttribute('aria-pressed') === 'true') favoriteFilter.click();
        const search = doc.getElementById('searchInput');
        if (search?.value) {
          search.value = '';
          search.dispatchEvent(new root.Event('input', { bubbles: true }));
        }
      }
      scheduleApply();
    }

    const badge = getTopBadge();
    if (badge) {
      badge.setAttribute('role', 'button');
      badge.setAttribute('tabindex', '0');
      badge.setAttribute('aria-pressed', 'false');
      badge.addEventListener('click', () => activateNewApplicantFilter(!filterActive));
      badge.addEventListener('keydown', event => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        activateNewApplicantFilter(!filterActive);
      });
    }

    const favoriteFilter = doc.getElementById('favoriteFilterBtn');
    favoriteFilter?.addEventListener('click', () => {
      if (!filterActive) return;
      filterActive = false;
      scheduleApply();
    });

    const tbody = getTbody();
    if (tbody && root.MutationObserver) {
      new root.MutationObserver(scheduleApply).observe(tbody, { childList: true, subtree: true });
    }

    const originalFetch = root.fetch;
    if (typeof originalFetch === 'function') {
      root.fetch = async function (...args) {
        const response = await originalFetch.apply(this, args);
        try {
          const request = args[0];
          const requestUrl = typeof request === 'string' ? request : request?.url || '';
          if (String(requestUrl).includes('/api/comments')) {
            response.clone().json().then(data => {
              if (!Array.isArray(data?.comments)) return;
              newApplicantKeys = new Set(getKstTodayKeys(data.comments));
              dataReady = true;
              scheduleApply();
            }).catch(() => {});
          }
        } catch {}
        return response;
      };
    }

    scheduleApply();
  }

  return {
    favoriteKey,
    buildRankMap,
    getRankChange,
    parseKstDate,
    countKstToday,
    getKstTodayKeys,
    readFavoriteIds,
    toggleFavoriteId,
    installNewApplicantUi
  };
});
