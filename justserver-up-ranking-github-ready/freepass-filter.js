(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root && root.document && typeof root.fetch === 'function') api.install(root);
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const PINNED_FREEPASS_USER_IDS = new Set([
    'chunbongtv', 'msjw0918', 'sohasoha', 'hayodayong', 'sudal0923', 'xxxkimmickey', 'yuchya',
    'saturn0106', 'peachbox', 'rakuni', 'ruringruming', 'dup130', 'mihui96', 'heb4960'
  ]);

  function normalizeUserId(value) {
    return String(value ?? '').trim().toLowerCase();
  }

  function isPinnedFreepassUser(userId) {
    return PINNED_FREEPASS_USER_IDS.has(normalizeUserId(userId));
  }

  function normalizeCommentText(value) {
    return String(value ?? '')
      .replace(/<br\s*\/?\s*>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\p{Cf}/gu, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function normalizeForFreepassMatch(value) {
    return normalizeCommentText(value)
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function isFreepassUseComment(value) {
    const text = normalizeForFreepassMatch(value);
    if (!/프리\s*패스/iu.test(text)) return false;

    const denied = [
      /프리\s*패스\s*권?.{0,24}(?:사용\s*(?:안|않|하지)|안\s*(?:쓰|쓸|사용)|쓰지\s*않|사용하지\s*않|없이|제외|미사용)/iu,
      /(?:안|않|없이|제외|미사용).{0,18}프리\s*패스/iu,
      /(?:친구|지인|타인|다른\s*(?:사람|분)|누가).{0,24}프리\s*패스.{0,24}(?:사용|쓰|쓸|씁|씀|썼|적용)/iu,
      /프리\s*패스\s*권?.{0,18}(?:사용\s*여부|가능\s*여부|되나요|있나요)/iu
    ];
    if (denied.some(pattern => pattern.test(text))) return false;

    const positive = [
      /프리\s*패스\s*권?.{0,40}(?:사용|쓰|쓸|씁|씀|썼|적용)/iu,
      /프리\s*패스\s*(?:권)?\s*(?:으)?로.{0,20}(?:신청|참여)/iu,
      /사장님.{0,8}프리\s*패스\s*권(?:\s|$)/iu
    ];
    return positive.some(pattern => pattern.test(text));
  }

  function freepassKey(item) {
    const commentNo = String(item?.commentNo ?? item?.p_comment_no ?? item?.comment_no ?? '').trim();
    const userId = String(item?.userId ?? item?.user_id ?? '').trim().toLowerCase();
    return commentNo && userId ? `${commentNo}:${userId}` : '';
  }

  function collectFreepassKeys(comments) {
    const next = new Set();
    for (const item of comments || []) {
      if (!isPinnedFreepassUser(item?.userId ?? item?.user_id) && !isFreepassUseComment(item?.comment)) continue;
      const key = freepassKey(item);
      if (key) next.add(key);
    }
    return next;
  }

  function isFreepassDetail(detail) {
    if (!detail || typeof detail !== 'object') return false;
    const userId = detail.userId ?? detail.user_id;
    const comment = detail.originalComment ?? detail.comment ?? detail.applicationComment;
    return isPinnedFreepassUser(userId) || isFreepassUseComment(comment);
  }

  function placeFreepassStatCard(stats, card) {
    if (!stats || !card) return;
    const autoRefreshCard = Array.from(stats.children || []).find(child =>
      /자동\s*갱신/iu.test(String(child?.textContent || ''))
    );
    if (autoRefreshCard && autoRefreshCard !== card && typeof stats.insertBefore === 'function') {
      stats.insertBefore(card, autoRefreshCard);
      return;
    }
    if (typeof stats.appendChild === 'function') stats.appendChild(card);
  }

  function install(win) {
    if (!win || !win.document || typeof win.fetch !== 'function' || win.__justserverFreepassFilterInstalled) return;
    win.__justserverFreepassFilterInstalled = true;
    const doc = win.document;
    const nativeFetch = win.fetch.bind(win);
    let freepassKeys = new Set();
    let filterActive = false;
    let detailFreepass = false;
    let applyQueued = false;

    function ensureStyle() {
      if (doc.getElementById('freepassFilterStyle')) return;
      const style = doc.createElement('style');
      style.id = 'freepassFilterStyle';
      style.textContent = `
        .freepass-filter-btn{height:34px;padding:0 12px;border:0;border-radius:8px;background:transparent;color:#8390a5;font-size:12px;font-weight:850;cursor:pointer;white-space:nowrap}
        .freepass-filter-btn:hover{color:#eadcff;background:#1d1728}.freepass-filter-btn.active{background:#3b245d;color:#eadcff;box-shadow:inset 0 0 0 1px #7046a7}
        .freepass-badge{display:inline-flex;align-items:center;height:21px;padding:0 7px;border-radius:999px;border:1px solid #69459a;background:#2b1c42;color:#d9bfff;font-size:9px;font-weight:900;white-space:nowrap;flex:0 0 auto}
        .detail-title .detail-freepass-badge{margin-left:9px;vertical-align:middle;transform:translateY(-2px)}
        #tbody.freepass-filter-active tr[data-rank]:not([data-freepass="1"]){display:none!important}
      `;
      (doc.head || doc.documentElement).appendChild(style);
    }

    function ensureStat() {
      const stats = doc.querySelector('.stats');
      if (!stats) return null;
      stats.style.gridTemplateColumns = 'repeat(auto-fit,minmax(140px,1fr))';
      let card = doc.getElementById('freepassStat');
      if (!card) {
        card = doc.createElement('div');
        card.id = 'freepassStat';
        card.className = 'stat';
        card.innerHTML = '<div class="k">프리패스 신청자</div><div class="v" id="freepassCount">0명</div>';
      }
      placeFreepassStatCard(stats, card);
      return card;
    }

    function ensureFilterButton() {
      const tabs = doc.querySelector('.sort-tabs');
      if (!tabs) return null;
      let button = tabs.querySelector('.freepass-filter-btn');
      if (!button) {
        button = doc.createElement('button');
        button.type = 'button';
        button.className = 'freepass-filter-btn';
        button.textContent = '프리패스';
        button.setAttribute('aria-pressed', 'false');
        button.addEventListener('click', () => {
          filterActive = !filterActive;
          apply();
        });
        tabs.appendChild(button);
      }
      return button;
    }

    function rowKey(row) {
      const trigger = row?.querySelector?.('.detail-trigger[data-detail-comment][data-detail-user]');
      if (!trigger) return '';
      return freepassKey({ commentNo: trigger.dataset.detailComment, userId: trigger.dataset.detailUser });
    }

    function syncRow(row) {
      const matched = freepassKeys.has(rowKey(row));
      row.setAttribute('data-freepass', matched ? '1' : '0');
      const nameRow = row.querySelector('.name-row');
      if (!nameRow) return;
      let badge = nameRow.querySelector('.freepass-badge');
      if (matched && !badge) {
        badge = doc.createElement('span');
        badge.className = 'freepass-badge';
        badge.textContent = '프리패스';
        badge.title = '프리패스 대상 신청자입니다.';
        nameRow.appendChild(badge);
      } else if (!matched && badge) {
        badge.remove();
      }
    }

    function syncDetailBadge() {
      const title = doc.querySelector('#applicantDetailTitle');
      if (!title) return;
      let badge = title.querySelector('.detail-freepass-badge');
      const matched = detailFreepass;
      if (matched && !badge) {
        badge = doc.createElement('span');
        badge.className = 'freepass-badge detail-freepass-badge';
        badge.textContent = '프리패스';
        badge.title = '프리패스 대상 신청자입니다.';
        title.appendChild(badge);
      } else if (!matched && badge) {
        badge.remove();
      }
    }

    function apply() {
      applyQueued = false;
      ensureStyle();
      ensureStat();
      const button = ensureFilterButton();
      const count = doc.getElementById('freepassCount');
      if (count) count.textContent = `${freepassKeys.size}명`;
      if (button) {
        button.classList.toggle('active', filterActive);
        button.setAttribute('aria-pressed', filterActive ? 'true' : 'false');
      }
      syncDetailBadge();
      const tbody = doc.getElementById('tbody');
      if (!tbody) return;
      tbody.classList.toggle('freepass-filter-active', filterActive);
      for (const row of tbody.querySelectorAll('tr[data-rank]')) syncRow(row);
    }

    function scheduleApply() {
      if (applyQueued) return;
      applyQueued = true;
      const raf = win.requestAnimationFrame || (callback => win.setTimeout(callback, 0));
      raf(apply);
    }

    function updateComments(comments) {
      freepassKeys = collectFreepassKeys(comments);
      scheduleApply();
    }

    win.fetch = async (...args) => {
      const response = await nativeFetch(...args);
      try {
        const rawUrl = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
        if (String(rawUrl).includes('/api/comments')) {
          response.clone().json().then(data => {
            if (Array.isArray(data?.comments)) updateComments(data.comments);
          }).catch(() => {});
        } else if (/\/api\/applicant-detail(?:-v2)?(?:\?|#|$)/.test(String(rawUrl))) {
          response.clone().json().then(data => {
            if (!data?.ok) return;
            detailFreepass = isFreepassDetail(data);
            scheduleApply();
          }).catch(() => {});
        }
      } catch {}
      return response;
    };

    const tbody = doc.getElementById('tbody');
    if (tbody && win.MutationObserver) new win.MutationObserver(scheduleApply).observe(tbody, { childList: true, subtree: true });
    const detailBody = doc.getElementById('applicantDetailBody');
    if (detailBody && win.MutationObserver) new win.MutationObserver(scheduleApply).observe(detailBody, { childList: true, subtree: true });
    ensureStyle();
    ensureStat();
    ensureFilterButton();
    scheduleApply();
  }

  return {
    PINNED_FREEPASS_USER_IDS,
    normalizeUserId,
    isPinnedFreepassUser,
    normalizeCommentText,
    normalizeForFreepassMatch,
    isFreepassUseComment,
    freepassKey,
    collectFreepassKeys,
    isFreepassDetail,
    placeFreepassStatCard,
    install
  };
});