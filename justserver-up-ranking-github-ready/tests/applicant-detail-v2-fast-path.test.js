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
