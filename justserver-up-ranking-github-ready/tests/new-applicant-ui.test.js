const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { getKstTodayKeys } = require('../ranking-utils');

test('getKstTodayKeys returns stable keys for only today KST applicants', () => {
  const now = Date.parse('2026-09-08T08:17:00+09:00');
  const comments = [
    { commentNo: '101', userId: 'alpha', regDate: '2026-09-08 00:00:00' },
    { commentNo: '102', userId: 'beta', regDate: '2026-09-08 08:16:59' },
    { commentNo: '103', userId: 'gamma', regDate: '2026-09-07 23:59:59' },
    { commentNo: '104', userId: 'future', regDate: '2026-09-08 08:18:00' }
  ];
  assert.deepEqual(getKstTodayKeys(comments, now), ['comment:101', 'comment:102']);
});

test('ranking utility wires New labels and clickable new-applicant filtering', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'ranking-utils.js'), 'utf8');
  assert.match(source, /new-applicant-label/);
  assert.match(source, /newApplicantCount/);
  assert.match(source, /data-favorite-key/);
  assert.match(source, /MutationObserver/);
  assert.match(source, /addEventListener\('click'/);
  assert.match(source, /suppressFavoriteFilterReset/);
});
