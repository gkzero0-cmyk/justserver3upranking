const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('hero shows the server schedule in a dedicated right-side card', () => {
  assert.match(html, /class="hero-top"/);
  assert.match(html, /class="hero-main"/);
  assert.match(html, /class="hero-schedule"/);
  assert.match(html, /접수마감/);
  assert.match(html, /2026년 9월 20일/);
  assert.match(html, /입주발표/);
  assert.match(html, /2026년 9월 22일/);
  assert.match(html, /서버기간/);
  assert.match(html, /2026\. 9\. 30 ~ 2026\. 10\. 21/);
});

test('schedule card keeps the hero responsive on narrower screens', () => {
  assert.match(html, /\.hero-top\s*\{[^}]*display:flex/);
  assert.match(html, /\.hero-schedule\s*\{[^}]*flex:0 0 320px/);
  assert.match(html, /@media\(max-width:980px\)[\s\S]*\.hero-top\s*\{[^}]*flex-direction:column/);
  assert.match(html, /@media\(max-width:980px\)[\s\S]*\.hero-schedule\s*\{[^}]*width:100%/);
});
