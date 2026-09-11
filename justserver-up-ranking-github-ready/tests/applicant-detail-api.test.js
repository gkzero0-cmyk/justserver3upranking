const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const apiPath = path.join(__dirname, '..', 'api', 'applicant-detail.js');

test('applicant detail endpoint is on-demand and returns the required detail fields', () => {
  assert.equal(fs.existsSync(apiPath), true, 'api/applicant-detail.js must exist');
  const source = fs.readFileSync(apiPath, 'utf8');
  assert.match(source, /require\(['"]\.\.\/applicant-detail-utils\.js['"]\)/);
  assert.match(source, /chapi\.sooplive\.co\.kr\/api/);
  assert.match(source, /bjapi\.afreecatv\.com\/api/);
  assert.match(source, /commentNo/);
  assert.match(source, /userId/);
  assert.match(source, /fanCountSource/);
  assert.match(source, /photoUrl/);
  assert.match(source, /commentUrl/);
  assert.match(source, /stationUrl/);
});

test('applicant detail endpoint keeps the full station payload so nested fan count and profile image can be normalized', () => {
  const source = fs.readFileSync(apiPath, 'utf8');
  assert.match(source, /formatApplicationDetail\(raw,\s*station\)/);
  assert.doesNotMatch(source, /const\s+currentFanCount\s*=\s*station\?\.fan_cnt/);
  assert.doesNotMatch(source, /stationForDetail/);
});

test('applicant detail endpoint validates identifiers and caches click lookups', () => {
  assert.equal(fs.existsSync(apiPath), true, 'api/applicant-detail.js must exist');
  const source = fs.readFileSync(apiPath, 'utf8');
  assert.match(source, /status\(400\)/);
  assert.match(source, /DETAIL_CACHE_MS/);
  assert.match(source, /detailCache/);
  assert.match(source, /no-store/);
});