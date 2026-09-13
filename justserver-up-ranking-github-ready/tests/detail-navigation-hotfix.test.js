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

test('navigation controls live in a normal-flow row before the detail grid', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'applicant-detail-navigation-hotfix.js'), 'utf8');
  assert.match(source, /\.detail-nav-row\{display:flex/);
  assert.match(source, /\.detail-nav\{position:static/);
  assert.match(source, /content\.insertBefore\(row,\s*grid\)/);
  assert.doesNotMatch(source, /\.detail-nav\{position:absolute/);
});

test('hidden rows are excluded from previous and next navigation', () => {
  assert.ok(navigation, 'navigation hotfix module must exist');
  assert.equal(typeof navigation.isVisibleRow, 'function');
  const visible = { hidden: false, ownerDocument: { defaultView: { getComputedStyle: () => ({ display: 'table-row', visibility: 'visible' }) } } };
  const displayNone = { hidden: false, ownerDocument: { defaultView: { getComputedStyle: () => ({ display: 'none', visibility: 'visible' }) } } };
  const hiddenAttr = { hidden: true, ownerDocument: { defaultView: { getComputedStyle: () => ({ display: 'table-row', visibility: 'visible' }) } } };
  assert.equal(navigation.isVisibleRow(visible), true);
  assert.equal(navigation.isVisibleRow(displayNone), false);
  assert.equal(navigation.isVisibleRow(hiddenAttr), false);
  const source = fs.readFileSync(path.join(__dirname, '..', 'applicant-detail-navigation-hotfix.js'), 'utf8');
  assert.match(source, /if \(!api\.isVisibleRow\(row\)\) return;/);
});
