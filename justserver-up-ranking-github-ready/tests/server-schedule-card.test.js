const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const utils = require('../ranking-utils');

test('server schedule markup contains the updated deadline, briefing, announcement, and unchanged server period', () => {
  assert.equal(typeof utils.serverScheduleMarkup, 'function');
  const html = utils.serverScheduleMarkup();
  assert.match(html, /class="hero-schedule"/);
  assert.match(html, /접수마감/);
  assert.match(html, /2026년 9월 16일 00시/);
  assert.match(html, /서버설명회/);
  assert.match(html, /2026년 9월 19일 토요일 오후 8시/);
  assert.match(html, /입주발표/);
  assert.match(html, /2026년 9월 19일 서버 설명회 이후 게시글로 공지/);
  assert.match(html, /서버기간/);
  assert.match(html, /2026\. 9\. 30 ~ 2026\. 10\. 21/);
});

test('server schedule CSS places the card on the right, allows long schedule text to wrap, and stacks it on smaller screens', () => {
  assert.equal(typeof utils.serverScheduleCss, 'function');
  const css = utils.serverScheduleCss();
  assert.match(css, /\.hero-top\s*\{[^}]*display:flex/);
  assert.match(css, /\.hero-schedule\s*\{[^}]*flex:0 0 320px/);
  assert.match(css, /\.schedule-item strong\s*\{[^}]*white-space:normal/);
  assert.match(css, /@media\(max-width:980px\)[\s\S]*\.hero-top\s*\{[^}]*flex-direction:column/);
  assert.match(css, /@media\(max-width:980px\)[\s\S]*\.hero-schedule\s*\{[^}]*width:100%/);
});

test('ranking utility installs the server schedule and deadline badge using the September 16 deadline', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'ranking-utils.js'), 'utf8');
  assert.match(source, /installServerScheduleUi/);
  assert.match(source, /querySelector\('\.hero'\)/);
  assert.match(source, /querySelector\('\.hero-actions'\)/);
  assert.match(source, /className = 'hero-top'/);
  assert.match(source, /className = 'hero-main'/);
  assert.match(source, /className = 'hero-title-row'/);
  assert.match(source, /deadlineBadge/);
  assert.match(source, /APPLICATION_DEADLINE_YMD = '2026-09-16'/);
  assert.match(source, /접수 마감: 2026년 9월 16일 00시/);
  assert.match(source, /getKstDdayLabel\(APPLICATION_DEADLINE_YMD, Date\.now\(\)\)/);
});

test('September 16 deadline reports D-3 on September 13 in KST', () => {
  const now = Date.parse('2026-09-13T01:00:00+09:00');
  assert.equal(utils.getKstDdayLabel('2026-09-16', now), 'D-3');
});
