const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const stats = require('../stats-summary-hotfix.js');
const commentsHandler = require('../api/comments.js');

const statsSource = fs.readFileSync(path.join(__dirname, '..', 'stats-summary-hotfix.js'), 'utf8');
const loaderSource = fs.readFileSync(path.join(__dirname, '..', 'ranking-utils.js'), 'utf8');

test('excludes only the confirmed Moon Haena duplicate and preserves the other comments', () => {
  assert.equal(commentsHandler.shouldExcludeComment({ commentNo: '119797205', userId: 'haena419' }), false);
  assert.equal(commentsHandler.shouldExcludeComment({ commentNo: '119806205', userId: 'haena419' }), true);
  assert.equal(commentsHandler.shouldExcludeComment({ commentNo: '120017217', userId: 'haena419' }), false);
  assert.equal(commentsHandler.EXCLUDED_COMMENT_NOS.size, 1);
});

test('shows the requested duplicate note text', () => {
  assert.equal(stats.EXCLUDED_DUPLICATE_COUNT, 1);
});

test('counts unique SOOP applicants while excluding CHZZK applicants', () => {
  const utils = {
    isChzzkApplicant: item => item.platform === 'chzzk',
    favoriteKey: item => `comment:${item.commentNo}`
  };
  const comments = [
    { commentNo: '1', userId: 'soopA', platform: 'soop' },
    { commentNo: '2', userId: 'soopA', platform: 'soop' },
    { commentNo: '3', userId: 'soopB', platform: 'soop' },
    { commentNo: '4', userId: 'chzzkA', platform: 'chzzk' }
  ];
  assert.equal(stats.countSoopApplicants(comments, utils), 2);
});

test('summary cards use the requested labels and order anchors', () => {
  assert.match(statsSource, /전체 댓글/);
  assert.match(statsSource, /중복 게시글 \$\{EXCLUDED_DUPLICATE_COUNT\}건 제외/);
  assert.match(statsSource, /숲 신청자/);
  assert.match(statsSource, /soopApplicantCount/);
  assert.match(statsSource, /chzzkCount/);
  assert.match(statsSource, /lowSoopFavoriteCount/);
  assert.match(statsSource, /freepassCount/);
  assert.ok(statsSource.includes('자동\\s*갱신'));
  assert.match(statsSource, /\[totalCard, soopCard, chzzkCard, lowSoopCard, freepassCard, autoCard\]/);
});

test('top-UP and cutoff cards are hidden without breaking the legacy renderer', () => {
  assert.match(statsSource, /topCard\.hidden = true/);
  assert.match(statsSource, /cutCard\.hidden = true/);
});

test('ranking loader includes summary stats hotfix', () => {
  assert.match(loaderSource, /stats-summary-hotfix\.js/);
  assert.match(loaderSource, /summaryStatsUrl/);
});
