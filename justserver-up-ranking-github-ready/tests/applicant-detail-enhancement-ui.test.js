const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const utils = require('../ranking-utils');

const source = fs.readFileSync(path.join(__dirname, '..', 'ranking-utils.js'), 'utf8');

test('ranking utility exposes applicant detail enhancements', () => {
  assert.equal(typeof utils.installApplicantDetailEnhancements, 'function');
  assert.match(source, /profileImageUrl/);
  assert.match(source, /detail-profile-line/);
  assert.match(source, /originalComment/);
  assert.match(source, /신청 댓글 원문 보기/);
  assert.match(source, /data-detail-original-toggle/);
});

test('applicant detail enhancement keeps the existing comment attachment panel untouched', () => {
  assert.doesNotMatch(source, /detail-photo-wrap[\s\S]{0,200}profileImageUrl/);
  assert.match(source, /querySelector\('\.detail-head'\)/);
});