const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const livePath = path.join(__dirname, '..', 'live-soop-filter-fix.js');
const source = fs.readFileSync(livePath, 'utf8');

test('periodic SOOP refresh keeps the last verified snapshot visible', () => {
  assert.match(source, /const hadVerifiedSnapshot = dataReady && !loadError && liveFetchedAt > 0;/);
  assert.match(source, /if \(!hadVerifiedSnapshot\) \{\s*dataReady = false;\s*scheduleApply\(\);\s*\}/s);
});

test('a failed background refresh preserves the last verified count instead of clearing it', () => {
  assert.match(source, /if \(hadVerifiedSnapshot\) \{[\s\S]*liveFetchedAt = Date\.now\(\);[\s\S]*dataReady = true;[\s\S]*loadError = false;[\s\S]*scheduleApply\(\);[\s\S]*return;[\s\S]*\}/);
});

test('legacy comment-count and row-attribute rewrites are repaired before the next paint', () => {
  assert.match(source, /function repairAuthoritativeUi\(\)/);
  assert.match(source, /new win\.MutationObserver\(repairAuthoritativeUi\)\.observe\(countNode/);
  assert.match(source, /attributeFilter:\s*\['data-low-soop'\]/);
  assert.match(source, /if \(row\.getAttribute\('data-low-soop'\) !== lowValue\) row\.setAttribute\('data-low-soop', lowValue\);/);
  assert.match(source, /if \(row\.getAttribute\('data-low-soop-live'\) !== lowValue\) row\.setAttribute\('data-low-soop-live', lowValue\);/);
});

test('clicking the 500 이하 filter only reapplies the verified snapshot', () => {
  assert.match(source, /lowButton\.addEventListener\('click', repairAuthoritativeUi\)/);
});
