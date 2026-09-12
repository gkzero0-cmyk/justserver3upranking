const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const helperPath = path.join(__dirname, '..', 'chzzk-channel-lookup.js');

function loadHelper() {
  assert.equal(fs.existsSync(helperPath), true, 'chzzk-channel-lookup.js must exist');
  return require(helperPath);
}

test('extracts channel ids from normal, mobile and live CHZZK URLs', () => {
  const { extractChzzkChannelId } = loadHelper();
  const id = '6a6825de1007633794516692c0cfc378';
  assert.equal(extractChzzkChannelId(`https://chzzk.naver.com/${id}`), id);
  assert.equal(extractChzzkChannelId(`https://m.chzzk.naver.com/${id}`), id);
  assert.equal(extractChzzkChannelId(`https://chzzk.naver.com/live/${id}`), id);
});

test('prefers a direct exact channel-name match over similar search results', () => {
  const { pickExactChzzkChannel } = loadHelper();
  const payload = {
    content: { data: [
      { channel: { channelId: 'similar', channelName: '데로 DERO', followerCount: 564 } },
      { channel: { channelId: 'exact', channelName: '데로DeRo', followerCount: 418 } }
    ] }
  };
  assert.equal(pickExactChzzkChannel(payload, '데로DeRo').channelId, 'exact');
});

test('allows only normalized exact matches and rejects fuzzy names', () => {
  const { pickExactChzzkChannel } = loadHelper();
  const normalizedOnly = { content: { data: [
    { channel: { channelId: 'normalized', channelName: '데 로 DERO', followerCount: 10 } }
  ] } };
  assert.equal(pickExactChzzkChannel(normalizedOnly, '데로dero').channelId, 'normalized');

  const fuzzy = { content: { data: [
    { channel: { channelId: 'fuzzy', channelName: '데로DeRo TV', followerCount: 999 } }
  ] } };
  assert.equal(pickExactChzzkChannel(fuzzy, '데로DeRo'), null);
});

test('refuses ambiguous normalized matches when no direct exact match exists', () => {
  const { pickExactChzzkChannel } = loadHelper();
  const payload = { content: { data: [
    { channel: { channelId: 'a', channelName: 'AB C', followerCount: 1 } },
    { channel: { channelId: 'b', channelName: 'A BC', followerCount: 2 } }
  ] } };
  assert.equal(pickExactChzzkChannel(payload, 'ABC'), null);
});
