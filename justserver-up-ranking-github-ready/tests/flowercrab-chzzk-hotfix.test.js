const test = require('node:test');
const assert = require('node:assert/strict');
const hotfix = require('../flowercrab-chzzk-hotfix.js');

test('KimCookie replaces mistaken rorobi mapping', () => {
  const kim = hotfix.getVerifiedApplicant({ userId: 'diemzleod' });
  assert.ok(kim);
  assert.equal(kim.channelId, 'f8f9c0d0029b58c79eb6070ff501cac1');
  assert.equal(hotfix.isVerifiedApplicant({ userId: 'rorobi' }), false);
  const detail = hotfix.decorateDetailPayload({ ok: true, userId: 'diemzleod' });
  assert.equal(detail.chzzkStationUrl, 'https://chzzk.naver.com/f8f9c0d0029b58c79eb6070ff501cac1');
});

test('existing verified mappings remain intact', () => {
  assert.equal(hotfix.getVerifiedApplicant({ userId: 'flowercrab12' }).channelId, '43e3c57feed0478ff9812109a40f9fe8');
  assert.equal(hotfix.getVerifiedApplicant({ userId: 'changdudn50' }).channelId, '4b2477f3cf709125fa17ece64ad66ffc');
  assert.equal(hotfix.getVerifiedApplicant({ userId: 'jemin18' }).channelId, 'e997149e0941aabdefdbaec44ed04a3e');
});
