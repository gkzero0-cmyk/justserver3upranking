const test = require('node:test');
const assert = require('node:assert/strict');
const speed = require('../applicant-detail-speed-hotfix.js');

const detailUtils = {
  parseApplicationComment(comment, fallback) {
    const parts = String(comment).split('/').map(x => x.trim());
    return { name: parts[0] || fallback, declaredFanCount: 123, message: parts[2] || '', moveInFee: parts[3] || '' };
  },
  resolveDetailNameOverride() { return ''; },
  extractChzzkStationUrl() { return ''; },
  isChzzkApplication() { return false; }
};

test('buildOptimisticDetail renders application content immediately with current SOOP count', () => {
  const detail = speed.buildOptimisticDetail({
    commentNo: '123', userId: 'tester', userNick: '테스터',
    comment: '테스터 / 123 / 바로 보여줘 / 입주비 동의',
    photoUrl: 'https://example.com/a.png'
  }, 456, detailUtils);
  assert.equal(detail.ok, true);
  assert.equal(detail.name, '테스터');
  assert.equal(detail.fanCount, 456);
  assert.equal(detail.fanCountSource, 'soop');
  assert.equal(detail.message, '바로 보여줘');
  assert.equal(detail.moveInFee, '입주비 동의');
  assert.equal(detail.photoUrl, 'https://example.com/a.png');
  assert.equal(detail.optimistic, true);
});

test('detail memory cache returns fresh entries and expires old entries', () => {
  const cache = speed.createDetailMemoryCache();
  speed.putCachedDetail(cache, '123:tester', { ok: true, name: '테스터' }, 1000);
  assert.equal(speed.getCachedDetail(cache, '123:tester', 2000, 5000).name, '테스터');
  assert.equal(speed.getCachedDetail(cache, '123:tester', 7000, 5000), null);
});

test('neighborPrefetchTargets returns one unique neighbor on each side', () => {
  const items = [
    { key: '1:a', commentNo: '1', userId: 'a' },
    { key: '2:b', commentNo: '2', userId: 'b' },
    { key: '3:c', commentNo: '3', userId: 'c' }
  ];
  assert.deepEqual(speed.neighborPrefetchTargets(items, '2:b'), [items[0], items[2]]);
});
