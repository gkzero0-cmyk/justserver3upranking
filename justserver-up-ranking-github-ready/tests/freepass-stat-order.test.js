const test = require('node:test');
const assert = require('node:assert/strict');
const { placeFreepassStatCard } = require('../freepass-filter.js');

test('places freepass card immediately before the auto refresh card', () => {
  const low = { textContent: 'SOOP 즐겨찾기 500 이하 71명' };
  const auto = { textContent: '자동 갱신 1초' };
  const freepass = { textContent: '프리패스 신청자 10명' };
  const stats = {
    children: [low, auto],
    insertBefore(node, reference) {
      const existing = this.children.indexOf(node);
      if (existing >= 0) this.children.splice(existing, 1);
      const index = this.children.indexOf(reference);
      this.children.splice(index >= 0 ? index : this.children.length, 0, node);
    },
    appendChild(node) {
      const existing = this.children.indexOf(node);
      if (existing >= 0) this.children.splice(existing, 1);
      this.children.push(node);
    }
  };

  placeFreepassStatCard(stats, freepass);

  assert.deepEqual(stats.children, [low, freepass, auto]);
});
