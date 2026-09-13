const test = require('node:test');
const assert = require('node:assert/strict');
const client = require('../applicant-detail-v2-client.js');
const route = require('../api/applicant-detail-v2.js');

test('legacy applicant detail URL is upgraded to v2 while preserving query params', () => {
  assert.equal(client.isLegacyDetailUrl('/api/applicant-detail?commentNo=120959267&userId=dd0705'), true);
  assert.equal(client.isLegacyDetailUrl('/api/applicant-detail-v2?commentNo=1&userId=x'), false);
  assert.equal(
    client.toV2Url('/api/applicant-detail?commentNo=120959267&userId=dd0705'),
    '/api/applicant-detail-v2?commentNo=120959267&userId=dd0705'
  );
});

test('v2 fetch falls back to legacy only when v2 is not successful', async () => {
  const calls = [];
  const okResponse = { ok: true };
  const win = {
    location: { href: 'https://example.test/' },
    fetch: async input => {
      calls.push(String(input));
      if (String(input).includes('applicant-detail-v2')) return okResponse;
      return { ok: true, legacy: true };
    }
  };
  client.install(win);
  const first = await win.fetch('/api/applicant-detail?commentNo=1&userId=x');
  assert.equal(first, okResponse);
  assert.deepEqual(calls, ['/api/applicant-detail-v2?commentNo=1&userId=x']);

  const fallbackCalls = [];
  const fallbackWin = {
    location: { href: 'https://example.test/' },
    fetch: async input => {
      fallbackCalls.push(String(input));
      if (String(input).includes('applicant-detail-v2')) return { ok: false, status: 500 };
      return { ok: true, legacy: true };
    }
  };
  client.install(fallbackWin);
  const fallback = await fallbackWin.fetch('/api/applicant-detail?commentNo=1&userId=x');
  assert.equal(fallback.legacy, true);
  assert.deepEqual(fallbackCalls, [
    '/api/applicant-detail-v2?commentNo=1&userId=x',
    '/api/applicant-detail?commentNo=1&userId=x'
  ]);
});

test('v2 serverless entrypoint is distinct and marked as v2', () => {
  assert.equal(typeof route, 'function');
  assert.equal(route._test?.apiVersion, 'v2');
});

const fs = require('node:fs');
const path = require('node:path');

test('public loaders install v2 routing after detail navigation and before CHZZK stats', () => {
  for (const file of ['ranking-utils-loader.js', 'ranking-utils.js']) {
    const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
    const navIndex = source.indexOf('detailHotfixUrl');
    const v2Index = source.indexOf('detailV2Url');
    const statsIndex = source.indexOf('chzzkStatsHotfixUrl');
    assert.ok(navIndex >= 0 && v2Index > navIndex && statsIndex > v2Index, `${file} script order`);
    assert.match(source, /applicant-detail-v2-client\.js/);
  }
});

test('v2 route strips redirect suffix even when an invisible variation mark follows it', () => {
  assert.equal(typeof route._test?.sanitizeV2Name, 'function');
  assert.equal(
    route._test.sanitizeV2Name({ name: '디또띠 >>\uFE0F', originalComment: '치지직 신청', chzzkStationUrl: 'https://chzzk.naver.com/abc' }),
    '디또띠'
  );
  assert.equal(
    route._test.sanitizeV2Name({ name: 'SOOP>A', originalComment: '일반 SOOP 신청', chzzkStationUrl: '' }),
    'SOOP>A'
  );
});
