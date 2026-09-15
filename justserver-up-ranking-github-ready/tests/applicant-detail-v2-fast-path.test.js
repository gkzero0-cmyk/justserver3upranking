const test = require('node:test');
const assert = require('node:assert/strict');
const client = require('../applicant-detail-v2-client.js');

test('uses cached /api/comments data to build a fast POST detail request including the attachment photo', () => {
  assert.equal(typeof client.createCommentCache, 'function');
  assert.equal(typeof client.rememberCommentPayload, 'function');
  assert.equal(typeof client.buildFastDetailInit, 'function');

  const cache = client.createCommentCache();
  client.rememberCommentPayload(cache, {
    ok: true,
    comments: [{
      commentNo: '121538683', userId: 'flowercrab12', userNick: '꽃게대장',
      comment: '꽃게대장/1,249명/신청합니다/입주비 동의',
      photoUrl: 'https://stimg.sooplive.co.kr/COMMENT/example.png'
    }]
  });

  const init = client.buildFastDetailInit(
    'https://justserver.local/api/applicant-detail?commentNo=121538683&userId=flowercrab12',
    { cache: 'no-store' }, cache
  );
  assert.equal(init.method, 'POST');
  assert.equal(init.cache, 'no-store');
  const body = JSON.parse(init.body);
  assert.deepEqual(body, {
    commentNo: '121538683',
    userId: 'flowercrab12',
    userNick: '꽃게대장',
    applicationComment: '꽃게대장/1,249명/신청합니다/입주비 동의',
    photoUrl: 'https://stimg.sooplive.co.kr/COMMENT/example.png'
  });
});

test('detail timeout rejects with a non-AbortError so the modal can replace its spinner with an error', async () => {
  assert.equal(typeof client.fetchDetailWithTimeout, 'function');
  await assert.rejects(
    client.fetchDetailWithTimeout(() => new Promise(() => {}), ['unused'], 5),
    error => error && error.name === 'DetailTimeoutError' && /시간이 초과/.test(error.message)
  );
});

test('sanitizes move-in fee to the first non-empty line for SOOP applicant detail', () => {
  const payload = {
    ok: true,
    name: '송시온',
    moveInFee: '매우 동의합니다!!\n안녕하세요!\n감사하게도 500명 안돼도 일단 신청은 해보라고 해주셔서 슬쩍 넣어봅니다.',
    originalComment: '송시온 즐찾 수 : 335\n입주비 동의 여부: 매우 동의합니다!!'
  };
  const sanitized = client.sanitizeDetailPayload(payload);
  assert.equal(sanitized.moveInFee, '매우 동의합니다!!');
});

test('fills Rozi message and move-in fee from the original multiline application comment', () => {
  const payload = {
    ok: true,
    name: '로지Rozi',
    message: '',
    moveInFee: '',
    originalComment: [
      '로지Rozi / 1078명',
      '춘봉런 퍼클 하려고 열심히 했었는데 이번에도 열심히 달려볼게요!!',
      '안녕하세요 그냥서버 신청 너무 받고싶어서 신청합니다',
      '저번 머니게임 신청을 늦게 받아서....',
      '입주비 동의 합니다'
    ].join('\n')
  };
  const sanitized = client.sanitizeDetailPayload(payload);
  assert.equal(
    sanitized.message,
    '로지Rozi / 1078명\n춘봉런 퍼클 하려고 열심히 했었는데 이번에도 열심히 달려볼게요!!'
  );
  assert.equal(sanitized.moveInFee, '입주비 동의 합니다');
});
