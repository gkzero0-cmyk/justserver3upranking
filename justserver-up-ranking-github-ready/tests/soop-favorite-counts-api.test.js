const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

function mockResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return this; },
    end() { return this; }
  };
}

async function withFreshHandler(fetchImpl, fn) {
  const modulePath = path.resolve(__dirname, '../api/soop-favorite-counts.js');
  delete require.cache[modulePath];
  const oldFetch = global.fetch;
  global.fetch = fetchImpl;
  try { await fn(require(modulePath)); } finally { global.fetch = oldFetch; delete require.cache[modulePath]; }
}

test('returns current SOOP fan counts for requested applicants', async () => {
  const counts = { uchi5757: 859, pgf1234: 17593, stilllow: 480 };
  await withFreshHandler(async url => {
    const id = decodeURIComponent(String(url).match(/\/api\/([^/]+)\/station/)[1]);
    return { ok: true, async json() { return { station: { upd: { fan_cnt: counts[id] } } }; } };
  }, async handler => {
    const req = { method: 'POST', body: { userIds: Object.keys(counts) }, query: {} };
    const res = mockResponse();
    await handler(req, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.ok, true);
    assert.deepEqual(res.body.counts, counts);
    assert.equal(res.body.resolved, 3);
  });
});

test('one failed SOOP station lookup produces null without failing the batch', async () => {
  await withFreshHandler(async url => {
    const id = decodeURIComponent(String(url).match(/\/api\/([^/]+)\/station/)[1]);
    if (id === 'broken') return { ok: false, status: 503, async text() { return 'down'; } };
    return { ok: true, async json() { return { station: { upd: { fan_cnt: 321 } } }; } };
  }, async handler => {
    const req = { method: 'POST', body: { userIds: ['good', 'broken'] }, query: {} };
    const res = mockResponse();
    await handler(req, res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body.counts, { good: 321, broken: null });
    assert.equal(res.body.resolved, 1);
  });
});
