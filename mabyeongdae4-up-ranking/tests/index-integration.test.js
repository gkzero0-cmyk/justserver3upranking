const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = name => fs.readFileSync(path.join(__dirname, '..', name), 'utf8');

test('index identifies the site and source post', () => {
  const html = read('index.html');
  assert.match(html, /마병대 4 실시간 UP 랭킹/);
  assert.match(html, /https:\/\/www\.sooplive\.com\/station\/devil0108\/post\/206507027/);
  assert.match(html, /id="newApplicantCount"/);
});

test('index exposes sorting, applicant, favorite and pass filters', () => {
  const html = read('index.html');
  for (const id of ['favoriteFilterBtn', 'soldierFilterBtn', 'officerFilterBtn', 'passFilterBtn', 'excludedFilterBtn']) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(html, /data-sort="up"/);
  assert.match(html, /data-sort="newest"/);
  assert.match(html, /data-sort="oldest"/);
});

test('index wires split assets and settings import/export controls', () => {
  const html = read('index.html');
  assert.match(html, /href="\.\/styles\.css"/);
  assert.match(html, /src="\.\/ranking-utils\.js"/);
  assert.match(html, /src="\.\/app\.js"/);
  assert.match(html, /id="exportSettingsBtn"/);
  assert.match(html, /id="importSettingsInput"/);
});

test('app renders station profile avatars, rank movement and classification controls', () => {
  const js = read('app.js');
  assert.match(js, /profile\.img\.sooplive\.co\.kr/);
  assert.match(js, /rank-change/);
  assert.match(js, /applicant-type-select/);
  assert.match(js, /pass-state-btn/);
  assert.match(js, /localStorage/);
  assert.match(js, /REFRESH_MS\s*=\s*1000/);
});
