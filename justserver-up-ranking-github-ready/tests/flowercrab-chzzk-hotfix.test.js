const test = require('node:test');
const assert = require('node:assert/strict');
const hotfix = require('../flowercrab-chzzk-hotfix.js');

const EXPECTED = new Map([
  ['ruchar0526', 'ca3c2250f11c54ce8ba30fce2da7d837'],
  ['luiliuli', '98d01e25e79820a55d261f3baf19f2eb'],
  ['rians2', '2737bfddb6120be9faafc4402678bb42'],
  ['changhyon50', '4b2477f3cf709125fa17ece64ad66ffc'],
  ['duckchip123', '1d694389462927382fbd3b9239792729'],
  ['ppokbun', '15558be4cb5d45e6f6c0d2ee9967b8b4'],
  ['jemin18', 'e997149e0941aabdefdbaec44ed04a3e'],
  ['diana1207', 'e3b1c8a6af2882052ceda4b225a422c0'],
  ['flowercrab12', '43e3c57feed0478ff9812109a40f9fe8'],
  ['diemzleod', 'f8f9c0d0029b58c79eb6070ff501cac1']
]);

test('maps the approved 10 applicants to their exact CHZZK channels', () => {
  for (const [userId, channelId] of EXPECTED) {
    const applicant = hotfix.getVerifiedApplicant({ userId });
    assert.ok(applicant, userId);
    assert.equal(applicant.channelId, channelId, userId);
    assert.equal(applicant.channelUrl, `https://chzzk.naver.com/${channelId}`, userId);
    assert.equal(hotfix.isVerifiedApplicant({ userId }), true, userId);
    const detail = hotfix.decorateDetailPayload({ ok: true, userId });
    assert.equal(detail.chzzkStationUrl, `https://chzzk.naver.com/${channelId}`, userId);
  }
});

test('corrects the applicant id for 자유2025 and keeps the KimCookie correction', () => {
  assert.equal(hotfix.isVerifiedApplicant({ userId: 'changdudn50' }), false);
  assert.equal(hotfix.getVerifiedApplicant({ userId: 'changhyon50' }).channelId, '4b2477f3cf709125fa17ece64ad66ffc');
  assert.equal(hotfix.getVerifiedApplicant({ userId: 'diemzleod' }).channelId, 'f8f9c0d0029b58c79eb6070ff501cac1');
  assert.equal(hotfix.isVerifiedApplicant({ userId: 'rorobi' }), false);
});
