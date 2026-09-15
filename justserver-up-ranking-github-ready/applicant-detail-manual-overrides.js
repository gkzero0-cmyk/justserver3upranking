(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) {
    root.ApplicantDetailManualOverrides = api;
    if (root.document && typeof root.fetch === 'function') api.install(root);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const DETAIL_OVERRIDES = Object.freeze({
    gus9107: Object.freeze({ name: '유다한' }),
    whdgns2569: Object.freeze({ name: '월야령' }),
    dd0705: Object.freeze({ name: '디또띠' }),
    mat981: Object.freeze({ name: '갱소리' }),
    naranggu99: Object.freeze({ name: '사일' }),
    jyd0808: Object.freeze({ name: '놈삐' }),
    nmoohae1205: Object.freeze({
      name: '무해_',
      message: '마크 간절하고간절하게 너무너무너무하고싶습니다!!!!!!! 즐찾수도 ㅠㅠ 너무감사드립니다 충분히 높게받으실수도이쓴데 이런 기회주셔서 너무감사드립니다!!!! 복 많이 받으세요!!!',
      moveInFee: '입주비 동의합니다!'
    }),
    fldkaldhs123: Object.freeze({
      name: '종겜추',
      message: '전설로만 내려오던 그냥서버를 제 두 눈으로 보게 될 줄은 정말 몰랐습니다\n마크서버 한 번도 안 해봤는데 좋은 기회에 꼭 한 번 해보고 싶습니다!!\n이 한 몸 불태워서 그냥서버에서 회광반조 하겠습니다!'
    }),
    rintube: Object.freeze({
      name: '나린인데?',
      message: '춘봉님 그냥서버!!!!!!!!!!!! 꼭 하고시퍼요!!!!!!!!!!!!!!!',
      moveInFee: '동의합니다.'
    })
  });

  function normalizeUserId(value) {
    return String(value || '').trim().toLowerCase();
  }

  function getOverride(userId) {
    return DETAIL_OVERRIDES[normalizeUserId(userId)] || null;
  }

  function applyDetailOverride(payload, fallbackUserId = '') {
    if (!payload || typeof payload !== 'object' || !payload.ok) return payload;
    const userId = normalizeUserId(payload.userId || fallbackUserId);
    const override = getOverride(userId);
    if (!override) return payload;

    let changed = false;
    const next = { ...payload };
    for (const field of ['name', 'message', 'moveInFee']) {
      if (Object.prototype.hasOwnProperty.call(override, field) && next[field] !== override[field]) {
        next[field] = override[field];
        changed = true;
      }
    }
    return changed ? next : payload;
  }

  function userIdFromRequest(input, init, base) {
    try {
      const rawUrl = typeof input === 'string' ? input : input?.url || '';
      const url = new URL(rawUrl, base || 'https://justserver.local/');
      const queryUser = normalizeUserId(url.searchParams.get('userId'));
      if (queryUser) return queryUser;
      const body = init?.body;
      if (typeof body === 'string' && body) {
        const parsed = JSON.parse(body);
        return normalizeUserId(parsed?.userId);
      }
    } catch {}
    return '';
  }

  function isDetailRequest(input, base) {
    try {
      const rawUrl = typeof input === 'string' ? input : input?.url || '';
      const url = new URL(rawUrl, base || 'https://justserver.local/');
      return /^\/api\/applicant-detail(?:-v2)?$/.test(url.pathname);
    } catch {
      return false;
    }
  }

  async function rewriteResponse(win, response, fallbackUserId) {
    if (!response?.ok || typeof response.clone !== 'function' || typeof win?.Response !== 'function') return response;
    try {
      const payload = await response.clone().json();
      const next = applyDetailOverride(payload, fallbackUserId);
      if (next === payload) return response;
      const headers = new win.Headers(response.headers);
      headers.delete('content-length');
      return new win.Response(JSON.stringify(next), {
        status: response.status,
        statusText: response.statusText,
        headers
      });
    } catch {
      return response;
    }
  }

  function patchNameResolver(win) {
    const utils = win?.ApplicantDetailUtils;
    if (!utils || utils.__manualNameOverridesPatched) return;
    const original = typeof utils.resolveDetailNameOverride === 'function'
      ? utils.resolveDetailNameOverride.bind(utils)
      : () => '';
    utils.resolveDetailNameOverride = userId => getOverride(userId)?.name || original(userId) || '';
    utils.__manualNameOverridesPatched = true;
  }

  function install(win) {
    if (!win || typeof win.fetch !== 'function' || win.__applicantDetailManualOverridesInstalled) return;
    win.__applicantDetailManualOverridesInstalled = true;
    patchNameResolver(win);
    const nativeFetch = win.fetch.bind(win);

    win.fetch = async (...args) => {
      const base = win.location?.href || 'https://justserver.local/';
      if (!isDetailRequest(args[0], base)) return nativeFetch(...args);
      const userId = userIdFromRequest(args[0], args[1], base);
      const response = await nativeFetch(...args);
      return rewriteResponse(win, response, userId);
    };
  }

  return {
    DETAIL_OVERRIDES,
    normalizeUserId,
    getOverride,
    applyDetailOverride,
    userIdFromRequest,
    isDetailRequest,
    patchNameResolver,
    install
  };
});
