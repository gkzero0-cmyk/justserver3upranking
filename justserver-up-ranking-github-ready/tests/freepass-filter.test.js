const test = require('node:test');
const assert = require('node:assert/strict');
const { isFreepassUseComment, freepassKey } = require('../freepass-filter.js');

test('classifies explicit first-person freepass usage phrases', () => {
  const yes = [
    '프리패스권 사용합니다!',
    '프리패스권 사용하겠습니다',
    '프리패스 사용할게요',
    '저 프리패스권 씁니다',
    '프리패스권 쓸게요',
    '입주비 동의합니다. 프리패스권 사용합니다.'
  ];
  for (const text of yes) assert.equal(isFreepassUseComment(text), true, text);
});

test('classifies usage when punctuation, emoji or application wording separates the phrase', () => {
  const yes = [
    '프리패스권 : 사용합니다!',
    '프리패스권💜 사용하겠습니다',
    '프리패스권 / 사용할게요',
    '프리패스권 - 쓰겠습니다',
    '프리패스로 신청합니다',
    '입주비 동의 / 프리패스권✨사용할 예정입니다'
  ];
  for (const text of yes) assert.equal(isFreepassUseComment(text), true, text);
});

test('classifies current production freepass application variants', () => {
  const yes = [
    '도람지 / 702명 / 입주비 동의\n안녕하세요 ! 그냥서버 2 숨바꼭질에서 춘봉님을 일빠따로 찾아내어 프리패스권을 얻어낸 !!!! 도람지 입니댜 !!!!!\n프리패스권 사용 가능할까용 ? ㅎㅎㅎㅎㅎㅎㅎㅎㅎ',
    '너구리아 / 1,704명\n칼바람 전형으로 프리패스권 얻어 이번에 프리패스권 사용하겠슴다',
    '이새루 / 445 / 빚도 자산이죠! 입주조건 안돼도 신청띠띠 / 입주비 동의!!!\n\n🦁사장님 프리패스권🦁',
    '지앙._. / 2,839명 / 진짜 이날만을 기다렸습니다 프리패스권!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! 당장 사용!!!!!!!!!!!!!!!!!!!!!!!!!!! / 입주비 동의합니다',
    '프리패스 사용 가능한가요?'
  ];
  for (const text of yes) assert.equal(isFreepassUseComment(text), true, text);
});

test('does not classify negation, exclusion, ownership-only, or third-person mentions', () => {
  const no = [
    '프리패스 사용 안 합니다',
    '프리패스권은 사용하지 않겠습니다',
    '프리패스 없이 신청합니다',
    '프리패스 제외 부탁드립니다',
    '프리패스가 있으면 좋겠네요',
    '친구가 프리패스 사용한다고 했습니다',
    '프리패스권 보유중',
    '프리패스권 사용 여부 문의드립니다',
    '프리패스권 있나요?'
  ];
  for (const text of no) assert.equal(isFreepassUseComment(text), false, text);
});

test('normalizes html and whitespace around freepass phrases', () => {
  assert.equal(isFreepassUseComment('프리패스권<br>사용 할게요'), true);
  assert.equal(isFreepassUseComment('  프리패스  권   쓰겠습니다  '), true);
});

test('builds a stable applicant key', () => {
  assert.equal(freepassKey({ commentNo: '120', userId: 'ABC' }), '120:abc');
});
