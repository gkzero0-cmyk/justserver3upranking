(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) {
    root.RankingUtils = api;
    if (root.document) {
      api.installServerScheduleUi(root);
      api.installApplicantDetailEnhancements(root);
      api.installNewApplicantUi(root);
    }
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
  const DAY_MS = 24 * 60 * 60 * 1000;
  const DEFAULT_RANK_CHANGE_TTL_MS = DAY_MS;
  const APPLICATION_DEADLINE_YMD = '2026-09-20';

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

  function serializeMap(map) {
    if (!(map instanceof Map)) return '[]';
    return JSON.stringify([...map.entries()]);
  }

  function readRankMap(raw) {
    const map = new Map();
    if (!raw) return map;
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return map;
      for (const entry of parsed) {
        if (!Array.isArray(entry) || entry.length < 2) continue;
        const key = String(entry[0] || '').trim();
        const rank = Number(entry[1]);
        if (key && Number.isFinite(rank) && rank > 0) map.set(key, rank);
      }
    } catch {}
    return map;
  }

  function normalizeRankChange(value, nowMs, ttlMs) {
    if (!value || typeof value !== 'object') return null;
    const direction = value.direction === 'up' || value.direction === 'down' ? value.direction : '';
    const from = Number(value.from);
    const to = Number(value.to);
    const changedAt = Number(value.changedAt);
    if (!direction || !Number.isFinite(from) || from <= 0 || !Number.isFinite(to) || to <= 0 || from === to) return null;
    if (!Number.isFinite(changedAt) || changedAt > nowMs || nowMs - changedAt >= ttlMs) return null;
    return {
      direction,
      from,
      to,
      delta: Math.abs(from - to),
      changedAt
    };
  }

  function readRankChangeHistory(raw, nowMs = Date.now(), ttlMs = DEFAULT_RANK_CHANGE_TTL_MS) {
    const map = new Map();
    const now = Number.isFinite(Number(nowMs)) ? Number(nowMs) : Date.now();
    const ttl = Number.isFinite(Number(ttlMs)) && Number(ttlMs) > 0 ? Number(ttlMs) : DEFAULT_RANK_CHANGE_TTL_MS;
    if (!raw) return map;
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return map;
      for (const entry of parsed) {
        if (!Array.isArray(entry) || entry.length < 2) continue;
        const key = String(entry[0] || '').trim();
        const change = normalizeRankChange(entry[1], now, ttl);
        if (key && change) map.set(key, change);
      }
    } catch {}
    return map;
  }

  function updateRankChangeHistory(ranked, previousRanks, existingHistory, nowMs = Date.now(), ttlMs = DEFAULT_RANK_CHANGE_TTL_MS) {
    const now = Number.isFinite(Number(nowMs)) ? Number(nowMs) : Date.now();
    const ttl = Number.isFinite(Number(ttlMs)) && Number(ttlMs) > 0 ? Number(ttlMs) : DEFAULT_RANK_CHANGE_TTL_MS;
    const previous = previousRanks instanceof Map ? previousRanks : new Map();
    const history = new Map();

    if (existingHistory instanceof Map) {
      for (const [key, value] of existingHistory.entries()) {
        const normalized = normalizeRankChange(value, now, ttl);
        if (normalized) history.set(String(key), normalized);
      }
    }

    for (const item of ranked || []) {
      const key = favoriteKey(item);
      const change = getRankChange(item?.rank, previous.get(key));
      if (change) history.set(key, { ...change, changedAt: now });
    }
    return history;
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

  function getKstDdayLabel(targetYmd, nowMs = Date.now()) {
    const match = String(targetYmd || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const now = Number(nowMs);
    if (!match || !Number.isFinite(now)) return '';
    const shifted = new Date(now + KST_OFFSET_MS);
    const todayUtc = Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate());
    const targetUtc = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    const diff = Math.round((targetUtc - todayUtc) / DAY_MS);
    if (diff > 0) return `D-${diff}`;
    if (diff < 0) return `D+${Math.abs(diff)}`;
    return 'D-DAY';
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

  function serverScheduleMarkup() {
    return `<aside class="hero-schedule" aria-label="서버 일정">
      <div class="schedule-title">SERVER SCHEDULE</div>
      <div class="schedule-item"><span>접수마감</span><strong>2026년 9월 20일</strong></div>
      <div class="schedule-item"><span>입주발표</span><strong>2026년 9월 22일</strong></div>
      <div class="schedule-item"><span>서버기간</span><strong>2026. 9. 30 ~ 2026. 10. 21</strong></div>
    </aside>`;
  }

  function serverScheduleCss() {
    return `
      .hero-top{display:flex;align-items:flex-start;justify-content:space-between;gap:24px}
      .hero-main{flex:1;min-width:0}
      .hero-title-row{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
      .hero-title-row h1{margin-right:0}
      .deadline-badge{display:inline-flex;align-items:center;justify-content:center;min-width:66px;height:34px;padding:0 12px;border-radius:999px;border:1px solid #6554d9;background:linear-gradient(135deg,#302667,#1b183e);color:#d8d0ff;font-size:14px;font-weight:950;letter-spacing:.01em;box-shadow:inset 0 0 0 1px rgba(255,255,255,.04)}
      .hero-schedule{width:320px;flex:0 0 320px;padding:16px 18px;border:1px solid var(--line);border-radius:16px;background:rgba(16,20,30,.92);box-shadow:0 10px 30px rgba(0,0,0,.18)}
      .schedule-title{font-size:12px;font-weight:900;color:#b9c5ff;margin-bottom:10px;letter-spacing:.08em}
      .schedule-item{display:grid;grid-template-columns:72px 1fr;align-items:center;gap:10px;padding:8px 0;border-top:1px solid rgba(255,255,255,.06)}
      .schedule-item:first-of-type{border-top:0;padding-top:0}
      .schedule-item span{font-size:11px;color:#8d98aa;font-weight:800;white-space:nowrap}
      .schedule-item strong{font-size:13px;color:#f4f7fb;font-weight:900;line-height:1.4;white-space:nowrap}
      @media(max-width:980px){
        .hero-top{flex-direction:column}
        .hero-schedule{width:100%;flex:1 1 auto}
      }
    `;
  }

  function installServerScheduleUi(root) {
    const doc = root?.document;
    if (!doc || root.__justserverScheduleUiInstalled) return;
    const hero = doc.querySelector('.hero');
    const actions = hero?.querySelector('.hero-actions');
    if (!hero || !actions) return;

    root.__justserverScheduleUiInstalled = true;

    const style = doc.createElement('style');
    style.id = 'server-schedule-ui-style';
    style.textContent = serverScheduleCss();
    (doc.head || doc.documentElement).appendChild(style);

    const top = doc.createElement('div');
    top.className = 'hero-top';
    const main = doc.createElement('div');
    main.className = 'hero-main';

    for (const child of [...hero.children]) {
      if (child === actions) break;
      main.appendChild(child);
    }

    const title = main.querySelector('h1');
    if (title) {
      const titleRow = doc.createElement('div');
      titleRow.className = 'hero-title-row';
      title.parentNode.insertBefore(titleRow, title);
      titleRow.appendChild(title);
      const deadlineBadge = doc.createElement('span');
      deadlineBadge.id = 'deadlineBadge';
      deadlineBadge.className = 'deadline-badge';
      deadlineBadge.title = '접수 마감: 2026년 9월 20일';
      const updateDeadline = () => {
        deadlineBadge.textContent = getKstDdayLabel(APPLICATION_DEADLINE_YMD, Date.now());
      };
      updateDeadline();
      titleRow.appendChild(deadlineBadge);
      if (typeof root.setInterval === 'function') root.setInterval(updateDeadline, 60 * 1000);
    }

    top.appendChild(main);
    const scheduleHost = doc.createElement('div');
    scheduleHost.innerHTML = serverScheduleMarkup().trim();
    if (scheduleHost.firstElementChild) top.appendChild(scheduleHost.firstElementChild);
    hero.insertBefore(top, actions);
  }

  function applicantDetailEnhancementCss() {
    return `
      .detail-profile-line{display:flex;align-items:center;gap:12px;margin:7px 0 4px;min-width:0}
      .detail-profile-avatar{width:46px;height:46px;border-radius:50%;object-fit:cover;flex:0 0 46px;border:1px solid #394761;background:#20293a}
      .detail-profile-fallback{width:46px;height:46px;border-radius:50%;display:grid;place-items:center;flex:0 0 46px;border:1px solid #394761;background:#20293a;color:#aebbd3;font-size:13px;font-weight:900}
      .detail-profile-line .detail-title{margin:0;min-width:0}
      .detail-original{margin-top:16px;padding-top:16px;border-top:1px solid rgba(255,255,255,.06)}
      .detail-original-toggle{height:36px;padding:0 12px;border-radius:9px;border:1px solid #35435e;background:#171e2b;color:#d8e2f6;font-size:12px;font-weight:850;cursor:pointer}
      .detail-original-toggle:hover{border-color:#637eb4;background:#202a3c;color:#fff}
      .detail-original-body{margin:10px 0 0;padding:13px 14px;border:1px solid #283349;border-radius:10px;background:#0b1018;color:#cfd8e8;font:inherit;font-size:12px;line-height:1.7;white-space:pre-wrap;word-break:break-word;max-height:260px;overflow:auto}
      .detail-original-body[hidden]{display:none}
    `;
  }

  function installApplicantDetailEnhancements(root) {
    const doc = root?.document;
    const detailBody = doc?.getElementById('applicantDetailBody');
    if (!doc || !detailBody || root.__justserverApplicantDetailEnhancementsInstalled) return;
    root.__justserverApplicantDetailEnhancementsInstalled = true;

    const style = doc.createElement('style');
    style.id = 'applicant-detail-enhancement-style';
    style.textContent = applicantDetailEnhancementCss();
    (doc.head || doc.documentElement).appendChild(style);

    let latestDetail = null;
    let scheduled = false;

    const safeHttps = value => /^https:\/\//i.test(String(value || '')) ? String(value) : '';
    const profileFallbackUrl = userId => {
      const clean = String(userId || '').trim();
      if (!clean) return '';
      const prefix = clean.slice(0, 2).toLowerCase();
      return `https://profile.img.sooplive.co.kr/LOGO/${prefix}/${encodeURIComponent(clean)}/${encodeURIComponent(clean)}.jpg`;
    };

    function apply() {
      scheduled = false;
      const content = detailBody.querySelector('.detail-content');
      if (!content || !latestDetail) return;

      const head = content.querySelector('.detail-head');
      const title = head?.querySelector('.detail-title');
      if (head && title && !head.querySelector('.detail-profile-line')) {
        const line = doc.createElement('div');
        line.className = 'detail-profile-line';
        const imageUrl = safeHttps(latestDetail.profileImageUrl) || profileFallbackUrl(latestDetail.userId);
        if (imageUrl) {
          const img = doc.createElement('img');
          img.className = 'detail-profile-avatar';
          img.src = imageUrl;
          img.alt = '';
          img.addEventListener('error', () => {
            img.style.display = 'none';
            if (img.nextElementSibling) img.nextElementSibling.style.display = 'grid';
          });
          line.appendChild(img);
          const fallback = doc.createElement('span');
          fallback.className = 'detail-profile-fallback';
          fallback.style.display = 'none';
          fallback.textContent = String(latestDetail.name || '?').trim().slice(0, 1) || '?';
          line.appendChild(fallback);
        }
        head.insertBefore(line, title);
        line.appendChild(title);
      }

      const panel = content.querySelector('.detail-grid .detail-panel');
      if (panel && !panel.querySelector('[data-detail-original]')) {
        const original = String(latestDetail.originalComment || '').trim();
        if (original) {
          const wrap = doc.createElement('div');
          wrap.className = 'detail-original';
          wrap.setAttribute('data-detail-original', '1');
          const button = doc.createElement('button');
          button.type = 'button';
          button.className = 'detail-original-toggle';
          button.setAttribute('data-detail-original-toggle', '1');
          button.setAttribute('aria-expanded', 'false');
          button.textContent = '신청 댓글 원문 보기';
          const body = doc.createElement('pre');
          body.className = 'detail-original-body';
          body.hidden = true;
          body.textContent = original;
          wrap.appendChild(button);
          wrap.appendChild(body);
          const links = panel.querySelector('.detail-links');
          panel.insertBefore(wrap, links || null);
        }
      }
    }

    function scheduleApply() {
      if (scheduled) return;
      scheduled = true;
      (root.requestAnimationFrame || root.setTimeout)(apply, 0);
    }

    detailBody.addEventListener('click', event => {
      const button = event.target.closest('[data-detail-original-toggle]');
      if (!button) return;
      const body = button.nextElementSibling;
      if (!body) return;
      const expanded = button.getAttribute('aria-expanded') === 'true';
      button.setAttribute('aria-expanded', expanded ? 'false' : 'true');
      button.textContent = expanded ? '신청 댓글 원문 보기' : '신청 댓글 원문 접기';
      body.hidden = expanded;
    });

    if (root.MutationObserver) {
      new root.MutationObserver(scheduleApply).observe(detailBody, { childList: true, subtree: true });
    }

    const originalFetch = root.fetch;
    if (typeof originalFetch === 'function') {
      root.fetch = async function (...args) {
        const response = await originalFetch.apply(this, args);
        try {
          const request = args[0];
          const requestUrl = typeof request === 'string' ? request : request?.url || '';
          if (String(requestUrl).includes('/api/applicant-detail')) {
            response.clone().json().then(data => {
              if (!data?.ok) return;
              latestDetail = data;
              scheduleApply();
            }).catch(() => {});
          }
        } catch {}
        return response;
      };
    }
  }

  function installNewApplicantUi(root) {
    const doc = root?.document;
    if (!doc || root.__justserverNewApplicantUiInstalled) return;
    root.__justserverNewApplicantUiInstalled = true;

    let newApplicantKeys = new Set();
    let dataReady = false;
    let filterActive = false;
    let scheduled = false;
    let suppressFavoriteFilterReset = false;

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
        if (favoriteFilter?.getAttribute('aria-pressed') === 'true') {
          suppressFavoriteFilterReset = true;
          favoriteFilter.click();
          suppressFavoriteFilterReset = false;
        }
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
      if (suppressFavoriteFilterReset || !filterActive) return;
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
    serializeMap,
    readRankMap,
    readRankChangeHistory,
    updateRankChangeHistory,
    parseKstDate,
    getKstDdayLabel,
    countKstToday,
    getKstTodayKeys,
    readFavoriteIds,
    toggleFavoriteId,
    serverScheduleMarkup,
    serverScheduleCss,
    installServerScheduleUi,
    applicantDetailEnhancementCss,
    installApplicantDetailEnhancements,
    installNewApplicantUi
  };
});