const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const loader = fs.readFileSync(path.join(__dirname, '..', 'ranking-utils-loader.js'), 'utf8');

test('ranking loader installs applicant detail navigation hotfix before inline ranking app', () => {
  assert.match(loader, /applicant-detail-navigation-hotfix\.js/);
});

test('detail hotfix derives neighbors from visible table rows and supports keyboard arrows and CHZZK link', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'applicant-detail-navigation-hotfix.js'), 'utf8');
  assert.match(source, /#tbody tr/);
  assert.match(source, /detail-trigger/);
  assert.match(source, /ArrowLeft/);
  assert.match(source, /ArrowRight/);
  assert.match(source, /chzzkStationUrl/);
  assert.match(source, /치지직 방송국/);
});
