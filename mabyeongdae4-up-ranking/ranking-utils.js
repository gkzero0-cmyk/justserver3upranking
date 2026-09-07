(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.RankingUtils = api;
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

  function detectApplicantType(comment) {
    const text = String(comment || '').replace(/\s+/g, ' ').trim();
    if (!text) return 'unknown';
    if (/간부\s*(신청|지원)?/i.test(text)) return 'officer';
    if (/병사\s*(신청|지원)?/i.test(text)) return 'soldier';
    return 'unknown';
  }

  function resolveApplicantType(comment, manualType) {
    const manual = String(manualType || '').trim();
    if (['soldier', 'officer', 'unknown'].includes(manual)) return manual;
    return detectApplicantType(comment);
  }

  function readObjectMap(raw) {
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
      const out = {};
      for (const [key, value] of Object.entries(parsed)) {
        if (typeof value === 'string') out[String(key)] = value;
      }
      return out;
    } catch {
      return {};
    }
  }

  function cyclePassState(state) {
    if (state === 'pass') return 'excluded';
    if (state === 'excluded') return 'none';
    return 'pass';
  }

  function exportSettings(settings = {}) {
    const normalized = {
      version: 1,
      favorites: [...new Set((settings.favorites || []).map(x => String(x || '').trim()).filter(Boolean))],
      applicantTypes: Object.fromEntries(Object.entries(settings.applicantTypes || {}).filter(([, v]) => typeof v === 'string')),
      passStates: Object.fromEntries(Object.entries(settings.passStates || {}).filter(([, v]) => typeof v === 'string'))
    };
    return JSON.stringify(normalized, null, 2);
  }

  function importSettings(raw) {
    const parsed = JSON.parse(String(raw || '{}'));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('설정 파일 형식이 올바르지 않습니다.');
    return {
      version: Number(parsed.version) || 1,
      favorites: [...new Set((Array.isArray(parsed.favorites) ? parsed.favorites : []).map(x => String(x || '').trim()).filter(Boolean))],
      applicantTypes: Object.fromEntries(Object.entries(parsed.applicantTypes || {}).filter(([, v]) => typeof v === 'string')),
      passStates: Object.fromEntries(Object.entries(parsed.passStates || {}).filter(([, v]) => typeof v === 'string'))
    };
  }

  return {
    favoriteKey,
    buildRankMap,
    getRankChange,
    parseKstDate,
    countKstToday,
    readFavoriteIds,
    toggleFavoriteId,
    detectApplicantType,
    resolveApplicantType,
    readObjectMap,
    cyclePassState,
    exportSettings,
    importSettings
  };
});
