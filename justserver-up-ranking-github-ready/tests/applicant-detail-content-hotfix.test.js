const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { splitLinkSegments } = require('../applicant-detail-content-hotfix.js');

test('splits http and https URLs from detail text while preserving surrounding text', () => {
  const segments = splitLinkSegments('영상: https://vod.sooplive.com/player/201207475 감사합니다');
  assert.deepEqual(segments, [
    { type: 'text', value: '영상: ' },
    { type: 'link', value: 'https://vod.sooplive.com/player/201207475' },
    { type: 'text', value: ' 감사합니다' }
  ]);
});

test('trims trailing punctuation from detected URLs', () => {
  const segments = splitLinkSegments('https://example.com/test).');
  assert.deepEqual(segments, [
    { type: 'link', value: 'https://example.com/test' },
    { type: 'text', value: ').' }
  ]);
});

test('detail hotfix contains delegated photo zoom and Escape close behavior', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'applicant-detail-content-hotfix.js'), 'utf8');
  assert.match(source, /\.detail-photo/);
  assert.match(source, /detailPhotoLightbox/);
  assert.match(source, /Escape/);
  assert.match(source, /target\s*=\s*['"]_blank['"]/);
});
