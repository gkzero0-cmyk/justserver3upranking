function cleanText(value) {
  return String(value ?? '').normalize('NFKC').trim();
}

const VERIFIED_CHZZK_NAME_CHANNELS = Object.freeze({
  '슈야': 'a046d361cebc40196408424814473562',
  '슈야shuya': 'a046d361cebc40196408424814473562',
  '또랑이': '1d171cef533bc5c6d33850d4f5c4ecdf',
  '후로기': '332287ba7e39978bd83c125db09cf600',
  '쑤니s': 'e3b1c8a6af2882052ceda4b225a422c0',
  '히게': 'de207d7ea717cc73a4ed99d303068d88',
  '루이luii': '98d01e25e79820a55d261f3baf19f2eb',
  '이링이': '1cce2792dc894459fcd29c54cea2d4a5',
  '카오스': '9363010ea9cd1288612eadcd81178477',
  '카오스_': '9363010ea9cd1288612eadcd81178477',
  '노리668': '1d694389462927382fbd3b9239792729'
});

function extractChzzkChannelId(value) {
  const match = cleanText(value).match(/https?:\/\/(?:m\.)?chzzk\.naver\.com\/(?:live\/)?([A-Za-z0-9_-]+)/i);
  return match ? match[1] : '';
}

function normalizeChzzkChannelName(value) {
  return cleanText(value).toLocaleLowerCase('ko-KR').replace(/\s+/g, '');
}

function getVerifiedChzzkChannelId(name) {
  const normalized = normalizeChzzkChannelName(name);
  return VERIFIED_CHZZK_NAME_CHANNELS[normalized] || '';
}

function channelRows(payload) {
  const rows = payload?.content?.data ?? payload?.data ?? [];
  return Array.isArray(rows) ? rows.map(item => item?.channel || item).filter(Boolean) : [];
}

function pickExactChzzkChannel(payload, expectedName) {
  const expected = cleanText(expectedName);
  if (!expected) return null;
  const rows = channelRows(payload);
  const direct = rows.filter(channel => cleanText(channel?.channelName).toLocaleLowerCase('ko-KR') === expected.toLocaleLowerCase('ko-KR'));
  if (direct.length === 1) return direct[0];
  if (direct.length > 1) return null;

  const normalizedExpected = normalizeChzzkChannelName(expected);
  const normalized = rows.filter(channel => normalizeChzzkChannelName(channel?.channelName) === normalizedExpected);
  return normalized.length === 1 ? normalized[0] : null;
}

function parseChzzkChannel(payload) {
  const channel = payload?.content?.channel || payload?.content || payload?.channel || payload || null;
  if (!channel || !cleanText(channel.channelId)) return null;
  const follower = Number(channel.followerCount);
  return {
    channelId: cleanText(channel.channelId),
    channelName: cleanText(channel.channelName),
    followerCount: Number.isFinite(follower) && follower >= 0 ? Math.round(follower) : null,
    channelImageUrl: cleanText(channel.channelImageUrl)
  };
}

function buildChzzkStationUrl(channelId) {
  const id = cleanText(channelId);
  return /^[A-Za-z0-9_-]+$/.test(id) ? `https://chzzk.naver.com/${id}` : '';
}

module.exports = {
  VERIFIED_CHZZK_NAME_CHANNELS,
  extractChzzkChannelId,
  normalizeChzzkChannelName,
  getVerifiedChzzkChannelId,
  pickExactChzzkChannel,
  parseChzzkChannel,
  buildChzzkStationUrl
};
