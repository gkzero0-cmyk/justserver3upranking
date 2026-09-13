const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const column = require(path.join('..', 'applicant-follower-column.js'));

const detailUtils = {
  parseApplicationComment(comment, fallback) {
    if (/디또띠/.test(comment)) return { name: '디또띠' };
    if (/데로DeRo/.test(comment)) return { name: '데로DeRo' };
    return { name: fallback };
  },
  extractChzzkStationUrl(comment) {
    const m = String(comment).match(/https:\/\/chzzk\.naver\.com\/[A-Za-z0-9_-]+/i);
    return m ? m[0] : '';
  }
};

test('formats SOOP and CHZZK current counts as compact follower lines', () => {
  const lines = column.buildFollowerLines({ soopCount: 29633, isChzzk: true, chzzkCount: 2703, chzzkStatus: 'ready' });
  assert.deepEqual(lines, [
    { platform: 'SOOP', text: '29,633', status: 'ready' },
    { platform: '치지직', text: '2,703', status: 'ready' }
  ]);
});

test('shows CHZZK pending or unavailable without inventing counts', () => {
  assert.deepEqual(column.buildFollowerLines({ soopCount: 69, isChzzk: true, chzzkStatus: 'loading' }), [
    { platform: 'SOOP', text: '69', status: 'ready' },
    { platform: '치지직', text: '확인 중…', status: 'loading' }
  ]);
  assert.deepEqual(column.buildFollowerLines({ soopCount: null, isChzzk: true, chzzkStatus: 'unmatched' }), [
    { platform: 'SOOP', text: '-', status: 'missing' },
    { platform: '치지직', text: '-', status: 'missing' }
  ]);
});

test('builds exact CHZZK lookup from parsed application name and direct URL when present', () => {
  const item = { userNick: '띠또.', comment: '이름 : 디또띠 >> https://chzzk.naver.com/b28d617a1d981cfff65d163f116cab7d\n즐찾 수 : 2703' };
  assert.deepEqual(column.buildChzzkLookup(item, detailUtils), {
    isChzzk: true,
    name: '디또띠',
    channelUrl: 'https://chzzk.naver.com/b28d617a1d981cfff65d163f116cab7d'
  });
});

test('does not query CHZZK for ordinary SOOP applications', () => {
  const item = { userNick: '사내.박재박', comment: '박재박 / 29,633명 / 와아 그냥서버 너무 기다렸어요!!' };
  assert.deepEqual(column.buildChzzkLookup(item, detailUtils), { isChzzk: false, name: '', channelUrl: '' });
});

test('merges chunked SOOP count responses without dropping earlier chunks', () => {
  const map = new Map([['old', 10]]);
  column.mergeSoopCountPayload(map, { ok: true, counts: { jaeparkk: 29633, uchi5757: 860 } });
  column.mergeSoopCountPayload(map, { ok: true, counts: { pqf1234: 17592 } });
  assert.equal(map.get('jaeparkk'), 29633);
  assert.equal(map.get('uchi5757'), 860);
  assert.equal(map.get('pqf1234'), 17592);
  assert.equal(map.get('old'), 10);
});
