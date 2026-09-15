const test = require('node:test');
const assert = require('node:assert/strict');
const hotfix = require('../applicant-position-hotfix.js');

test('numbers only visible applicants in current DOM order', () => {
  const items = [
    { key: 'a', visible: true },
    { key: 'b', visible: false },
    { key: 'c', visible: true },
  ];
  assert.deepEqual([...hotfix.computeVisiblePositions(items).entries()], [['a', 1], ['c', 2]]);
});

test('reversed current order receives reversed display numbering', () => {
  const items = [
    { key: 'c', visible: true },
    { key: 'b', visible: true },
    { key: 'a', visible: true },
  ];
  assert.deepEqual([...hotfix.computeVisiblePositions(items).entries()], [['c', 1], ['b', 2], ['a', 3]]);
});

test('UP rank stays independent from display order', () => {
  assert.equal(hotfix.normalizeUpRank('57'), 57);
  assert.equal(hotfix.formatUpRank(57), 'UP 57위');
  assert.equal(hotfix.formatDisplayOrder(1), '1.');
});

test('column labels place UP rank between comment and UP', () => {
  assert.deepEqual(hotfix.COLUMN_LABELS, ['순위', '신청자', '즐겨찾기', '댓글', 'UP 순위', 'UP', '작성일', '바로가기']);
});
