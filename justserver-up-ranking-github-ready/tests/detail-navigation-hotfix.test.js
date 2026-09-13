const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

let navigation;
try {
  navigation = require('../applicant-detail-navigation-hotfix.js');
} catch (error) {
  navigation = null;
}

const source = fs.readFileSync(path.join(__dirname, '..', 'applicant-detail-navigation-hotfix.js'), 'utf8');

test('moves to previous and next applicant in current visible order', () => {
  assert.ok(navigation, 'navigation hotfix module must exist');
  const items = [
    { key: '1:a', name: '사내.박재박' },
    { key: '2:b', name: '부르' },
    { key: '3:c', name: '하나나' },
    { key: '4:d', name: '사과몽' }
  ];
  assert.equal(navigation.findNeighbor(items, '3:c', -1)?.name, '부르');
  assert.equal(navigation.findNeighbor(items, '3:c', 1)?.name, '사과몽');
});

test('navigation stops at the edges of the currently filtered list', () => {
  assert.ok(navigation, 'navigation hotfix module must exist');
  const filtered = [
    { key: '2:b', name: '부르' },
    { key: '4:d', name: '사과몽' }
  ];
  assert.equal(navigation.findNeighbor(filtered, '2:b', -1), null);
  assert.equal(navigation.findNeighbor(filtered, '2:b', 1)?.name, '사과몽');
  assert.equal(navigation.findNeighbor(filtered, '4:d', 1), null);
});

test('detail navigation uses an in-flow row instead of overlaying modal content', () => {
  assert.match(source, /detail-nav-row/);
  assert.doesNotMatch(source, /\.detail-nav\s*\{[^}]*position:absolute/s);
  assert.match(source, /content\.insertBefore\(row, grid\)/);
  assert.match(source, /prev\.parentNode !== row/);
  assert.match(source, /next\.parentNode !== row/);
});
