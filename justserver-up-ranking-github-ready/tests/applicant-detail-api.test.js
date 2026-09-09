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
  assert.match(source, /fan_cnt/);
  assert.match(source, /commentNo/);
  assert.match(source, /userId/);
  assert.match(source, /fanCountSource/);
  assert.match(source, /photoUrl/);
  assert.match(source, /commentUrl/);
  assert.match(source, /stationUrl/);
});

test('applicant detail endpoint validates identifiers and caches click lookups', () => {
  assert.equal(fs.existsSync(apiPath), true, 'api/applicant-detail.js must exist');
  const source = fs.readFileSync(apiPath, 'utf8');
  assert.match(source, /status\(400\)/);
  assert.match(source, /DETAIL_CACHE_MS/);
  assert.match(source, /detailCache/);
  assert.match(source, /no-store/);
});
