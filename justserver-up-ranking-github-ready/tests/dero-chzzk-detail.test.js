const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { parseApplicationComment, formatApplicationDetail } = require('../applicant-detail-utils.js');

const originalComment = `데로DeRo [치지직] / 373명
https://chzzk.naver.com/6a6825de1007633794516692c0cfc378

그냥서버 방송이랑 유튜브로만 봤는데 너무 참여하고 싶습미다!
마크 횟수로 1달 정도된 응애지만
참여만 시켜주시면 야무지게 사고치며 즐겨보겠습니다-!!

입주비 동의합미다-!`;

const expectedMessage = `그냥서버 방송이랑 유튜브로만 봤는데 너무 참여하고 싶습미다!
마크 횟수로 1달 정도된 응애지만
참여만 시켜주시면 야무지게 사고치며 즐겨보겠습니다-!!`;
const chzzkUrl = 'https://chzzk.naver.com/6a6825de1007633794516692c0cfc378';

test('parses Dero Chzzk application without treating the URL slash as a field delimiter', () => {
  const parsed = parseApplicationComment(originalComment, '데로De_Ro');
  assert.equal(parsed.name, '데로DeRo');
  assert.equal(parsed.declaredFanCount, 373);
  assert.equal(parsed.message, expectedMessage);
  assert.equal(parsed.moveInFee, '입주비 동의합미다-!');
});

test('application detail exposes the Chzzk station URL from the original comment', () => {
  const detail = formatApplicationDetail({
    p_comment_no: 120082195,
    user_id: 'dein88',
    user_nick: '데로De_Ro',
    comment: originalComment
  }, {
    station: { upd: { fan_cnt: 87 } }
  });

  assert.equal(detail.name, '데로DeRo');
  assert.equal(detail.fanCount, 87);
  assert.equal(detail.message, expectedMessage);
  assert.equal(detail.moveInFee, '입주비 동의합미다-!');
  assert.equal(detail.chzzkStationUrl, chzzkUrl);
});

test('detail API and modal expose a Chzzk station shortcut next to the SOOP station link', () => {
  const apiSource = fs.readFileSync(path.join(__dirname, '..', 'api', 'applicant-detail.js'), 'utf8');
  const indexSource = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert.match(apiSource, /chzzkStationUrl/);
  assert.match(indexSource, /chzzkStationUrl/);
  assert.match(indexSource, /치지직 방송국 ↗/);
  const soopLink = indexSource.indexOf('SOOP 방송국 ↗');
  const chzzkLink = indexSource.indexOf('치지직 방송국 ↗');
  assert.ok(soopLink >= 0);
  assert.ok(chzzkLink > soopLink);
});
