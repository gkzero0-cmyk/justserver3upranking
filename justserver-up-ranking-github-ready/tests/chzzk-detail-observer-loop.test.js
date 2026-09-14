const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const modulePath = path.join(__dirname, '..', 'chzzk-detail-stats-hotfix.js');
const source = fs.readFileSync(modulePath, 'utf8');
const api = require(modulePath);

test('detail text updates are idempotent', () => {
  assert.equal(typeof api.setTextIfChanged, 'function');
  let value = '';
  let writes = 0;
  const node = {
    get textContent() { return value; },
    set textContent(next) { writes += 1; value = next; }
  };

  assert.equal(api.setTextIfChanged(node, '1,255'), true);
  assert.equal(api.setTextIfChanged(node, '1,255'), false);
  assert.equal(writes, 1);
});

test('CHZZK detail observer cannot retrigger itself forever', () => {
  assert.doesNotMatch(source, /right\.innerHTML\s*=/, 'rebuilding the CHZZK stat subtree on every observer pass causes an endless mutation loop');
  assert.doesNotMatch(source, /observer\.observe\(document\.documentElement/, 'observer must not watch every mutation on the whole page');
  assert.match(source, /getElementById\(['"]applicantDetailBody['"]\)/, 'observer should be scoped to the stable detail body');
});
