const test = require('node:test');
const assert = require('node:assert/strict');
const fix = require('../live-soop-filter-fix.js');

const utils = {
  favoriteKey(item) { return `comment:${item.commentNo}`; },
  isLowSoopFavoriteApplicant(item, limit = 500) {
    const match = String(item.comment || '').match(/([0-9][0-9,]*)/);
    if (!match) return false;
    return Number(match[1].replace(/,/g, '')) <= limit;
  }
};

test('current SOOP count overrides a low application-declared count', () => {
  const comments = [
    { userId: 'uchi5757', commentNo: '1', comment: '우치! / 388명 / 신청' },
    { userId: 'pgf1234', commentNo: '2', comment: '오늘님 / 1 / 신청' },
    { userId: 'stilllow', commentNo: '3', comment: '낮은사람 / 420명 / 신청' }
  ];
  const result = fix.resolveVerifiedLowSoopApplicants(
    comments,
    { uchi5757: 859, pgf1234: 17593, stilllow: 480 },
    500,
    utils
  );
  assert.deepEqual(result.users, ['stilllow']);
  assert.deepEqual(result.keys, ['comment:3']);
});

test('unresolved current SOOP count is excluded instead of falling back to application count', () => {
  const comments = [{ userId: 'unknown', commentNo: '9', comment: '신청자 / 300명 / 신청' }];
  const result = fix.resolveVerifiedLowSoopApplicants(comments, { unknown: null }, 500, utils);
  assert.deepEqual(result.users, []);
  assert.deepEqual(result.keys, []);
});

test('count conversion does not treat null as zero', () => {
  assert.equal(fix.toCount(null), null);
  assert.equal(fix.toCount(undefined), null);
  assert.equal(fix.toCount(''), null);
  assert.equal(fix.toCount('480'), 480);
});
