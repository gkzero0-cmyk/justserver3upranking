const test = require('node:test');
const assert = require('node:assert/strict');
const overrides = require('../applicant-detail-manual-overrides.js');
const chzzk = require('../flowercrab-chzzk-hotfix.js');

test('wlgodjssl detail name is fixed to 토다기', () => {
  const result = overrides.applyDetailOverride({
    ok: true,
    userId: 'wlgodjssl',
    name: '신청양식 : 토다기',
    message: '원본',
    moveInFee: '입주비동의'
  });
  assert.equal(result.name, '토다기');
  assert.equal(overrides.getOverride('wlgodjssl').name, '토다기');
});

test('wlgodjssl maps to the exact requested CHZZK channel', () => {
  const applicant = chzzk.getVerifiedApplicant({ userId: 'wlgodjssl' });
  assert.ok(applicant);
  assert.equal(applicant.channelName, '토다기');
  assert.equal(applicant.channelId, '7e18f0af4b6bdb8d8629a89ade81acba');
  assert.equal(applicant.channelUrl, 'https://chzzk.naver.com/7e18f0af4b6bdb8d8629a89ade81acba');
  assert.equal(chzzk.isVerifiedApplicant({ userId: 'wlgodjssl' }), true);

  const detail = chzzk.decorateDetailPayload({ ok: true, userId: 'wlgodjssl' });
  assert.equal(detail.chzzkStationUrl, 'https://chzzk.naver.com/7e18f0af4b6bdb8d8629a89ade81acba');
});
