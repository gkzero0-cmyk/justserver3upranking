const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const hotfix = require('../flowercrab-chzzk-hotfix.js');
const rankingLoader = fs.readFileSync(path.join(__dirname, '..', 'ranking-utils.js'), 'utf8');
const rankingLoaderAlt = fs.readFileSync(path.join(__dirname, '..', 'ranking-utils-loader.js'), 'utf8');

test('maps flowercrab12 to the requested verified CHZZK channel', () => {
  assert.equal(hotfix.USER_ID, 'flowercrab12');
  assert.equal(hotfix.CHANNEL_ID, '43e3c57feed0478ff9812109a40f9fe8');
  assert.equal(hotfix.CHANNEL_URL, 'https://chzzk.naver.com/43e3c57feed0478ff9812109a40f9fe8');
  assert.equal(hotfix.isVerifiedApplicant({ userId: 'FLOWERCRAB12' }), true);
});

test('patches ranking classification and count without breaking existing CHZZK matches', () => {
  const utils = {
    favoriteKey: item => `comment:${item.commentNo}`,
    isChzzkApplicant: item => /치지직|옆동네/iu.test(String(item?.comment || '')),
    countChzzkApplicants: () => 0
  };
  hotfix.patchRankingUtils(utils);
  assert.equal(utils.isChzzkApplicant({ userId: 'flowercrab12', comment: '꽃게대장 / 1,249명 / 서버 재미있게 즐기겠습니다' }), true);
  assert.equal(utils.isChzzkApplicant({ userId: 'other', comment: '치지직 신청입니다' }), true);
  assert.equal(utils.countChzzkApplicants([
    { userId: 'flowercrab12', comment: '일반 신청문' },
    { userId: 'other', comment: '치지직 신청입니다' }
  ]), 2);
});

test('decorates flowercrab12 detail payload with the direct CHZZK station URL', () => {
  const payload = hotfix.decorateDetailPayload({ ok: true, userId: 'flowercrab12', name: '꽃게대장' });
  assert.equal(payload.chzzkStationUrl, hotfix.CHANNEL_URL);
  assert.equal(hotfix.decorateDetailPayload({ ok: true, userId: 'other' }).chzzkStationUrl, undefined);
});

test('loads the verified CHZZK hotfix before the inline ranking app uses RankingUtils', () => {
  for (const source of [rankingLoader, rankingLoaderAlt]) {
    assert.match(source, /flowercrab-chzzk-hotfix\.js/);
    assert.ok(source.indexOf('flowercrab-chzzk-hotfix.js') < source.indexOf('applicant-follower-column.js'));
    assert.ok(source.indexOf('${verifiedChzzkUrl}') < source.indexOf('${followerColumnUrl}'));
  }
});
