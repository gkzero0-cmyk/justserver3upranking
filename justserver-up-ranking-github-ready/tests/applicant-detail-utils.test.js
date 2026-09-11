const test = require('node:test');
const assert = require('node:assert/strict');
const {
  parseApplicationComment,
  normalizePhotoUrl,
  normalizeFanCount,
  formatApplicationDetail
} = require('../applicant-detail-utils.js');

test('parses the slash-delimited application template', () => {
  const parsed = parseApplicationComment(
    '박재박 / 29,633명 / 와아 그냥서버 너무너무 기다렸어요!! 꼭 하고 싶어요오!! / 입주비 완전히 동의합니다!!',
    '사내.박재박'
  );
  assert.equal(parsed.name, '박재박');
  assert.equal(parsed.declaredFanCount, 29633);
  assert.equal(parsed.message, '와아 그냥서버 너무너무 기다렸어요!! 꼭 하고 싶어요오!!');
  assert.equal(parsed.moveInFee, '입주비 완전히 동의합니다!!');
});

test('parses a label-delimited application template', () => {
  const parsed = parseApplicationComment(
    '이름: 화양씨\n애청자: 36,857명\n하고싶은말: 시즌4 꼭 참여하고 싶습니다!\n입주비: 동의합니다',
    '화양'
  );
  assert.equal(parsed.name, '화양씨');
  assert.equal(parsed.declaredFanCount, 36857);
  assert.equal(parsed.message, '시즌4 꼭 참여하고 싶습니다!');
  assert.equal(parsed.moveInFee, '동의합니다');
});

test('parses emoji bullet applications and keeps multiline messages separate from move-in fee', () => {
  const parsed = parseApplicationComment(
    '💙해콩\n\n💙524명\n\n💙그냥서버 너무너무 하고싶습니다!\n뉴걸이라 할수있는게 한정되어있는데 뽑아주시면 열심히할수있어요!!!\n\n💙입주비 동의함니다!',
    '해콩°'
  );
  assert.equal(parsed.name, '해콩');
  assert.equal(parsed.declaredFanCount, 524);
  assert.equal(parsed.message, '그냥서버 너무너무 하고싶습니다!\n뉴걸이라 할수있는게 한정되어있는데 뽑아주시면 열심히할수있어요!!!');
  assert.equal(parsed.moveInFee, '입주비 동의함니다!');
});

test('accepts decorated label variants for favorites, message and move-in fee', () => {
  const parsed = parseApplicationComment(
    '💙 이름 : 해콩\n💙 즐겨찾기수 : 524명\n💙 하고 싶은 말 : 꼭 참여하고 싶어요\n💙 입주비동의여부 : 동의합니다',
    '해콩°'
  );
  assert.equal(parsed.name, '해콩');
  assert.equal(parsed.declaredFanCount, 524);
  assert.equal(parsed.message, '꼭 참여하고 싶어요');
  assert.equal(parsed.moveInFee, '동의합니다');
});

test('normalizes Korean fan-count strings', () => {
  assert.equal(normalizeFanCount('29,633명'), 29633);
  assert.equal(normalizeFanCount('3.7만'), 37000);
  assert.equal(normalizeFanCount('3.7만+2'), 37002);
  assert.equal(normalizeFanCount('정보 없음'), null);
});

test('normalizes SOOP comment photo URLs', () => {
  assert.equal(
    normalizePhotoUrl({ url: '//stimg.sooplive.co.kr/COMMENT/3/example.png' }),
    'https://stimg.sooplive.co.kr/COMMENT/3/example.png'
  );
  assert.equal(
    normalizePhotoUrl({ domain: 'stimg.sooplive.co.kr', filename: 'COMMENT/3/example.jpg' }),
    'https://stimg.sooplive.co.kr/COMMENT/3/example.jpg'
  );
  assert.equal(normalizePhotoUrl(null), '');
});

test('uses current SOOP fan count and falls back to the application count', () => {
  const raw = {
    p_comment_no: 119777209,
    user_id: 'jaeparkk',
    user_nick: '사내.박재박',
    comment: '박재박 / 29,633명 / 참가하고 싶어요 / 입주비 동의합니다',
    photo: { url: '//stimg.sooplive.co.kr/COMMENT/3/example.png' }
  };
  const current = formatApplicationDetail(raw, { fan_cnt: 36857, user_nick: '박재박' });
  assert.equal(current.fanCount, 36857);
  assert.equal(current.fanCountSource, 'soop');
  assert.equal(current.photoUrl, 'https://stimg.sooplive.co.kr/COMMENT/3/example.png');

  const fallback = formatApplicationDetail(raw, null);
  assert.equal(fallback.fanCount, 29633);
  assert.equal(fallback.fanCountSource, 'application');
});

test('reads the real nested SOOP station favorite count, profile image and preserves original comment', () => {
  const originalComment = '💙해콩\n\n💙524명\n\n💙꼭 참여하고 싶어요\n\n💙입주비 동의합니다';
  const raw = {
    p_comment_no: 120017045,
    user_id: 'yami875',
    user_nick: '해콩°',
    comment: originalComment,
    photo: { url: '//stimg.sooplive.co.kr/COMMENT/3/application.png' }
  };
  const station = {
    profile_image: '//profile.img.sooplive.co.kr/LOGO/ya/yami875/yami875.jpg',
    station: { upd: { fan_cnt: 603 }, user_nick: '해콩°' }
  };
  const detail = formatApplicationDetail(raw, station);
  assert.equal(detail.fanCount, 603);
  assert.equal(detail.fanCountSource, 'soop');
  assert.equal(detail.profileImageUrl, 'https://profile.img.sooplive.co.kr/LOGO/ya/yami875/yami875.jpg');
  assert.equal(detail.photoUrl, 'https://stimg.sooplive.co.kr/COMMENT/3/application.png');
  assert.equal(detail.originalComment, originalComment);
});