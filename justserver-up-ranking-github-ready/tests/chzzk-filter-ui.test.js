const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const utils = require('../ranking-utils');

test('classifies comments containing 치지직 or 옆동네 as Chzzk applicants', () => {
  assert.equal(typeof utils.isChzzkApplicant, 'function');
  assert.equal(utils.isChzzkApplicant({ comment: '치지직에서 방송하고 있습니다' }), true);
  assert.equal(utils.isChzzkApplicant({ comment: '옆동네에서 넘어왔어요' }), true);
  assert.equal(utils.isChzzkApplicant({ comment: 'SOOP에서만 방송합니다' }), false);
  assert.equal(utils.isChzzkApplicant({ comment: '' }), false);
});

test('counts unique Chzzk applicants without double-counting the same user', () => {
  assert.equal(typeof utils.countChzzkApplicants, 'function');
  const comments = [
    { userId: 'alpha', commentNo: '1', comment: '치지직 방송 중입니다' },
    { userId: 'alpha', commentNo: '2', comment: '옆동네도 합니다' },
    { userId: 'beta', commentNo: '3', comment: '옆동네 스트리머입니다' },
    { userId: 'gamma', commentNo: '4', comment: '그냥서버 신청합니다' }
  ];
  assert.equal(utils.countChzzkApplicants(comments), 2);
});

test('index exposes a Chzzk count card and Chzzk-only filter button', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert.match(source, /id="chzzkCount"/);
  assert.match(source, />치지직 신청자</);
  assert.match(source, /id="chzzkFilterBtn"/);
  assert.match(source, />치지직</);
  assert.match(source, /chzzkOnly/);
  assert.match(source, /isChzzkApplicant/);
  assert.match(source, /countChzzkApplicants/);
});
