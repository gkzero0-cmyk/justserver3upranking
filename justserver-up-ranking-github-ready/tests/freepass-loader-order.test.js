const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

for (const file of ['ranking-utils.js', 'ranking-utils-loader.js']) {
  test(`${file} loads freepass after follower column and before live filter`, () => {
    const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
    const follower = source.indexOf('applicant-follower-column.js');
    const freepass = source.indexOf('freepass-filter.js');
    const liveFilter = source.indexOf('live-soop-filter-fix.js');
    assert.ok(follower >= 0);
    assert.ok(freepass > follower);
    assert.ok(liveFilter > freepass);
  });
}
