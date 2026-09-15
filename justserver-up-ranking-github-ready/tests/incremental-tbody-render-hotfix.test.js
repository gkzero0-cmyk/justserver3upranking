const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const hotfix = require(path.join('..', 'incremental-tbody-render-hotfix.js'));

test('stable row keys normalize user ids and keep comment ids', () => {
  assert.equal(hotfix.detailKey('119', 'UserABC'), '119:userabc');
  assert.equal(hotfix.detailKey('', 'UserABC'), ':userabc');
});

test('diffBaseCells reports only base cells whose signatures changed', () => {
  const before = { rank: '1', user: 'same', comment: 'same', up: '10', time: 'same', link: 'same' };
  const after = { rank: '1', user: 'same', comment: 'same', up: '11', time: 'same', link: 'same' };
  assert.deepEqual(hotfix.diffBaseCells(before, after), ['up']);
});

test('same assigned HTML can be skipped without touching DOM', () => {
  assert.equal(hotfix.shouldSkipAssignment('<tr>A</tr>', '<tr>A</tr>'), true);
  assert.equal(hotfix.shouldSkipAssignment('<tr>A</tr>', '<tr>B</tr>'), false);
});

test('loader installs incremental renderer before follower and position hotfixes', () => {
  const loader = fs.readFileSync(path.join(__dirname, '..', 'ranking-utils.js'), 'utf8');
  const incremental = loader.indexOf('incremental-tbody-render-hotfix.js');
  const follower = loader.indexOf('applicant-follower-column.js');
  const position = loader.indexOf('applicant-position-hotfix.js');
  assert.ok(incremental >= 0);
  assert.ok(incremental < follower);
  assert.ok(incremental < position);
});
