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

test('index opens applicant details on demand from name or comment clicks', () => {
  const html = fs.readFileSync(indexPath, 'utf8');
  assert.match(html, /id="applicantDetailModal"/);
  assert.match(html, /aria-modal="true"/);
  assert.match(html, /detail-trigger/);
  assert.match(html, /\/api\/applicant-detail\?commentNo=/);
  assert.match(html, /상세 정보를 불러오는 중/);
  assert.match(html, /data-detail-close/);
  assert.match(html, /event\.key === 'Escape'/);
});

test('favorite and comment-toggle actions are handled before detail triggers', () => {
  const html = fs.readFileSync(indexPath, 'utf8');
  const toggle = html.indexOf("event.target.closest('.comment-toggle')");
  const favorite = html.indexOf("event.target.closest('.favorite-btn')");
  const detail = html.indexOf("event.target.closest('.detail-trigger')");
  assert.ok(toggle >= 0);
  assert.ok(favorite > toggle);
  assert.ok(detail > favorite);
});
