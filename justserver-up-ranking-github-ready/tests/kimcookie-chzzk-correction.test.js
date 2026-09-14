const test = require('node:test');
const assert = require('node:assert/strict');
const hotfix = require('../flowercrab-chzzk-hotfix.js');

test('assigns the f8f9 CHZZK channel to diemzleod instead of rorobi', () => {
  assert.equal(hotfix.isVerifiedApplicant({ userId: 'rorobi' }), false);
  assert.equal(hotfix.isVerifiedApplicant({ userId: 'diemzleod' }), true);

  const verified = hotfix.getVerifiedApplicant({ userId: 'diemzleod' });
  assert.equal(verified.channelName, '김쿠키');
  assert.equal(verified.channelId, 'f8f9c0d0029b58c79eb6070ff501cac1');
  assert.equal(verified.channelUrl, 'https://chzzk.naver.com/f8f9c0d0029b58c79eb6070ff501cac1');

  const detail = hotfix.decorateDetailPayload({ ok: true, userId: 'diemzleod', name: '김쿠키' });
  assert.equal(detail.chzzkStationUrl, verified.channelUrl);
});
