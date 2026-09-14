const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const hotfix = require('../flowercrab-chzzk-hotfix.js');
const source = fs.readFileSync(path.join(__dirname, '..', 'flowercrab-chzzk-hotfix.js'), 'utf8');
const rankingLoader = fs.readFileSync(path.join(__dirname, '..', 'ranking-utils.js'), 'utf8');
const rankingLoaderAlt = fs.readFileSync(path.join(__dirname, '..', 'ranking-utils-loader.js'), 'utf8');

const expected = {
  flowercrab12: ['꽃게대장', '43e3c57feed0478ff9812109a40f9fe8'],
  changdudn50: ['자율2025', '4b2477f3cf709125fa17ece64ad66ffc'],
  jemin18: ['예준찡', 'e997149e0941aabdefdbaec44ed04a3e'],
  rorobi: ['로로비', 'f8f9c0d0029b58c79eb6070ff501cac1']
};

test('recognizes every user-verified CHZZK applicant and direct channel', () => {
  for (const [userId, [name, channelId]] of Object.entries(expected)) {
    assert.equal(hotfix.isVerifiedApplicant({ userId }), true, userId);
    const verified = hotfix.getVerifiedApplicant({ userId });
    assert.equal(verified.channelName, name, userId);
    assert.equal(verified.channelId, channelId, userId);
    assert.equal(verified.channelUrl, `https://chzzk.naver.com/${channelId}`, userId);

    const detail = hotfix.decorateDetailPayload({ ok: true, userId, name });
    assert.equal(detail.chzzkStationUrl, verified.channelUrl, userId);
  }
  assert.equal(hotfix.isVerifiedApplicant({ userId: 'someone-else' }), false);
});

test('verified applicants participate in CHZZK classification without breaking existing CHZZK matches', () => {
  const utils = {
    favoriteKey: item => `comment:${item.commentNo}`,
    isChzzkApplicant: item => /치지직|옆동네/iu.test(String(item?.comment || '')),
    countChzzkApplicants: () => 0
  };
  hotfix.patchRankingUtils(utils);
  for (const userId of Object.keys(expected)) {
    assert.equal(utils.isChzzkApplicant({ userId, comment: '일반 신청문' }), true, userId);
  }
  assert.equal(utils.isChzzkApplicant({ userId: 'other', comment: '치지직 신청입니다' }), true);
  assert.equal(utils.countChzzkApplicants([
    ...Object.keys(expected).map((userId, i) => ({ userId, commentNo: i + 1, comment: '일반 신청문' })),
    { userId: 'other', commentNo: 99, comment: '치지직 신청입니다' }
  ]), 5);
});

test('verified follower hotfix manages per-user states and overrides native CHZZK lines', () => {
  assert.match(source, /const VERIFIED_APPLICANTS = Object\.freeze/);
  assert.match(source, /const states = new Map\(\)/);
  assert.match(source, /querySelector\('\.follower-line\[data-platform="chzzk"\]'\)/);
  assert.match(source, /line\.dataset\.verifiedChzzk = userId/);
  assert.match(source, /loadAllChannels\(\)/);
});

test('keeps the original flowercrab compatibility exports', () => {
  assert.equal(hotfix.USER_ID, 'flowercrab12');
  assert.equal(hotfix.CHANNEL_ID, expected.flowercrab12[1]);
  assert.equal(hotfix.CHANNEL_URL, `https://chzzk.naver.com/${expected.flowercrab12[1]}`);
});

test('loads the verified CHZZK hotfix before follower rendering', () => {
  for (const loader of [rankingLoader, rankingLoaderAlt]) {
    assert.match(loader, /flowercrab-chzzk-hotfix\.js/);
    assert.ok(loader.indexOf('flowercrab-chzzk-hotfix.js') < loader.indexOf('applicant-follower-column.js'));
    assert.ok(loader.indexOf('${verifiedChzzkUrl}') < loader.indexOf('${followerColumnUrl}'));
  }
});
