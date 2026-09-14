const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  sortApplicants,
  nextSortState,
  DEFAULT_DIRECTIONS
} = require('../sort-toggle-hotfix.js');
const { collectChzzkSoopUserIds } = require('../chzzk-soop-count-hotfix.js');

test('UP, newest, and SOOP follower sorting support reverse direction while missing follower counts stay last', () => {
  const items = [
    { userId: 'a', rank: 1, up: 500, regDate: '2026-09-15 01:00:00' },
    { userId: 'b', rank: 2, up: 400, regDate: '2026-09-15 03:00:00' },
    { userId: 'c', rank: 3, up: 300, regDate: '2026-09-15 02:00:00' }
  ];
  const counts = { a: 120, b: 900, c: null };
  assert.deepEqual(sortApplicants(items, 'up', 'desc', counts).map(x => x.userId), ['a', 'b', 'c']);
  assert.deepEqual(sortApplicants(items, 'up', 'asc', counts).map(x => x.userId), ['c', 'b', 'a']);
  assert.deepEqual(sortApplicants(items, 'newest', 'desc', counts).map(x => x.userId), ['b', 'c', 'a']);
  assert.deepEqual(sortApplicants(items, 'newest', 'asc', counts).map(x => x.userId), ['a', 'c', 'b']);
  assert.deepEqual(sortApplicants(items, 'followers', 'desc', counts).map(x => x.userId), ['b', 'a', 'c']);
  assert.deepEqual(sortApplicants(items, 'followers', 'asc', counts).map(x => x.userId), ['a', 'b', 'c']);
});

test('clicking the active sort toggles direction and switching modes resets to that mode default', () => {
  assert.equal(DEFAULT_DIRECTIONS.up, 'desc');
  assert.deepEqual(nextSortState({ mode: 'up', direction: 'desc' }, 'up'), { mode: 'up', direction: 'asc' });
  assert.deepEqual(nextSortState({ mode: 'up', direction: 'asc' }, 'newest'), { mode: 'newest', direction: 'desc' });
  assert.deepEqual(nextSortState({ mode: 'newest', direction: 'desc' }, 'newest'), { mode: 'newest', direction: 'asc' });
});

test('CHZZK applicants are included in SOOP count lookups, deduped by SOOP user id', () => {
  const comments = [
    { userId: 'dein88', comment: '치지직 신청' },
    { userId: 'dein88', comment: '치지직 신청 수정' },
    { userId: 'pinkmold0317', comment: '옆동네 신청' },
    { userId: 'sooponly', comment: 'SOOP 100' }
  ];
  const isChzzkApplicant = item => /치지직|옆동네/.test(item.comment || '');
  assert.deepEqual(collectChzzkSoopUserIds(comments, isChzzkApplicant), ['dein88', 'pinkmold0317']);
});

test('browser integration removes 오래된순, loads all sort modes, and requests SOOP counts for CHZZK applicants', () => {
  const sortSource = fs.readFileSync(path.join(__dirname, '..', 'sort-toggle-hotfix.js'), 'utf8');
  const countSource = fs.readFileSync(path.join(__dirname, '..', 'chzzk-soop-count-hotfix.js'), 'utf8');
  const loader = fs.readFileSync(path.join(__dirname, '..', 'ranking-utils.js'), 'utf8');
  assert.match(sortSource, /data-sort="oldest"/);
  assert.match(sortSource, /\.remove\(\)/);
  assert.match(sortSource, /UP순/);
  assert.match(sortSource, /최신순/);
  assert.match(sortSource, /즐겨찾기순/);
  assert.match(countSource, /\/api\/soop-favorite-counts/);
  assert.match(countSource, /justserver:soop-favorite-counts/);
  assert.ok(loader.indexOf('sort-toggle-hotfix.js') > loader.indexOf('soop-follower-sort.js'));
  assert.ok(loader.indexOf('chzzk-soop-count-hotfix.js') > loader.indexOf('sort-toggle-hotfix.js'));
});
