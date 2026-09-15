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
  assert.equal(overrides.getOverride('mat981').name, '갱소리');
  assert.equal(overrides.getOverride('naranggu99').name, '사일');
  assert.equal(overrides.getOverride('jyd0808').name, '놈삐');
  assert.equal(overrides.getOverride('wlgodjssl').name, '토다기');
  assert.equal(overrides.getOverride('nunknown314').name, '미현영♡');
});

test('overrides nunknown314 display name exactly', () => {
  const result = overrides.applyDetailOverride(payload('nunknown314', { name: '신청양식 : 미현영♡' }));
  assert.equal(result.name, '미현영♡');
  assert.equal(result.message, '원본 메시지');
  assert.equal(result.moveInFee, '원본 동의');
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

test('overrides 무해_ name, requested message and move-in fee exactly', () => {
  const result = overrides.applyDetailOverride(payload('nmoohae1205'));
  assert.equal(result.name, '무해_');
  assert.equal(result.message, '마크 간절하고간절하게 너무너무너무하고싶습니다!!!!!!! 즐찾수도 ㅠㅠ 너무감사드립니다 충분히 높게받으실수도이쓴데 이런 기회주셔서 너무감사드립니다!!!! 복 많이 받으세요!!!');
  assert.equal(result.moveInFee, '입주비 동의합니다!');
});

test('overrides leesanggo message and move-in fee without changing the name', () => {
  const result = overrides.applyDetailOverride(payload('leesanggo', { name: '이쌍도' }));
  assert.equal(result.name, '이쌍도');
  assert.equal(result.message, '휴가 와있는데 물ㄹ속에서 방수팩으로 급ㅂ하게 쓰고 있습니다ㅏ 이번에도 컨텐츠 ㅇ열어주심에 감사하며 잘 즐겨보겠습니다!!🔥');
  assert.equal(result.moveInFee, '입주비 동의!!');
});

test('overrides rkqheks1 message and move-in fee without changing the name', () => {
  const result = overrides.applyDetailOverride(payload('rkqheks1', { name: '뉴걸' }));
  assert.equal(result.name, '뉴걸');
  assert.equal(result.message, '안녕하세요!!! 그냥서버를 꼭 즐겨보고싶은 뉴걸입니다 ㅜㅜ 저번에는 아쉽게도 못 들어갔었는데 이번엔 꼭꼭 들어가서 빚갚아보고싶어요...🤍');
  assert.equal(result.moveInFee, '입주비 동의합니다!!');
});

test('overrides rlarlgus94 message and move-in fee without changing the name', () => {
  const result = overrides.applyDetailOverride(payload('rlarlgus94', { name: '냥쿠미' }));
  assert.equal(result.name, '냥쿠미');
  assert.equal(result.message, '안녕하십니까. 그냥서버2 최장접속자 냥쿠미임미다..!!!! 이번에도 질펀하게 즐기겠읍니다!! 졸업 딱 대!');
  assert.equal(result.moveInFee, '입주비 동의');
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
