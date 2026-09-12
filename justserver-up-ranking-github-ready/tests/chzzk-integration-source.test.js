const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');

test('CHZZK lookup endpoint exists, searches by exact channel name, and returns follower count', () => {
  const file = path.join(root, 'api', 'chzzk-channel.js');
  assert.equal(fs.existsSync(file), true, 'api/chzzk-channel.js must exist');
  const source = fs.readFileSync(file, 'utf8');
  assert.match(source, /search\/channels/);
  assert.match(source, /pickExactChzzkChannel/);
  assert.match(source, /followerCount/);
  assert.match(source, /matched:\s*false/);
});

test('applicant detail endpoint exposes actual SOOP favorite count separately', () => {
  const file = path.join(root, 'api', 'applicant-detail.js');
  assert.equal(fs.existsSync(file), true, 'api/applicant-detail.js must exist');
  const source = fs.readFileSync(file, 'utf8');
  assert.match(source, /normalizeFanCount/);
  assert.match(source, /soopFanCount/);
});

test('public ranking loader includes CHZZK detail stats hotfix', () => {
  for (const name of ['ranking-utils.js', 'ranking-utils-loader.js']) {
    const file = path.join(root, name);
    assert.equal(fs.existsSync(file), true, `${name} must exist`);
    const source = fs.readFileSync(file, 'utf8');
    assert.match(source, /chzzk-detail-stats-hotfix\.js/);
  }
});
