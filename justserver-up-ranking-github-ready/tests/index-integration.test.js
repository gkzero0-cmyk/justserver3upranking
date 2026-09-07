const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const indexPath = path.join(__dirname, '..', 'index.html');

test('index wires the new applicant badge immediately after the SOOP source link', () => {
  const html = fs.readFileSync(indexPath, 'utf8');
  const sourceLink = html.indexOf('SOOP 원문 보기');
  const newBadge = html.indexOf('id="newApplicantCount"');
  assert.ok(sourceLink >= 0);
  assert.ok(newBadge > sourceLink);
  assert.match(html, /새로운 신청자/);
});

test('index exposes persistent favorites controls', () => {
  const html = fs.readFileSync(indexPath, 'utf8');
  assert.match(html, /id="favoriteFilterBtn"/);
  assert.match(html, /favorite-btn/);
  assert.match(html, /localStorage/);
});

test('index renders rank movement using the ranking utility module', () => {
  const html = fs.readFileSync(indexPath, 'utf8');
  assert.match(html, /<script src="\.\/ranking-utils\.js"><\/script>/);
  assert.match(html, /getRankChange/);
  assert.match(html, /rank-change/);
});
