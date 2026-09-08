const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const utils = require('../ranking-utils');

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

test('rank change history keeps the latest movement for 24 hours and resets on a new movement', () => {
  assert.equal(typeof utils.updateRankChangeHistory, 'function');
  const now = Date.parse('2026-09-09T04:07:00+09:00');
  const key = 'comment:101';

  const first = utils.updateRankChangeHistory(
    [{ commentNo: '101', rank: 5 }],
    new Map([[key, 8]]),
    new Map(),
    now,
    DAY
  );
  assert.deepEqual(first.get(key), {
    direction: 'up', from: 8, to: 5, delta: 3, changedAt: now
  });

  const unchanged = utils.updateRankChangeHistory(
    [{ commentNo: '101', rank: 5 }],
    new Map([[key, 5]]),
    first,
    now + 23 * HOUR,
    DAY
  );
  assert.deepEqual(unchanged.get(key), first.get(key));

  const changedAgain = utils.updateRankChangeHistory(
    [{ commentNo: '101', rank: 4 }],
    new Map([[key, 5]]),
    unchanged,
    now + 23 * HOUR,
    DAY
  );
  assert.deepEqual(changedAgain.get(key), {
    direction: 'up', from: 5, to: 4, delta: 1, changedAt: now + 23 * HOUR
  });

  const expired = utils.updateRankChangeHistory(
    [{ commentNo: '101', rank: 4 }],
    new Map([[key, 4]]),
    changedAgain,
    now + 47 * HOUR + 1,
    DAY
  );
  assert.equal(expired.has(key), false);
});

test('rank history storage helpers restore valid maps and ignore malformed data', () => {
  assert.equal(typeof utils.readRankMap, 'function');
  assert.equal(typeof utils.readRankChangeHistory, 'function');
  assert.equal(typeof utils.serializeMap, 'function');

  const rankMap = utils.readRankMap('[["comment:1",3],["comment:2",8]]');
  assert.equal(rankMap.get('comment:1'), 3);
  assert.equal(rankMap.get('comment:2'), 8);
  assert.equal(utils.readRankMap('{broken').size, 0);

  const now = 2_000_000;
  const rawHistory = JSON.stringify([
    ['comment:1', { direction: 'down', from: 2, to: 4, delta: 2, changedAt: now - 1000 }],
    ['comment:old', { direction: 'up', from: 9, to: 3, delta: 6, changedAt: now - DAY - 1 }]
  ]);
  const history = utils.readRankChangeHistory(rawHistory, now, DAY);
  assert.equal(history.has('comment:1'), true);
  assert.equal(history.has('comment:old'), false);
  assert.equal(utils.serializeMap(rankMap), '[["comment:1",3],["comment:2",8]]');
});

test('index renders comments collapsed to one line with a persistent more/less toggle', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert.match(html, /comment-text collapsed/);
  assert.match(html, /comment-toggle/);
  assert.match(html, /더보기/);
  assert.match(html, /접기/);
  assert.match(html, /expandedCommentKeys/);
  assert.match(html, /text-overflow:ellipsis/);
  assert.match(html, /white-space:nowrap/);
});

test('index persists rank snapshots and movement history in localStorage', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert.match(html, /RANK_SNAPSHOT_KEY/);
  assert.match(html, /RANK_HISTORY_KEY/);
  assert.match(html, /updateRankChangeHistory/);
  assert.match(html, /serializeMap/);
});
