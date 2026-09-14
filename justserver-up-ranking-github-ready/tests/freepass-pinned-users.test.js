const test = require('node:test');
const assert = require('node:assert/strict');
const {
  PINNED_FREEPASS_USER_IDS,
  isPinnedFreepassUser,
  collectFreepassKeys
} = require('../freepass-filter.js');

const pinned = [
  'chunbongtv', 'msjw0918', 'sohasoha', 'hayodayong', 'sudal0923', 'xxxkimmickey', 'yuchya',
  'saturn0106', 'peachbox', 'rakuni', 'ruringruming', 'dup130', 'mihui96', 'heb4960'
];

test('marks the approved 14 SOOP IDs as pinned freepass users', () => {
  assert.equal(PINNED_FREEPASS_USER_IDS.size, 14);
  for (const id of pinned) assert.equal(isPinnedFreepassUser(id), true, id);
  assert.equal(isPinnedFreepassUser('outsider123'), false);
  assert.equal(isPinnedFreepassUser('CHUNBONGTV'), true);
});

test('includes pinned users only when they are actual applicants and preserves comment-based freepass', () => {
  const comments = [
    { commentNo: '1', userId: 'chunbongtv', comment: '일반 신청합니다' },
    { commentNo: '2', userId: 'outsider', comment: '프리패스권 사용합니다' },
    { commentNo: '3', userId: 'notfree', comment: '일반 신청입니다' }
  ];
  const keys = collectFreepassKeys(comments);
  assert.deepEqual([...keys].sort(), ['1:chunbongtv', '2:outsider']);
  assert.equal([...keys].some(key => key.includes('msjw0918')), false);
});
