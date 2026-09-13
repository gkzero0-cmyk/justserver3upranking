const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { parseApplicationComment, formatApplicationDetail } = require('../applicant-detail-utils.js');
const detailApi = require('../api/applicant-detail.js');
const liveFix = require('../live-soop-filter-fix.js');
const root = path.join(__dirname, '..');
const liveSource = fs.readFileSync(path.join(root, 'live-soop-filter-fix.js'), 'utf8');

test('CHZZK name cleanup removes Unicode format characters around redirect markers', () => {
  const comment = `이름 : 디또띠 >>\u200d https://chzzk.naver.com/b28d617a1d981cfff65d163f116cab7d\n즐찾 수 : 2703\n하고 싶은 말 : 테스트\n입주비 : 동의합니다.`;
  const parsed = parseApplicationComment(comment, '띠또.');
  assert.equal(parsed.name, '디또띠');
  const detail = formatApplicationDetail({ user_id: 'dd0705', user_nick: '띠또.', comment }, { fan_cnt: 69 });
  assert.equal(detail.name, '디또띠');
});

test('applicant detail API performs final CHZZK name cleanup itself', () => {
  assert.equal(typeof detailApi._test.sanitizeChzzkDetailName, 'function');
  assert.equal(detailApi._test.sanitizeChzzkDetailName({
    name: '디또띠 >>',
    originalComment: '치지직 신청',
    chzzkStationUrl: 'https://chzzk.naver.com/example'
  }), '디또띠');
  assert.equal(detailApi._test.sanitizeChzzkDetailName({
    name: 'SOOP이름 >', originalComment: '일반 신청', chzzkStationUrl: ''
  }), 'SOOP이름 >');
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
