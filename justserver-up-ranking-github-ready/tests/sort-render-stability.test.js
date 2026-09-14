const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');

function source(name) {
  return fs.readFileSync(path.join(root, name), 'utf8');
}

test('automatic tbody renders synchronously reapply the selected sort without a competing sorter', () => {
  const loader = source('ranking-utils.js');
  const sort = source('sort-toggle-hotfix.js');

  assert.doesNotMatch(loader, /soop-follower-sort\.js/);
  assert.match(sort, /Object\.defineProperty\(tbody, 'innerHTML'/);
  assert.match(sort, /descriptor\.set\.call\(this, value\);\s*applySort\(\);/s);
  assert.match(sort, /__justserverSoopFavoriteCounts/);
  assert.match(sort, /justserver:soop-favorite-counts/);
  assert.doesNotMatch(sort, /new win\.MutationObserver\(scheduleSort\)/);
});

test('SOOP count publisher exposes one merged snapshot for stable render-time sorting', () => {
  const followers = source('applicant-follower-column.js');
  assert.match(followers, /__justserverSoopFavoriteCounts/);
  assert.match(followers, /dispatchEvent\(/);
  assert.match(followers, /justserver:soop-favorite-counts/);
});
