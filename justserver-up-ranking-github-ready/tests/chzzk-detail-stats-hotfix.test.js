const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const modulePath = path.join(__dirname, '..', 'chzzk-detail-stats-hotfix.js');
function load() {
  assert.equal(fs.existsSync(modulePath), true, 'chzzk-detail-stats-hotfix.js must exist');
  return require(modulePath);
}

test('recognizes CHZZK applicant details and formats follower counts', () => {
  const { isChzzkDetail, formatFollowerCount } = load();
  assert.equal(isChzzkDetail({ originalComment: '[치지직]차경 / 1,204명 / 신청합니다' }), true);
  assert.equal(isChzzkDetail({ originalComment: 'SOOP 신청자 / 120명 / 신청합니다' }), false);
  assert.equal(formatFollowerCount(418), '418');
  assert.equal(formatFollowerCount(12345), '12,345');
  assert.equal(formatFollowerCount(null), '정보 없음');
});

test('builds lookup URL with parsed applicant name and existing channel URL', () => {
  const { buildChzzkLookupUrl } = load();
  const url = buildChzzkLookupUrl({ name: '데로DeRo', chzzkStationUrl: 'https://chzzk.naver.com/abc' });
  assert.equal(url, '/api/chzzk-channel?name=%EB%8D%B0%EB%A1%9CDeRo&channelUrl=https%3A%2F%2Fchzzk.naver.com%2Fabc');
});
