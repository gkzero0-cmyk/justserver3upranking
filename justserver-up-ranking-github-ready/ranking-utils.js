(() => {
  if (typeof document === 'undefined') return;
  const current = document.currentScript;
  const source = current?.src || location.href;
  const baseUrl = new URL('./ranking-utils-base.js', source).href;
  const fixUrl = new URL('./live-soop-filter-fix.js', source).href;
  const detailHotfixUrl = new URL('./applicant-detail-navigation-hotfix.js', source).href;
  const chzzkStatsHotfixUrl = new URL('./chzzk-detail-stats-hotfix.js', source).href;
  document.write(`<script src="${baseUrl}"><\/script>`);
  document.write(`<script src="${fixUrl}"><\/script>`);
  document.write(`<script src="${detailHotfixUrl}"><\/script>`);
  document.write(`<script src="${chzzkStatsHotfixUrl}"><\/script>`);
})();
