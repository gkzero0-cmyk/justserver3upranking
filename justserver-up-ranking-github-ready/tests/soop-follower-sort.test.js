const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { sortBySoopFollowers } = require('../soop-follower-sort.js');

test('sorts known SOOP follower counts high to low, missing last, then preserves UP rank', () => {
  const items = [
    { userId: 'a', rank: 1, up: 100 },
    { userId: 'b', rank: 2, up: 90 },
    { userId: 'c', rank: 3, up: 80 },
    { userId: 'd', rank: 4, up: 70 }
  ];
  const counts = { a: 120, b: 900, c: null, d: 120 };
  assert.deepEqual(sortBySoopFollowers(items, counts).map(x => x.userId), ['b', 'a', 'd', 'c']);
});

test('loads follower sorting after the follower column so the button exists before main page handlers bind', () => {
  const loader = fs.readFileSync(path.join(__dirname, '..', 'ranking-utils.js'), 'utf8');
  const followerWrite = loader.indexOf('document.write(`<script src="${followerColumnUrl}');
  const sortWrite = loader.indexOf('document.write(`<script src="${followerSortUrl}');
  assert.ok(followerWrite >= 0);
  assert.ok(sortWrite > followerWrite);
});
