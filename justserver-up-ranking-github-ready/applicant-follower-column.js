(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root && root.document) api.install(root);
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const CHZZK_REFRESH_MS = 5 * 60 * 1000;
  const CHZZK_CONCURRENCY = 4;

  function toCount(value) {
    if (value === null || value === undefined || value === '') return null;
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? Math.round(number) : null;
  }

  function formatCount(value) {
    const count = toCount(value);
    return count === null ? '-' : new Intl.NumberFormat('ko-KR').format(count);
  }

  function buildFollowerLines({ soopCount, isChzzk, chzzkCount, chzzkStatus }) {
    const soop = toCount(soopCount);
    const lines = [{ platform: 'SOOP', text: soop === null ? '-' : formatCount(soop), status: soop === null ? 'missing' : 'ready' }];
    if (!isChzzk) return lines;
    if (chzzkStatus === 'loading') {
      lines.push({ platform: '치지직', text: '확인 중…', status: 'loading' });
    } else {
      const count = toCount(chzzkCount);
      lines.push({ platform: '치지직', text: count === null ? '-' : formatCount(count), status: count === null ? 'missing' : 'ready' });
    }
    return lines;
  }

  function buildChzzkLookup(item, detailUtils) {
    const comment = String(item?.comment || '');
    const isChzzk = /치지직|chzzk|옆동네/iu.test(comment) || /chzzk\.naver\.com/iu.test(comment);
    if (!isChzzk) return { isChzzk: false, name: '', channelUrl: '' };
    let name = String(item?.userNick || '').trim();
    let channelUrl = '';
    try {
      const parsed = detailUtils?.parseApplicationComment?.(comment, name);
      if (parsed?.name) name = String(parsed.name).trim();
      channelUrl = String(detailUtils?.extractChzzkStationUrl?.(comment) || '').trim();
    } catch {}
    return { isChzzk: true, name, channelUrl };
  }

  function mergeSoopCountPayload(target, payload) {
    if (!(target instanceof Map) || !payload?.ok || !payload.counts || typeof payload.counts !== 'object') return target;
    for (const [userId, value] of Object.entries(payload.counts)) target.set(userId, toCount(value));
    return target;
  }

  function detailKey(commentNo, userId) {
    return `${String(commentNo || '').trim()}:${String(userId || '').trim().toLowerCase()}`;
  }

  function install(win) {
    const doc = win?.document;
    if (!doc || typeof win.fetch !== 'function' || win.__justserverApplicantFollowerColumnInstalled) return;
    win.__justserverApplicantFollowerColumnInstalled = true;

    const detailUtils = win.ApplicantDetailUtils || null;
    const nativeFetch = win.fetch.bind(win);
    const comments = new Map();
    const soopCounts = new Map(Object.entries(win.__justserverSoopFavoriteCounts || {}));
    const chzzk = new Map();
    const queue = [];
    const queued = new Set();
    let active = 0;
    let renderPending = false;

    function ensureStyle() {
      if (doc.getElementById('applicant-follower-column-style')) return;
      const style = doc.createElement('style');
      style.id = 'applicant-follower-column-style';
      style.textContent = `
        th.followers,td.followers{width:150px;text-align:left}
        .follower-stack{display:flex;flex-direction:column;gap:5px;min-width:0}
        .follower-line{display:flex;align-items:center;gap:6px;min-width:0;white-space:nowrap;font-size:11px;font-weight:850;color:#cbd5e8}
        .follower-platform{flex:0 0 auto;font-size:9px;letter-spacing:.02em;color:#76859c;border:1px solid #2c374b;border-radius:6px;padding:2px 5px;background:#121925}
        .follower-line[data-platform="chzzk"] .follower-platform{color:#6ee9ca;border-color:#28584f;background:#10231f}
        .follower-value{overflow:hidden;text-overflow:ellipsis}.follower-line.loading .follower-value{color:#8190a8}.follower-line.missing .follower-value{color:#69768a}
        @media(max-width:820px){th.followers,td.followers{width:140px}.follower-line{font-size:10px}}
      `;
      (doc.head || doc.documentElement).appendChild(style);
    }

    function ensureHeaderAndColspans() {
      const table = doc.querySelector('.table-card table');
      if (!table) return;
      const userHead = table.querySelector('thead th.user');
      if (userHead && !table.querySelector('thead th.followers')) {
        const th = doc.createElement('th');
        th.className = 'followers';
        th.textContent = '즐겨찾기';
        userHead.after(th);
      }
      for (const cell of table.querySelectorAll('tbody td[colspan]')) {
        const value = Number(cell.getAttribute('colspan') || 0);
        if (value === 6) cell.setAttribute('colspan', '7');
      }
    }

    function rowItem(row) {
      const trigger = row?.querySelector('.detail-trigger[data-detail-comment][data-detail-user]');
      if (!trigger) return null;
      const commentNo = trigger.dataset.detailComment || '';
      const userId = trigger.dataset.detailUser || '';
      const key = detailKey(commentNo, userId);
      const cached = comments.get(key) || null;
      return { key, commentNo, userId, cached };
    }

    function makeLine(line) {
      const div = doc.createElement('div');
      div.className = `follower-line ${line.status || ''}`;
      div.dataset.platform = line.platform === '치지직' ? 'chzzk' : 'soop';
      const label = doc.createElement('span');
      label.className = 'follower-platform';
      label.textContent = line.platform;
      const value = doc.createElement('span');
      value.className = 'follower-value';
      value.textContent = line.text;
      div.append(label, value);
      return div;
    }

    function render() {
      renderPending = false;
      ensureStyle();
      ensureHeaderAndColspans();
      const tbody = doc.getElementById('tbody');
      if (!tbody) return;
      for (const row of tbody.querySelectorAll('tr[data-rank]')) {
        const userCell = row.querySelector('td.user');
        if (!userCell) continue;
        let cell = row.querySelector('td.followers');
        if (!cell) {
          cell = doc.createElement('td');
          cell.className = 'followers';
          userCell.after(cell);
        }
        const item = rowItem(row);
        if (!item) continue;
        const lookup = item.cached ? buildChzzkLookup(item.cached, detailUtils) : { isChzzk: false, name: '', channelUrl: '' };
        const chzzkState = chzzk.get(item.key) || null;
        const lines = buildFollowerLines({
          soopCount: soopCounts.get(item.userId),
          isChzzk: lookup.isChzzk,
          chzzkCount: chzzkState?.count,
          chzzkStatus: chzzkState?.status || (lookup.isChzzk ? 'loading' : '')
        });
        const stack = doc.createElement('div');
        stack.className = 'follower-stack';
        lines.forEach(line => stack.appendChild(makeLine(line)));
        cell.replaceChildren(stack);
      }
    }

    function scheduleRender() {
      if (renderPending) return;
      renderPending = true;
      const raf = win.requestAnimationFrame || (callback => win.setTimeout(callback, 0));
      raf(render);
    }

    function enqueueChzzk(item) {
      const lookup = buildChzzkLookup(item, detailUtils);
      if (!lookup.isChzzk) return;
      const key = detailKey(item.commentNo, item.userId);
      const current = chzzk.get(key);
      if (current?.status === 'loading' || (current?.at && Date.now() - current.at < CHZZK_REFRESH_MS)) return;
      if (queued.has(key)) return;
      queued.add(key);
      chzzk.set(key, { status: 'loading', count: null, at: 0 });
      queue.push({ key, lookup });
    }

    function pump() {
      while (active < CHZZK_CONCURRENCY && queue.length) {
        const job = queue.shift();
        queued.delete(job.key);
        active += 1;
        const params = new URLSearchParams();
        if (job.lookup.name) params.set('name', job.lookup.name);
        if (job.lookup.channelUrl) params.set('channelUrl', job.lookup.channelUrl);
        nativeFetch(`/api/chzzk-channel?${params.toString()}`, { cache: 'no-store' })
          .then(response => response.ok ? response.json() : Promise.reject(new Error(`HTTP ${response.status}`)))
          .then(data => {
            const matched = Boolean(data?.ok && data?.matched);
            chzzk.set(job.key, {
              status: matched ? 'ready' : 'unmatched',
              count: matched ? toCount(data.followerCount) : null,
              at: Date.now()
            });
          })
          .catch(() => chzzk.set(job.key, { status: 'unmatched', count: null, at: Date.now() }))
          .finally(() => {
            active -= 1;
            scheduleRender();
            pump();
          });
      }
    }

    function onComments(list) {
      comments.clear();
      for (const item of list || []) {
        const key = detailKey(item?.commentNo, item?.userId);
        if (!key || key === ':') continue;
        comments.set(key, item);
        enqueueChzzk(item);
      }
      scheduleRender();
      pump();
    }

    win.addEventListener('justserver:soop-favorite-counts', event => {
      soopCounts.clear();
      const counts = event?.detail?.counts || {};
      Object.entries(counts).forEach(([userId, count]) => soopCounts.set(userId, toCount(count)));
      scheduleRender();
    });

    win.fetch = async (...args) => {
      const response = await nativeFetch(...args);
      try {
        const request = args[0];
        const requestUrl = typeof request === 'string' ? request : request?.url || '';
        if (String(requestUrl).includes('/api/comments')) {
          response.clone().json().then(data => {
            if (Array.isArray(data?.comments)) onComments(data.comments);
          }).catch(() => {});
        } else if (String(requestUrl).includes('/api/soop-favorite-counts')) {
          response.clone().json().then(data => {
            mergeSoopCountPayload(soopCounts, data);
            scheduleRender();
          }).catch(() => {});
        }
      } catch {}
      return response;
    };

    const tbody = doc.getElementById('tbody');
    if (tbody && win.MutationObserver) new win.MutationObserver(scheduleRender).observe(tbody, { childList: true, subtree: true });
    ensureStyle();
    ensureHeaderAndColspans();
    scheduleRender();
  }

  return {
    CHZZK_REFRESH_MS,
    CHZZK_CONCURRENCY,
    toCount,
    formatCount,
    buildFollowerLines,
    buildChzzkLookup,
    mergeSoopCountPayload,
    detailKey,
    install
  };
});