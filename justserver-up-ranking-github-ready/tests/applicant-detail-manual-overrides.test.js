const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const overrides = require('../applicant-detail-manual-overrides.js');

function payload(userId, extra = {}) {
  return { ok: true, userId, name: '원본', message: '원본 메시지', moveInFee: '원본 동의', ...extra };
}

test('keeps approved manual display-name overrides', () => {
  assert.equal(overrides.getOverride('gus9107').name, '유다한');
  assert.equal(overrides.getOverride('whdgns2569').name, '월야령');
  assert.equal(overrides.getOverride('dd0705').name, '디또띠');
});

test('overrides 종겜추 name and requested message only', () => {
  const result = overrides.applyDetailOverride(payload('fldkaldhs123'));
  assert.equal(result.name, '종겜추');
  assert.equal(result.message, '전설로만 내려오던 그냥서버를 제 두 눈으로 보게 될 줄은 정말 몰랐습니다\n마크서버 한 번도 안 해봤는데 좋은 기회에 꼭 한 번 해보고 싶습니다!!\n이 한 몸 불태워서 그냥서버에서 회광반조 하겠습니다!');
  assert.equal(result.moveInFee, '원본 동의');
});

test('overrides 나린인데? name, message and move-in fee exactly', () => {
  const result = overrides.applyDetailOverride(payload('rintube'));
  assert.equal(result.name, '나린인데?');
  assert.equal(result.message, '춘봉님 그냥서버!!!!!!!!!!!! 꼭 하고시퍼요!!!!!!!!!!!!!!!');
  assert.equal(result.moveInFee, '동의합니다.');
});

test('does not alter unrelated applicants', () => {
  const original = payload('someone_else');
  assert.equal(overrides.applyDetailOverride(original), original);
});

test('loader includes manual override hotfix after the v2 client', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'ranking-utils.js'), 'utf8');
  const v2 = source.indexOf('detailV2ClientUrl');
  const manual = source.indexOf('detailManualOverridesUrl');
  assert.ok(v2 >= 0 && manual > v2);
  assert.match(source, /applicant-detail-manual-overrides\.js/);
});
