(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.ApplicantDetailUtils = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function cleanText(value) {
    return String(value ?? '').replace(/<br\s*\/?\s*>/gi, '\n').replace(/<[^>]+>/g, '').trim();
  }

  function stripDecoration(value) {
    return cleanText(value).replace(/^[^\p{L}\p{N}]+/u, '').trim();
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
      name: /^(?:이름|닉네임|방송명|신청자)\s*(?::|：|-)?\s*(.*)$/i,
      fan: /^(?:애청자(?:\s*수)?|즐겨찾기(?:\s*수)?|즐찾(?:\s*수)?|팔로워(?:\s*수)?|팔로우\s*수|팬(?:\s*수)?)\s*(?::|：|-)?\s*(.*)$/i,
      message: /^(?:하고\s*싶은\s*말|하고싶은말|한마디|메시지|지원\s*동기)\s*(?::|：|-)?\s*(.*)$/i,
      fee: /^(?:입주비\s*(?:동의\s*(?:여부)?)?|입주비동의여부)\s*(?::|：|-)?\s*(.*)$/i
    };
    let labelHits = 0;
    let currentField = '';
    const lines = text.split(/\r?\n/).map(x => x.trim()).filter(Boolean);

    for (const originalLine of lines) {
      const line = stripDecoration(originalLine);
      let match;
      if ((match = line.match(labels.name))) {
        result.name = cleanText(match[1]) || result.name;
        currentField = 'name';
        labelHits += 1;
      } else if ((match = line.match(labels.fan))) {
        result.declaredFanCount = normalizeFanCount(match[1]);
        currentField = 'fan';
        labelHits += 1;
      } else if ((match = line.match(labels.message))) {
        result.message = cleanText(match[1]);
        currentField = 'message';
        labelHits += 1;
      } else if ((match = line.match(labels.fee))) {
        result.moveInFee = cleanText(match[1]);
        currentField = 'fee';
        labelHits += 1;
      } else if (currentField === 'message' && result.message) {
        result.message += `\n${cleanText(originalLine)}`;
      } else if (currentField === 'fee' && result.moveInFee) {
        result.moveInFee += `\n${cleanText(originalLine)}`;
      }
    }
    if (labelHits >= 2) return result;

    const parts = text.split(/\s*\/\s*/).map(x => x.trim()).filter(Boolean);
    if (parts.length >= 4) {
      result.name = stripDecoration(parts[0]) || result.name;
      result.declaredFanCount = normalizeFanCount(parts[1]);
      result.message = parts.slice(2, -1).join(' / ').trim();
      result.moveInFee = parts[parts.length - 1] || '';
      return result;
    }

    const blocks = [];
    let currentBlock = '';
    for (const originalLine of lines) {
      const trimmed = cleanText(originalLine);
      const stripped = stripDecoration(trimmed);
      const startsDecorated = Boolean(stripped && stripped !== trimmed);
      if (startsDecorated) {
        if (currentBlock) blocks.push(currentBlock);
        currentBlock = stripped;
      } else if (currentBlock) {
        currentBlock += `\n${trimmed}`;
      } else if (trimmed) {
        blocks.push(trimmed);
      }
    }
    if (currentBlock) blocks.push(currentBlock);

    const secondFanCount = blocks.length >= 2 ? normalizeFanCount(blocks[1]) : null;
    const lastBlock = blocks.length ? blocks[blocks.length - 1] : '';
    if (blocks.length >= 4 && secondFanCount !== null && /입주비|동의|비동의/i.test(lastBlock)) {
      result.name = cleanText(blocks[0]) || result.name;
      result.declaredFanCount = secondFanCount;
      result.message = blocks.slice(2, -1).join('\n').trim();
      result.moveInFee = cleanText(lastBlock);
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
    const currentFanCount = normalizeFanCount(
      station?.station?.upd?.fan_cnt ?? station?.upd?.fan_cnt ?? station?.fan_cnt ?? station?.fanCount
    );
    const stationNick = cleanText(station?.station?.user_nick || station?.station_name || station?.user_nick || station?.userNick);
    const declaredFanCount = parsed.declaredFanCount;
    const fanCount = currentFanCount ?? declaredFanCount;
    const fanCountSource = currentFanCount !== null ? 'soop' : declaredFanCount !== null ? 'application' : 'unknown';

    return {
      name: parsed.name || stationNick || userNick || userId || '정보 없음',
      userId,
      commentNo: cleanText(raw.p_comment_no || raw.comment_no || raw.commentNo || raw.comment_id || raw.commentId),
      fanCount,
      fanCountSource,
      declaredFanCount,
      message: parsed.message || comment || '정보 없음',
      moveInFee: parsed.moveInFee || '정보 없음',
      originalComment: comment,
      profileImageUrl: normalizePhotoUrl(station?.profile_image || station?.profileImage || station?.station?.profile_image || null),
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