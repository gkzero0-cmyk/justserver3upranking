const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const column = require(path.join('..', 'applicant-follower-column.js'));
const comments = require(path.join('..', 'api', 'comments.js'));

test('follower DOM render can be skipped when visible values are unchanged', () => {
  const lines = column.buildFollowerLines({ soopCount: 100, isChzzk: true, chzzkCount: 200, chzzkStatus: 'ready' });
  const signature = column.followerLinesSignature(lines);
  assert.equal(column.needsFollowerRender(signature, lines), false);
  assert.equal(column.needsFollowerRender('', lines), true);
});

test('follower observer only watches tbody row replacement, not descendant writes', () => {
  assert.deepEqual(column.TBODY_OBSERVER_OPTIONS, { childList: true });
});

test('comments API classifies stale snapshots for stale-while-revalidate', () => {
  assert.ok(comments.STALE_MS > comments.CACHE_MS);
  assert.equal(comments.cacheMode(0, 1000), 'miss');
  assert.equal(comments.cacheMode(900, 1000), 'fresh');
  assert.equal(comments.cacheMode(1, comments.CACHE_MS + 10), 'stale');
  assert.equal(comments.cacheMode(1, comments.STALE_MS + 10), 'expired');
});
