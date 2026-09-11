const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const utils = require('../ranking-utils');

test('server schedule markup contains the requested dates and labels', () => {
  assert.equal(typeof utils.serverScheduleMarkup, 'function');
  const html = utils.serverScheduleMarkup();
  assert.match(html, /class="hero-schedule"/);
  assert.match(html, /접수마감/);
  assert.match(html, /2026년 9월 20일/);
  assert.match(html, /입주발표/);
  assert.match(html, /2026년 9월 22일/);
  assert.match(html, /서버기간/);
  assert.match(html, /2026\. 9\. 30 ~ 2026\. 10\. 21/);
});

test('server schedule CSS places the card on the right and stacks it on smaller screens', () => {
  assert.equal(typeof utils.serverScheduleCss, 'function');
  const css = utils.serverScheduleCss();
  assert.match(css, /\.hero-top\s*\{[^}]*display:flex/);
  assert.match(css, /\.hero-schedule\s*\{[^}]*flex:0 0 320px/);
  assert.match(css, /@media\(max-width:980px\)[\s\S]*\.hero-top\s*\{[^}]*flex-direction:column/);
  assert.match(css, /@media\(max-width:980px\)[\s\S]*\.hero-schedule\s*\{[^}]*width:100%/);
});

test('ranking utility installs the server schedule and deadline badge into the existing hero', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'ranking-utils.js'), 'utf8');
  assert.match(source, /installServerScheduleUi/);
  assert.match(source, /querySelector\('\.hero'\)/);
  assert.match(source, /querySelector\('\.hero-actions'\)/);
  assert.match(source, /className = 'hero-top'/);
  assert.match(source, /className = 'hero-main'/);
  assert.match(source, /className = 'hero-title-row'/);
  assert.match(source, /deadlineBadge/);
  assert.match(source, /APPLICATION_DEADLINE_YMD = '2026-09-20'/);
  assert.match(source, /getKstDdayLabel\(APPLICATION_DEADLINE_YMD, Date\.now\(\)\)/);
});