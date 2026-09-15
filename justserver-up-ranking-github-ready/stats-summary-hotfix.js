(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) {
    root.RankingSummaryStatsHotfix = api;
    if (root.document && typeof root.fetch === 'function') api.install(root);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const EXCLUDED_DUPLICATE_COUNT = 2;

  function applicantKey(item, utils) {
    const userId = String(item?.userId ?? item?.user_id ?? '').trim().toLowerCase();
    if (userId) return `user:${userId}`;
    return typeof utils?.favoriteKey === 'function' ? String(utils.favoriteKey(item) || '') : '';
  }

  function countSoopApplicants(comments, utils) {
    const applicants = new Set();
    for (const item of comments || []) {
      if (typeof utils?.isChzzkApplicant === 'function' && utils.isChzzkApplicant(item)) continue;
      const key = applicantKey(item, utils);
      if (key) applicants.add(key);
    }
    return applicants.size;
  }

  function findStatCard(doc, valueId) {
    return doc?.getElementById(valueId)?.closest?.('.stat') || null;
  }

  function findAutoRefreshCard(stats) {
    return Array.from(stats?.children || []).find(node => /자동\s*갱신/iu.test(String(node?.textContent || ''))) || null;
  }

  function ensureStyle(doc) {
    if (!doc || doc.getElementById('summaryStatsHotfixStyle')) return;
    const style = doc.createElement('style');
    style.id = 'summaryStatsHotfixStyle';
    style.textContent = `
      .stats .stat-note{display:block;margin-top:3px;color:#667287;font-size:10px;font-weight:700;line-height:1.3}
    `;
    (doc.head || doc.documentElement).appendChild(style);
  }

  function ensureSoopCard(doc, stats) {
    let card = doc.getElementById('soopApplicantStat');
    if (card) return card;
    card = doc.createElement('div');
    card.id = 'soopApplicantStat';
    card.className = 'stat';
    card.innerHTML = '<div class="k">숲 신청자</div><div class="v" id="soopApplicantCount">-</div>';
    stats.appendChild(card);
    return card;
  }

  function ensureCards(doc) {
    const stats = doc?.querySelector?.('.stats');
    if (!stats) return null;
    ensureStyle(doc);
    stats.style.gridTemplateColumns = 'repeat(auto-fit,minmax(150px,1fr))';

    const totalCard = findStatCard(doc, 'totalCount');
    const topCard = findStatCard(doc, 'topUp');
    const cutCard = findStatCard(doc, 'cutUp');
    const chzzkCard = findStatCard(doc, 'chzzkCount');
    const lowSoopCard = findStatCard(doc, 'lowSoopFavoriteCount');
    const freepassCard = findStatCard(doc, 'freepassCount');
    const autoCard = findAutoRefreshCard(stats);
    const soopCard = ensureSoopCard(doc, stats);

    if (topCard) topCard.hidden = true;
    if (cutCard) cutCard.hidden = true;

    const totalLabel = totalCard?.querySelector?.('.k');
    if (totalLabel && !totalLabel.querySelector('.stat-note')) {
      totalLabel.innerHTML = `전체 댓글 <span class="stat-note">(중복 게시글 ${EXCLUDED_DUPLICATE_COUNT}건 제외)</span>`;
    }

    for (const card of [totalCard, soopCard, chzzkCard, lowSoopCard, freepassCard, autoCard]) {
      if (card) stats.appendChild(card);
    }
    for (const hiddenCard of [topCard, cutCard]) {
      if (hiddenCard) stats.appendChild(hiddenCard);
    }
    return stats;
  }

  function install(win) {
    if (!win?.document || typeof win.fetch !== 'function' || win.__rankingSummaryStatsHotfixInstalled) return;
    win.__rankingSummaryStatsHotfixInstalled = true;
    const doc = win.document;
    const utils = win.RankingUtils || {};
    const nativeFetch = win.fetch.bind(win);

    function update(comments) {
      ensureCards(doc);
      const countNode = doc.getElementById('soopApplicantCount');
      if (countNode) countNode.textContent = `${countSoopApplicants(comments, utils)}명`;
    }

    win.fetch = async (...args) => {
      const response = await nativeFetch(...args);
      try {
        const request = args[0];
        const requestUrl = typeof request === 'string' ? request : request?.url || '';
        if (String(requestUrl).includes('/api/comments')) {
          response.clone().json().then(data => {
            if (Array.isArray(data?.comments)) update(data.comments);
          }).catch(() => {});
        }
      } catch {}
      return response;
    };

    ensureCards(doc);
  }

  return {
    EXCLUDED_DUPLICATE_COUNT,
    applicantKey,
    countSoopApplicants,
    findAutoRefreshCard,
    ensureCards,
    install
  };
});
