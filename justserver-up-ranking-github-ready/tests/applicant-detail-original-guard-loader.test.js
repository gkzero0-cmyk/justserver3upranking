const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'ranking-utils.js'), 'utf8');

test('original-comment guard loads after speed hotfix and before navigation', () => {
  const speedWrite = source.indexOf('src="${detailSpeedHotfixUrl}');
  const guardWrite = source.indexOf('src="${detailOriginalGuardUrl}');
  const navigationWrite = source.indexOf('src="${detailHotfixUrl}');
  assert.ok(speedWrite >= 0 && guardWrite > speedWrite && navigationWrite > guardWrite);
  assert.match(source, /applicant-detail-original-guard\.js/);
});
