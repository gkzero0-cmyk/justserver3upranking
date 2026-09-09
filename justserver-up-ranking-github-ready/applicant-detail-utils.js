(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.ApplicantDetailUtils = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function cleanText(value) {
    return String(value ?? '').replace(/<br\s*\/?\s*>/gi, '\n').replace(/<[^>]+>/g, '').trim();
  }

  function normalizeFanCount(value) {
    if (typeof value === 'number') return Number.isFinite(value) && value >= 0 ? Math.round(value) : null;
    const raw = cleanText(value).replace(/\s+/g, '');
    if (!raw) return null;

    const unit = raw.match(/([0-9]+(?:\.[0-9]+)?)(만|천)(?:\+([0-9,]+))?/);
    if (unit) {
      const base = Number(unit[1]) * (unit[2] === '만' ? 10000 : 1000);
      const plus = unit[3] ? Number(unit[3].replace(/,/g, '')) : 0;
      return Number.isFinite(base + plus) ? Math.round(base + plus) : null;
    }

    const plain = raw.match(/[0-9][0-9,]*/);
    if (!plain) return null;
    const number = Number(plain[0].replace(/,/g, ''));
    return Number.isFinite(number) ? number : null;
  }

  function parseApplicationComment(value, fallbackName = '') {
    const text = cleanText(value);
    const fallback = cleanText(fallbackName);
    const result = {
      name: fallback,
      declaredFanCount: null,
      message: '',
      moveInFee: ''
    };
    if (!text) return result;

    const labels = {
      name: /^(?:이름|닉네임|방송명)\s*[:：]\s*(.*)$/i,
      fan: /^(?:애청자|즐겨찾기|팔로워|팬(?:수)?)\s*[:：]\s*(.*)$/i,
      message: /^(?:하고\s*싶은\s*말|하고싶은말|한마디|메시지)\s*[:：]\s*(.*)$/i,
      fee: /^(?:입주비(?:\s*동의(?:여부)?)?)\s*[:：]\s*(.*)$/i
    };
    let labelHits = 0;
    for (const line of text.split(/\r?\n/).map(x => x.trim()).filter(Boolean)) {
      let match;
      if ((match = line.match(labels.name))) {
        result.name = cleanText(match[1]) || result.name;
        labelHits += 1;
      } else if ((match = line.match(labels.fan))) {
        result.declaredFanCount = normalizeFanCount(match[1]);
        labelHits += 1;
      } else if ((match = line.match(labels.message))) {
        result.message = cleanText(match[1]);
        labelHits += 1;
      } else if ((match = line.match(labels.fee))) {
        result.moveInFee = cleanText(match[1]);
        labelHits += 1;
      }
    }
    if (labelHits >= 2) return result;

    const parts = text.split(/\s*\/\s*/).map(x => x.trim()).filter(Boolean);
    if (parts.length >= 4) {
      result.name = parts[0] || result.name;
      result.declaredFanCount = normalizeFanCount(parts[1]);
      result.message = parts.slice(2, -1).join(' / ').trim();
      result.moveInFee = parts[parts.length - 1] || '';
      return result;
    }

    result.message = text;
    return result;
  }

  function normalizePhotoUrl(photo) {
    if (!photo) return '';
    const source = typeof photo === 'string' ? { url: photo } : photo;
    let value = cleanText(source.url || source.link || source.src || '');
    if (!value && source.domain && (source.filename || source.key)) {
      const domain = cleanText(source.domain).replace(/^https?:\/\//i, '').replace(/\/$/, '');
      const path = cleanText(source.filename || source.key).replace(/^\//, '');
      if (domain && path) value = `https://${domain}/${path}`;
    }
    if (!value) return '';
    if (value.startsWith('//')) return `https:${value}`;
    if (/^https?:\/\//i.test(value)) return value;
    if (source.domain) {
      const domain = cleanText(source.domain).replace(/^https?:\/\//i, '').replace(/\/$/, '');
      return `https://${domain}/${value.replace(/^\//, '')}`;
    }
    return '';
  }

  function formatApplicationDetail(rawComment, station) {
    const raw = rawComment || {};
    const userId = cleanText(raw.user_id || raw.userId || raw.writer_id || raw.writerId);
    const userNick = cleanText(raw.user_nick || raw.userNick || raw.nickname || raw.writer_nick || raw.writerNick);
    const comment = cleanText(raw.comment || raw.contents || raw.content || raw.memo || raw.text);
    const parsed = parseApplicationComment(comment, userNick);
    const currentFanCount = normalizeFanCount(station?.fan_cnt ?? station?.fanCount);
    const declaredFanCount = parsed.declaredFanCount;
    const fanCount = currentFanCount ?? declaredFanCount;
    const fanCountSource = currentFanCount !== null ? 'soop' : declaredFanCount !== null ? 'application' : 'unknown';

    return {
      name: parsed.name || cleanText(station?.user_nick) || userNick || userId || '정보 없음',
      userId,
      commentNo: cleanText(raw.p_comment_no || raw.comment_no || raw.commentNo || raw.comment_id || raw.commentId),
      fanCount,
      fanCountSource,
      declaredFanCount,
      message: parsed.message || comment || '정보 없음',
      moveInFee: parsed.moveInFee || '정보 없음',
      photoUrl: normalizePhotoUrl(raw.photo || raw.attachment || raw.image || null)
    };
  }

  return {
    parseApplicationComment,
    normalizePhotoUrl,
    normalizeFanCount,
    formatApplicationDetail
  };
});
