const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const utils = require('../ranking-utils.js');

const source = fs.readFileSync(path.join(__dirname, '..', 'ranking-utils.js'), 'utf8');

test('extracts declared SOOP favorite counts without using Chzzk counts', () => {
  assert.equal(utils.extractSoopFavoriteCount({ comment: '박재박 / 440명 / 참여하고 싶어요 / 입주비 동의' }), 440);
  assert.equal(utils.extractSoopFavoriteCount({ comment: 'SOOP 71명 / 치지직 932명 / 꼭 참여하고 싶습니다' }), 71);
  assert.equal(utils.extractSoopFavoriteCount({ comment: '치지직 300명 / 옆동네에서 방송합니다' }), null);
  assert.equal(utils.extractSoopFavoriteCount({ comment: '즐겨찾기수 : 500명\n하고싶은말 : 참가하고 싶어요' }), 500);
  assert.equal(utils.extractSoopFavoriteCount({ comment: '즐겨찾기수 : 501명\n하고싶은말 : 참가하고 싶어요' }), 501);
});

test('classifies and counts SOOP applicants with 500 favorites or fewer', () => {
  assert.equal(utils.isLowSoopFavoriteApplicant({ comment: '닉 / 500명 / 말 / 동의' }), true);
  assert.equal(utils.isLowSoopFavoriteApplicant({ comment: '닉 / 501명 / 말 / 동의' }), false);
  assert.equal(utils.isLowSoopFavoriteApplicant({ comment: '치지직 300명' }), false);

  const comments = [
    { userId: 'a', commentNo: '1', comment: '닉A / 120명 / 말 / 동의' },
    { userId: 'a', commentNo: '2', comment: '닉A / 120명 / 다시 신청 / 동의' },
    { userId: 'b', commentNo: '3', comment: 'SOOP 500명 / 치지직 900명 / 말' },
    { userId: 'c', commentNo: '4', comment: '닉C / 501명 / 말 / 동의' },
    { userId: 'd', commentNo: '5', comment: '치지직 88명 / 옆동네 방송' }
  ];
  assert.equal(utils.countLowSoopFavoriteApplicants(comments), 2);
});

test('ranking utility installs the SOOP 500-or-less stat card and filter button', () => {
  assert.equal(typeof utils.installLowSoopFavoriteUi, 'function');
  assert.match(source, /lowSoopFavoriteCount/);
  assert.match(source, /SOOP 즐겨찾기 500 이하/);
  assert.match(source, /lowSoopFavoriteFilterBtn/);
  assert.match(source, /500 이하/);
  assert.match(source, /countLowSoopFavoriteApplicants/);
});

test('SOOP 500-or-less filter suppresses its own reset while turning off conflicting filters', () => {
  assert.match(source, /suppressLowFilterReset/);
  assert.match(source, /if \(suppressLowFilterReset \|\| !filterActive\) return;/);
});
