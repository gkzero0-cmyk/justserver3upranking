const test = require('node:test');
const assert = require('node:assert/strict');
const {
  parseApplicationComment,
  formatApplicationDetail,
  extractChzzkStationUrl
} = require('../applicant-detail-utils.js');

const comment = `데로DeRo [치지직] / 373명
https://chzzk.naver.com/6a6825de1007633794516692c0cfc378
그냥서버 방송이랑 유튜브로만 봤는데 너무 참여하고 싶습미다! 마크 횟수로 1달 정도된 응애지만 참여만 시켜주시면 야무지게 사고치며 즐겨보겠습니다-!!
입주비 동의합미다-!`;

test('parses CHZZK inline application without treating URL slashes as section separators', () => {
  const parsed = parseApplicationComment(comment, 'fallback');
  assert.equal(parsed.name, '데로DeRo');
  assert.equal(parsed.declaredFanCount, 373);
  assert.equal(parsed.message, '그냥서버 방송이랑 유튜브로만 봤는데 너무 참여하고 싶습미다! 마크 횟수로 1달 정도된 응애지만 참여만 시켜주시면 야무지게 사고치며 즐겨보겠습니다-!!');
  assert.equal(parsed.moveInFee, '입주비 동의합미다-!');
});

test('extracts CHZZK station URL into applicant detail payload', () => {
  const url = 'https://chzzk.naver.com/6a6825de1007633794516692c0cfc378';
  assert.equal(extractChzzkStationUrl(comment), url);
  const detail = formatApplicationDetail({
    p_comment_no: 123,
    user_id: 'dero',
    user_nick: '데로DeRo',
    comment
  }, null);
  assert.equal(detail.chzzkStationUrl, url);
});
