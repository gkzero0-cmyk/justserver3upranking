const test = require('node:test');
const assert = require('node:assert/strict');
const { getVerifiedChzzkChannelId } = require('../chzzk-channel-lookup.js');
const { isClearlyChzzkOnlyApplicant } = require('../live-soop-filter-fix.js');

test('uses manually verified CHZZK channels for reported applicants', () => {
  const expected = new Map([
    ['후로기', '332287ba7e39978bd83c125db09cf600'],
    ['쑤니s', 'e3b1c8a6af2882052ceda4b225a422c0'],
    ['히게', 'de207d7ea717cc73a4ed99d303068d88'],
    ['루이Luii', '98d01e25e79820a55d261f3baf19f2eb'],
    ['이링이', '1cce2792dc894459fcd29c54cea2d4a5'],
    ['카오스', '9363010ea9cd1288612eadcd81178477'],
    ['카오스_', '9363010ea9cd1288612eadcd81178477'],
    ['노리668', '1d694389462927382fbd3b9239792729']
  ]);
  for (const [name, channelId] of expected) {
    assert.equal(getVerifiedChzzkChannelId(name), channelId, name);
  }
});

test('does not classify verified dual-platform applicant h66rogi as CHZZK-only', () => {
  const item = {
    userId: 'h66rogi',
    comment: '후로기 / 즐겨찾기 8월 기준 293명 / 옆동네에서 이적 온지 36일차 후로기 입니다!'
  };
  assert.equal(isClearlyChzzkOnlyApplicant(item), false);
});
