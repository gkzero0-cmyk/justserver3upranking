(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root && root.document && typeof root.fetch === 'function') api.install(root);
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function urlText(input) {
    if (typeof input === 'string') return input;
    if (input && typeof input.href === 'string') return input.href;
    if (input && typeof input.url === 'string') return input.url;
    return '';
  }

  function isLegacyDetailUrl(input, base = 'https://justserver.local/') {
    const raw = urlText(input);
    if (!raw) return false;
    try {
      return new URL(raw, base).pathname === '/api/applicant-detail';
    } catch {
      return false;
    }
  }

  function toV2Url(input) {
    const raw = urlText(input);
    return raw.replace(/\/api\/applicant-detail(?=\?|#|$)/, '/api/applicant-detail-v2');
  }

  function rewriteInput(input) {
    if (typeof input === 'string') return toV2Url(input);
    if (typeof URL !== 'undefined' && input instanceof URL) return new URL(toV2Url(input));
    if (typeof Request !== 'undefined' && input instanceof Request) return new Request(toV2Url(input.url), input);
    return input;
  }

  function install(win) {
    if (!win || typeof win.fetch !== 'function' || win.__justserverApplicantDetailV2Installed) return;
    win.__justserverApplicantDetailV2Installed = true;
    const nativeFetch = win.fetch.bind(win);
    win.fetch = async (...args) => {
      const base = win.location?.href || 'https://justserver.local/';
      if (!isLegacyDetailUrl(args[0], base)) return nativeFetch(...args);
      const v2Args = [rewriteInput(args[0]), ...args.slice(1)];
      try {
        const response = await nativeFetch(...v2Args);
        if (response?.ok) return response;
      } catch {}
      return nativeFetch(...args);
    };
  }

  return { urlText, isLegacyDetailUrl, toV2Url, rewriteInput, install };
});
