const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('exact-name CHZZK search checks a wider result window without loosening exact matching', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'api', 'chzzk-channel.js'), 'utf8');
  assert.match(source, /searchUrl\.searchParams\.set\('size',\s*'50'\)/);
  assert.match(source, /pickExactChzzkChannel\(searchPayload,\s*name\)/);
  assert.doesNotMatch(source, /includes\(normalizedName\)|startsWith\(normalizedName\)|levenshtein|similarity/i);
});
