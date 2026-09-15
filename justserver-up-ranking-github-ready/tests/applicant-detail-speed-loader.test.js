const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('loads detail speed hotfix before navigation and v2 client wrappers', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'ranking-utils.js'), 'utf8');
  const speed = source.indexOf('applicant-detail-speed-hotfix.js');
  const nav = source.indexOf('applicant-detail-navigation-hotfix.js');
  const v2 = source.indexOf('applicant-detail-v2-client.js');
  assert.ok(speed >= 0, 'speed hotfix must be loaded');
  assert.ok(speed < nav, 'speed hotfix must wrap fetch before navigation');
  assert.ok(nav < v2, 'navigation must remain before v2 client');
});
