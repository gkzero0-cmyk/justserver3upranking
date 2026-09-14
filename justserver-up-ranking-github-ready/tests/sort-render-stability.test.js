const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');

function source(name) {
  return fs.readFileSync(path.join(root, name), 'utf8');
}

test('main render owns sort order instead of async DOM re-sorting', () => {
  const index = source('index.html');
  const loader = source('ranking-utils.js');
  const sort = source('sort-toggle-hotfix.js');

  assert.match(index, /SortToggleHotfix\.sortApplicants/);
  assert.match(index, /nextSortState/);
  assert.match(index, /__justserverSoopFavoriteCounts/);
  assert.match(index, /justserver:soop-favorite-counts/);
  assert.doesNotMatch(loader, /soop-follower-sort\.js/);
  assert.doesNotMatch(sort, /tbody\.insertBefore\(row/);
});

test('SOOP count publisher exposes one merged snapshot for stable render-time sorting', () => {
  const followers = source('applicant-follower-column.js');
  assert.match(followers, /__justserverSoopFavoriteCounts/);
  assert.match(followers, /dispatchEvent\(/);
  assert.match(followers, /justserver:soop-favorite-counts/);
});
