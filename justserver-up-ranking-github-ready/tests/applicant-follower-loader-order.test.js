const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

for (const filename of ['ranking-utils.js', 'ranking-utils-loader.js']) {
  test(`${filename} loads applicant follower column before live SOOP filter`, () => {
    const source = fs.readFileSync(path.join(__dirname, '..', filename), 'utf8');
    const detailUtils = source.indexOf('applicant-detail-utils.js');
    const follower = source.indexOf('applicant-follower-column.js');
    const live = source.indexOf('live-soop-filter-fix.js');
    assert.ok(detailUtils >= 0, 'applicant-detail-utils.js missing');
    assert.ok(follower > detailUtils, 'follower column must load after detail utils');
    assert.ok(live > follower, 'follower column must wrap fetch before live SOOP filter installs');
  });
}
