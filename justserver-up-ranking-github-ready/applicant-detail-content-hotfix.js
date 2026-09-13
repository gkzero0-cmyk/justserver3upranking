(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root && root.document) api.install(root);
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function splitLinkSegments(value) {
    const text = String(value ?? '');
    const regex = /https?:\/\/[^\s<>"']+/giu;
    const segments = [];
    let lastIndex = 0;
    let match;
    while ((match = regex.exec(text))) {
      if (match.index > lastIndex) segments.push({ type: 'text', value: text.slice(lastIndex, match.index) });
      let url = match[0];
      let trailing = '';
      while (/[),.;!?\]}〉》」』]+$/u.test(url)) {
        trailing = url.slice(-1) + trailing;
        url = url.slice(0, -1);
      }
      if (url) segments.push({ type: 'link', value: url });
      if (trailing) segments.push({ type: 'text', value: trailing });
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < text.length) segments.push({ type: 'text', value: text.slice(lastIndex) });
    return segments.length ? segments : [{ type: 'text', value: text }];
  }

  function ensureStyle(doc) {
    if (doc.getElementById('applicantDetailContentHotfixStyle')) return;
    const style = doc.createElement('style');
    style.id = 'applicantDetailContentHotfixStyle';
    style.textContent = `
      .detail-inline-link{color:#9fb5ff;text-decoration:underline;text-underline-offset:3px;word-break:break-all}
      .detail-inline-link:hover{color:#d7e0ff}
      .detail-photo{cursor:zoom-in}
      .detail-photo-lightbox{position:fixed;inset:0;z-index:12000;display:none;align-items:center;justify-content:center;padding:28px;background:rgba(0,0,0,.9);backdrop-filter:blur(6px)}
      .detail-photo-lightbox.open{display:flex}
      .detail-photo-lightbox img{max-width:min(96vw,1600px);max-height:92vh;object-fit:contain;border-radius:10px;box-shadow:0 24px 80px rgba(0,0,0,.55)}
      .detail-photo-lightbox-close{position:fixed;right:22px;top:18px;width:44px;height:44px;border-radius:12px;border:1px solid #4a5770;background:#151c29;color:#fff;font-size:28px;line-height:1;cursor:pointer}
      .detail-photo-lightbox-close:hover{background:#222d40}
      @media(max-width:820px){.detail-photo-lightbox{padding:14px}.detail-photo-lightbox-close{right:10px;top:10px;width:40px;height:40px}}
    `;
    (doc.head || doc.documentElement).appendChild(style);
  }

  function linkifyElement(doc, element) {
    if (!element || element.dataset.detailLinkified === '1') return;
    const text = element.textContent || '';
    const segments = splitLinkSegments(text);
    if (!segments.some(segment => segment.type === 'link')) {
      element.dataset.detailLinkified = '1';
      return;
    }
    const fragment = doc.createDocumentFragment();
    for (const segment of segments) {
      if (segment.type === 'link') {
        const anchor = doc.createElement('a');
        anchor.className = 'detail-inline-link';
        anchor.href = segment.value;
        anchor.target = '_blank';
        anchor.rel = 'noopener noreferrer';
        anchor.textContent = segment.value;
        fragment.appendChild(anchor);
      } else {
        fragment.appendChild(doc.createTextNode(segment.value));
      }
    }
    element.replaceChildren(fragment);
    element.dataset.detailLinkified = '1';
  }

  function ensureLightbox(doc) {
    let lightbox = doc.getElementById('detailPhotoLightbox');
    if (lightbox) return lightbox;
    lightbox = doc.createElement('div');
    lightbox.id = 'detailPhotoLightbox';
    lightbox.className = 'detail-photo-lightbox';
    lightbox.setAttribute('aria-hidden', 'true');
    lightbox.innerHTML = '<button type="button" class="detail-photo-lightbox-close" aria-label="확대 사진 닫기">×</button><img alt="확대된 신청 첨부 사진">';
    doc.body.appendChild(lightbox);
    return lightbox;
  }

  function install(win) {
    if (!win || !win.document || win.__justserverDetailContentHotfixInstalled) return;
    win.__justserverDetailContentHotfixInstalled = true;
    const doc = win.document;
    ensureStyle(doc);
    const lightbox = ensureLightbox(doc);
    const zoomedImage = lightbox.querySelector('img');

    function closeLightbox() {
      lightbox.classList.remove('open');
      lightbox.setAttribute('aria-hidden', 'true');
      zoomedImage.removeAttribute('src');
    }

    function openLightbox(image) {
      const src = image?.currentSrc || image?.src || '';
      if (!/^https?:\/\//i.test(src)) return;
      zoomedImage.src = src;
      zoomedImage.alt = image.alt || '확대된 신청 첨부 사진';
      lightbox.classList.add('open');
      lightbox.setAttribute('aria-hidden', 'false');
      lightbox.querySelector('.detail-photo-lightbox-close')?.focus();
    }

    function apply() {
      const body = doc.getElementById('applicantDetailBody');
      if (!body) return;
      for (const value of body.querySelectorAll('.detail-value')) linkifyElement(doc, value);
    }

    doc.addEventListener('click', event => {
      const image = event.target?.closest?.('.detail-photo');
      if (image) {
        event.preventDefault();
        openLightbox(image);
        return;
      }
      if (event.target === lightbox || event.target?.closest?.('.detail-photo-lightbox-close')) closeLightbox();
    });

    doc.addEventListener('keydown', event => {
      if (event.key !== 'Escape' || !lightbox.classList.contains('open')) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      closeLightbox();
    }, true);

    const body = doc.getElementById('applicantDetailBody');
    if (body && win.MutationObserver) new win.MutationObserver(apply).observe(body, { childList: true, subtree: true });
    apply();
  }

  return { splitLinkSegments, install };
});
