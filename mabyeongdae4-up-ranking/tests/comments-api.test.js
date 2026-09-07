const test = require('node:test');
const assert = require('node:assert/strict');
const api = require('../api/comments');

test('API is configured for the 마병대 4 SOOP post', () => {
  assert.equal(api.CHANNEL_ID, 'devil0108');
  assert.equal(api.POST_ID, '206507027');
  assert.equal(api.POST_URL, 'https://www.sooplive.com/station/devil0108/post/206507027');
});

test('normalize maps common SOOP comment fields and preserves UP count', () => {
  const item = api.normalize({
    user_id: 'tester01',
    user_nick: '테스터',
    comment: '병사 신청합니다<br>잘 부탁드립니다',
    reg_date: '2026-09-08 06:30:00',
    p_comment_no: 555,
    up_cnt: 123
  });
  assert.deepEqual(item, {
    commentNo: '555',
    commentUrl: 'https://www.sooplive.com/station/devil0108/post/206507027#comment_noti555',
    userId: 'tester01',
    userNick: '테스터',
    comment: '병사 신청합니다\n잘 부탁드립니다',
    regDate: '2026-09-08 06:30:00',
    up: 123
  });
});

test('extractUp tolerates renamed nested recommend fields', () => {
  assert.equal(api.extractUp({ metrics: { recommend_count: '77' } }), 77);
});

test('buildCommentUrl falls back to the post when comment number is missing', () => {
  assert.equal(api.buildCommentUrl(''), api.POST_URL);
  assert.equal(api.buildCommentUrl('123'), `${api.POST_URL}#comment_noti123`);
});
