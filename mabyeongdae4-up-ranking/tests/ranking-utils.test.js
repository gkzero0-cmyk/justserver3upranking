const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildRankMap,
  getRankChange,
  countKstToday,
  readFavoriteIds,
  toggleFavoriteId,
  favoriteKey,
  detectApplicantType,
  resolveApplicantType,
  readObjectMap,
  cyclePassState,
  exportSettings,
  importSettings
} = require('../ranking-utils');

test('buildRankMap stores rank by stable comment number', () => {
  const ranked = [
    { commentNo: '101', userId: 'alpha', rank: 1 },
    { commentNo: '102', userId: 'beta', rank: 2 }
  ];
  const map = buildRankMap(ranked);
  assert.equal(map.get('comment:101'), 1);
  assert.equal(map.get('comment:102'), 2);
});

test('getRankChange reports upward and downward movement', () => {
  assert.deepEqual(getRankChange(5, 8), { direction: 'up', from: 8, to: 5, delta: 3 });
  assert.deepEqual(getRankChange(9, 4), { direction: 'down', from: 4, to: 9, delta: 5 });
  assert.equal(getRankChange(4, 4), null);
  assert.equal(getRankChange(4, undefined), null);
});

test('countKstToday uses the Korea calendar day boundary', () => {
  const now = Date.parse('2026-09-08T06:22:00+09:00');
  const comments = [
    { regDate: '2026-09-08 00:00:00' },
    { regDate: '2026-09-08 06:21:59' },
    { regDate: '2026-09-07 23:59:59' },
    { regDate: '2026-09-07T16:00:00Z' }
  ];
  assert.equal(countKstToday(comments, now), 3);
});

test('favorite helpers persist a clean unique set and survive malformed storage', () => {
  assert.deepEqual(readFavoriteIds('["comment:1","comment:1","comment:2"]'), ['comment:1', 'comment:2']);
  assert.deepEqual(readFavoriteIds('{broken'), []);
  assert.deepEqual(toggleFavoriteId(['comment:1'], 'comment:2'), ['comment:1', 'comment:2']);
  assert.deepEqual(toggleFavoriteId(['comment:1', 'comment:2'], 'comment:1'), ['comment:2']);
});

test('favoriteKey falls back when comment number is unavailable', () => {
  assert.equal(favoriteKey({ commentNo: '77', userId: 'abc', regDate: '2026-09-08' }), 'comment:77');
  assert.equal(favoriteKey({ userId: 'abc', regDate: '2026-09-08 03:00:00' }), 'user:abc|2026-09-08 03:00:00');
});

test('detectApplicantType recognizes soldier and officer wording', () => {
  assert.equal(detectApplicantType('마병대 4 병사 신청합니다'), 'soldier');
  assert.equal(detectApplicantType('간부 지원합니다'), 'officer');
  assert.equal(detectApplicantType('간부 신청 / 병사 경험 있음'), 'officer');
  assert.equal(detectApplicantType('열심히 하겠습니다'), 'unknown');
});

test('resolveApplicantType prefers manual override over automatic detection', () => {
  assert.equal(resolveApplicantType('병사 신청합니다', 'officer'), 'officer');
  assert.equal(resolveApplicantType('간부 신청합니다', ''), 'officer');
  assert.equal(resolveApplicantType('기타', 'unknown'), 'unknown');
});

test('readObjectMap returns only string values from valid JSON objects', () => {
  assert.deepEqual(readObjectMap('{"comment:1":"soldier","comment:2":"officer","bad":4}'), {
    'comment:1': 'soldier',
    'comment:2': 'officer'
  });
  assert.deepEqual(readObjectMap('{broken'), {});
  assert.deepEqual(readObjectMap('["x"]'), {});
});

test('cyclePassState rotates none to pass to excluded and back to none', () => {
  assert.equal(cyclePassState('none'), 'pass');
  assert.equal(cyclePassState('pass'), 'excluded');
  assert.equal(cyclePassState('excluded'), 'none');
  assert.equal(cyclePassState('wat'), 'pass');
});

test('settings export and import round-trip normalized metadata', () => {
  const json = exportSettings({
    favorites: ['comment:2', 'comment:2', 'comment:1'],
    applicantTypes: { 'comment:1': 'soldier' },
    passStates: { 'comment:2': 'excluded' }
  });
  const parsed = importSettings(json);
  assert.deepEqual(parsed.favorites, ['comment:2', 'comment:1']);
  assert.deepEqual(parsed.applicantTypes, { 'comment:1': 'soldier' });
  assert.deepEqual(parsed.passStates, { 'comment:2': 'excluded' });
  assert.equal(parsed.version, 1);
});
