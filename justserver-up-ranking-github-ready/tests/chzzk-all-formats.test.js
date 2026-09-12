const test = require('node:test');
const assert = require('node:assert/strict');
const { parseApplicationComment, extractChzzkStationUrl, formatApplicationDetail } = require('../applicant-detail-utils.js');

const cases = [
  {
    label: 'dero separate url after name/count',
    comment: `데로DeRo [치지직] / 373명\nhttps://chzzk.naver.com/6a6825de1007633794516692c0cfc378\n그냥서버 방송이랑 유튜브로만 봤는데 너무 참여하고 싶습미다!\n입주비 동의합미다-!`,
    name: '데로DeRo', count: 373, url: 'https://chzzk.naver.com/6a6825de1007633794516692c0cfc378', message: '그냥서버 방송이랑 유튜브로만 봤는데 너무 참여하고 싶습미다!', fee: '입주비 동의합미다-!'
  },
  {
    label: 'labeled name with embedded channel url',
    comment: `이름 : 디또띠 >> https://chzzk.naver.com/b28d617a1d981cfff65d163f116cab7d\n즐찾 수 : 2703\n하고 싶은 말 : 사회 초년생으로써 마크세상에서 빚 갚고 사회의 쓴맛을 느끼러 왔습니다!!\n입주비 : 동의합니다.`,
    name: '디또띠', count: 2703, url: 'https://chzzk.naver.com/b28d617a1d981cfff65d163f116cab7d', message: '사회 초년생으로써 마크세상에서 빚 갚고 사회의 쓴맛을 느끼러 왔습니다!!', fee: '동의합니다.'
  },
  {
    label: 'mobile chzzk url',
    comment: `이름:월야령\n팔로우:500명\n링크:https://m.chzzk.naver.com/5f902f49aff44378fe1f4927ade403aa\n하고싶은말:마크를 좋아하는 입장에서 꼭 한번 해보고 싶습니다\n입주비 동의 여부:동의합니다`,
    name: '월야령', count: 500, url: 'https://chzzk.naver.com/5f902f49aff44378fe1f4927ade403aa', message: '마크를 좋아하는 입장에서 꼭 한번 해보고 싶습니다', fee: '동의합니다'
  },
  {
    label: 'live url inline with chzzk/count',
    comment: `제엘(곧 이름은 시로호시 텐코로 바꿀 예정입니다) [치지직/523명] https://chzzk.naver.com/live/c16c745e7fbb69ea96832d787e8dbdb8 /이런 서버 한번씩 들어가보고 싶었습니다 /입주비 동의합니다`,
    name: '제엘(곧 이름은 시로호시 텐코로 바꿀 예정입니다)', count: 523, url: 'https://chzzk.naver.com/c16c745e7fbb69ea96832d787e8dbdb8', message: '이런 서버 한번씩 들어가보고 싶었습니다', fee: '입주비 동의합니다'
  },
  {
    label: 'name url count message multiline',
    comment: `도 꼬(치지직)\nhttps://chzzk.naver.com/32140f2b5523d5203c998139e0c95dbe\n1,016명\n안녕하세요! 델타포스를 주력으로 방송하고 있는 도꼬 입니다.\n사람들과 어울리면서 사건사고 만들고, 그걸 콘텐츠로 뽑아내는 데 자신 있습니다.\n입주비 동의합니다!`,
    name: '도 꼬', count: 1016, url: 'https://chzzk.naver.com/32140f2b5523d5203c998139e0c95dbe', message: '안녕하세요! 델타포스를 주력으로 방송하고 있는 도꼬 입니다.\n사람들과 어울리면서 사건사고 만들고, 그걸 콘텐츠로 뽑아내는 데 자신 있습니다.', fee: '입주비 동의합니다!'
  },
  {
    label: 'name url then count slash message slash fee',
    comment: `김김건\nhttps://chzzk.naver.com/74b53e9f47d3fa5657977a88bfd4eb27\n305명 / 최근에 숲,치지직 동시송출로 진행하고 있습니다. 하루종일 빚 갚겠습니다. / 입주비동의합니다`,
    name: '김김건', count: 305, url: 'https://chzzk.naver.com/74b53e9f47d3fa5657977a88bfd4eb27', message: '최근에 숲,치지직 동시송출로 진행하고 있습니다. 하루종일 빚 갚겠습니다.', fee: '입주비동의합니다'
  },
  {
    label: 'leading chzzk tag no url',
    comment: `[치지직]차경 / 1,204명 / 힐링을 겉드린 마크서버를 기다리고있었습니다. / 입주비 동의합니다`,
    name: '차경', count: 1204, url: '', message: '힐링을 겉드린 마크서버를 기다리고있었습니다.', fee: '입주비 동의합니다'
  }
];

for (const c of cases) {
  test(c.label, () => {
    const parsed = parseApplicationComment(c.comment, 'fallback');
    assert.equal(parsed.name, c.name);
    assert.equal(parsed.declaredFanCount, c.count);
    assert.equal(parsed.message, c.message);
    assert.equal(parsed.moveInFee, c.fee);
    assert.equal(extractChzzkStationUrl(c.comment), c.url);
  });
}

test('CHZZK application uses declared CHZZK follower count instead of SOOP fallback count', () => {
  const comment = `데로DeRo [치지직] / 373명\nhttps://chzzk.naver.com/6a6825de1007633794516692c0cfc378\n하고싶은말\n입주비 동의`;
  const detail = formatApplicationDetail({ user_id: 'dein88', user_nick: '데로De_Ro', comment }, { fan_cnt: 87 });
  assert.equal(detail.fanCount, 373);
  assert.equal(detail.fanCountSource, 'chzzk-application');
});
