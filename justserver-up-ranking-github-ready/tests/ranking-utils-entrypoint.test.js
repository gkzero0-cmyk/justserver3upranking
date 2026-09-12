const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const entry = fs.readFileSync(path.join(__dirname, '..', 'ranking-utils.js'), 'utf8');

test('ranking-utils public entrypoint loads the base bundle and live hotfixes', () => {
  assert.match(entry, /ranking-utils-base\.js/);
  assert.match(entry, /live-soop-filter-fix\.js/);
  assert.match(entry, /applicant-detail-navigation-hotfix\.js/);
});
