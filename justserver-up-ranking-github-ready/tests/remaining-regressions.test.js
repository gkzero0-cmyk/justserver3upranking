const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { parseApplicationComment } = require('../applicant-detail-utils.js');
const liveFix = require('../live-soop-filter-fix.js');
const root = path.join(__dirname, '..');
const liveSource = fs.readFileSync(path.join(root, 'live-soop-filter-fix.js'), 'utf8');

test('CHZZK labeled name removes invisible separators left between arrow marker and URL', () => {
  const comment = `이름 : 디또띠 >>\u200b https://chzzk.naver.com/b28d617a1d981cfff65d163f116cab7d\n즐찾 수 : 2703\n하고 싶은 말 : 테스트\n입주비 : 동의합니다.`;
  const parsed = parseApplicationComment(comment, '띠또.');
  assert.equal(parsed.name, '디또띠');
});

test('live 500 이하 filter owns an authoritative row attribute independent of legacy submitted-count attributes', () => {
  assert.match(liveSource, /data-low-soop-live/);
  assert.match(liveSource, /data-low-soop-live-ready/);
  assert.match(liveSource, /low-soop-authoritative-style/);
});

test('live filter status distinguishes loading, failure, and verified counts', () => {
  assert.equal(typeof liveFix.filterStatusText, 'function');
  assert.equal(liveFix.filterStatusText(false, false, 0), '확인 중…');
  assert.equal(liveFix.filterStatusText(true, true, 0), '확인 실패');
  assert.equal(liveFix.filterStatusText(true, false, 7), '7명');
});
