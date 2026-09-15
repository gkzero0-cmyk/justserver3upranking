const test = require('node:test');
const assert = require('node:assert/strict');
const guard = require('../applicant-detail-original-guard.js');

test('prefetch detail requests never become active original-comment sources', () => {
  const url = '/api/applicant-detail-v2?commentNo=123&userId=alpha&prefetch=1';
  assert.equal(guard.isPrefetchRequest(url), true);
  assert.equal(guard.shouldAcceptDetailRequest(url, '123:alpha'), false);
});

test('only the exact active commentNo + userId can update original comment', () => {
  assert.equal(guard.shouldAcceptDetailRequest('/api/applicant-detail?commentNo=123&userId=alpha', '123:alpha'), true);
  assert.equal(guard.shouldAcceptDetailRequest('/api/applicant-detail?commentNo=124&userId=alpha', '123:alpha'), false);
  assert.equal(guard.shouldAcceptDetailRequest('/api/applicant-detail?commentNo=123&userId=beta', '123:alpha'), false);
});

test('comment cache is keyed by commentNo + userId so adjacent applicants cannot share originals', () => {
  const cache = new Map();
  guard.rememberCommentPayload(cache, { comments: [
    { commentNo: '123', userId: 'alpha', comment: 'alpha original' },
    { commentNo: '124', userId: 'beta', comment: 'beta original' }
  ]});
  assert.equal(guard.getCachedOriginal(cache, '123:alpha'), 'alpha original');
  assert.equal(guard.getCachedOriginal(cache, '124:beta'), 'beta original');
  assert.equal(guard.getCachedOriginal(cache, '123:beta'), '');
});
