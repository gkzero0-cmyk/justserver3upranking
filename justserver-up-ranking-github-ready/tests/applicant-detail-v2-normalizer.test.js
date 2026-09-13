const test = require('node:test');
const assert = require('node:assert/strict');
const { repairStructuredDetail } = require('../applicant-detail-v2-normalizer.js');

test('repairs header-style application with trailing move-in fee label and preserves full URL', () => {
  const originalComment = [
    '너구리아 / 1,704명',
    '안녕하세요 ! 저번 그냥서버 2 참가는 못 했지만, 칼바람 전형으로 프리패스권 얻어 이번에 프리패스권 사용하겠슴다',
    '이번 기회에 도전해보고 싶어 신청합니다',
    'https://vod.sooplive.com/player/201207475',
    '프리패스권 영상입니다 감사함미다 !',
    '입주비 여부: 동의함다!'
  ].join('\n');

  const repaired = repairStructuredDetail({
    name: '너구리아',
    message: 'vod.sooplive.com / player',
    moveInFee: '정보 없음',
    originalComment
  });

  assert.equal(repaired.name, '너구리아');
  assert.equal(repaired.moveInFee, '동의함다!');
  assert.equal(repaired.message, [
    '안녕하세요 ! 저번 그냥서버 2 참가는 못 했지만, 칼바람 전형으로 프리패스권 얻어 이번에 프리패스권 사용하겠슴다',
    '이번 기회에 도전해보고 싶어 신청합니다',
    'https://vod.sooplive.com/player/201207475',
    '프리패스권 영상입니다 감사함미다 !'
  ].join('\n'));
});

test('leaves unrelated application formats unchanged', () => {
  const detail = { name: '테스트', message: '하고싶은말: 반갑습니다', moveInFee: '동의', originalComment: '하고싶은말: 반갑습니다\n입주비 동의 여부: 동의' };
  assert.deepEqual(repairStructuredDetail(detail), detail);
});
