const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const liveFix = require('../live-soop-filter-fix.js');
const nav = require('../applicant-detail-navigation-hotfix.js');
const detailApi = require('../api/applicant-detail.js');
const liveSource = fs.readFileSync(path.join(root, 'live-soop-filter-fix.js'), 'utf8');
const navSource = fs.readFileSync(path.join(root, 'applicant-detail-navigation-hotfix.js'), 'utf8');
const detailSource = fs.readFileSync(path.join(root, 'api', 'applicant-detail.js'), 'utf8');
const commentsSource = fs.readFileSync(path.join(root, 'api', 'comments.js'), 'utf8');

const utils = { favoriteKey: item => `comment:${item.commentNo}` };

test('500 이하 is based on current SOOP count, not the submitted count', () => {
  const comments = [
    { userId: 'uchi5757', commentNo: '1', comment: '우치! / 388명 / 신청' },
    { userId: 'nowlow', commentNo: '2', comment: '신청자 / 900명 / 신청' }
  ];
  const result = liveFix.resolveVerifiedLowSoopApplicants(comments, { uchi5757: 860, nowlow: 480 }, 500, utils);
  assert.deepEqual(result.users, ['nowlow']);
});

test('500 이하 excludes CHZZK-only applicants', () => {
  const item = { userId: 'chzzk', commentNo: '3', comment: '레코드진(치지직) / 947명 / 신청' };
  assert.equal(liveFix.isClearlyChzzkOnlyApplicant(item), true);
  assert.deepEqual(liveFix.resolveVerifiedLowSoopApplicants([item], { chzzk: 12 }, 500, utils).users, []);
});

test('500 이하 authoritative values are re-applied after the filter button runs', () => {
  assert.match(liveSource, /low-soop-filter-btn/);
  assert.match(liveSource, /addEventListener\(['"]click['"][\s\S]{0,120}scheduleApply/);
  assert.match(liveSource, /SOOP_BATCH_SIZE/);
});

test('detail navigation snapshots the current filtered order and survives table refreshes', () => {
  assert.match(navSource, /snapshotItems/);
  assert.match(navSource, /state\.snapshotItems\s*=\s*visibleItems\(\)/);
  assert.match(navSource, /findLiveTrigger/);
  const items = [{ key: '1:a' }, { key: '2:b' }, { key: '3:c' }];
  assert.equal(nav.findNeighbor(items, '2:b', -1)?.key, '1:a');
  assert.equal(nav.findNeighbor(items, '2:b', 1)?.key, '3:c');
});

test('detail fast path posts rendered application text and preserves attachment photo', () => {
  assert.match(navSource, /applicationComment/);
  assert.match(navSource, /method:\s*['"]POST['"]/);
  assert.match(navSource, /commentDetails/);
  assert.match(navSource, /photoUrl/);
  assert.match(commentsSource, /normalizePhotoUrl/);
  assert.match(commentsSource, /photoUrl/);
  assert.match(detailSource, /rawFromRequest/);
  assert.match(detailSource, /bodyValue\(req, ['"]photoUrl['"]\)/);
});

test('fast detail body is accepted only when identifiers match', () => {
  const good = detailApi._test.rawFromRequest({ body: {
    commentNo: '120082195', userId: 'dein88', userNick: '데로DeRo',
    applicationComment: '데로DeRo [치지직] / 373명', photoUrl: 'https://example.com/photo.png'
  } }, '120082195', 'dein88');
  assert.equal(good?.comment, '데로DeRo [치지직] / 373명');
  assert.equal(good?.photo, 'https://example.com/photo.png');
  assert.equal(detailApi._test.rawFromRequest({ body: {
    commentNo: '999', userId: 'dein88', applicationComment: 'wrong'
  } }, '120082195', 'dein88'), null);
});
