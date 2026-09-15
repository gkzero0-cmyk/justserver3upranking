const test = require('node:test');
const assert = require('node:assert/strict');
const overrides = require('../applicant-detail-manual-overrides.js');

test('wzxc152 detail name is exactly 지맘대로리나', () => {
  assert.equal(overrides.getOverride('wzxc152').name, '지맘대로리나');
  const result = overrides.applyDetailOverride({ ok: true, userId: 'wzxc152', name: '이름은 지맘대로리나', message: 'x', moveInFee: 'y' });
  assert.equal(result.name, '지맘대로리나');
  assert.equal(result.message, 'x');
  assert.equal(result.moveInFee, 'y');
});
