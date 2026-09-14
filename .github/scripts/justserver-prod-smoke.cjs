const assert = require('node:assert/strict');
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const puppeteer = require('puppeteer-core');

const SITE = 'https://justserver-up-ranking.vercel.app/';

function chromePath() {
  const candidates = [
    process.env.CHROME_BIN,
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser'
  ].filter(Boolean);
  for (const candidate of candidates) if (fs.existsSync(candidate)) return candidate;
  for (const name of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser']) {
    try {
      const found = execFileSync('which', [name], { encoding: 'utf8' }).trim();
      if (found) return found;
    } catch {}
  }
  throw new Error('Chrome/Chromium executable not found');
}

function numberText(value) {
  return Number(String(value || '').replace(/[^0-9.-]/g, ''));
}

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: chromePath(),
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  const detailRequests = [];
  let soopCountRequests = 0;
  page.on('request', req => {
    const url = req.url();
    if (url.includes('/api/applicant-detail')) {
      detailRequests.push({ url, method: req.method(), postData: req.postData() || '' });
    }
    if (url.includes('/api/soop-favorite-counts')) soopCountRequests += 1;
  });
  page.on('pageerror', err => console.error('PAGE_ERROR', err.message));

  async function clickApplicant(userId) {
    const clicked = await page.evaluate(id => {
      const button = [...document.querySelectorAll('button.nick.detail-trigger')]
        .find(node => String(node.dataset.detailUser || '').trim().toLowerCase() === id.toLowerCase());
      if (!button) return false;
      button.click();
      return true;
    }, userId);
    assert.equal(clicked, true, `missing applicant row for ${userId}`);
    await page.waitForFunction(() => {
      const modal = document.querySelector('#applicantDetailModal.open');
      const body = document.getElementById('applicantDetailBody');
      return Boolean(modal && body && !body.querySelector('.detail-loading'));
    }, { timeout: 15000 });
    const isError = await page.$eval('#applicantDetailBody', body => Boolean(body.querySelector('.detail-error')));
    assert.equal(isError, false, `detail modal rendered an error for ${userId}`);
  }

  async function closeDetail() {
    await page.evaluate(() => document.getElementById('applicantDetailClose')?.click());
    await page.waitForFunction(() => !document.querySelector('#applicantDetailModal.open'), { timeout: 5000 });
  }

  try {
    await page.goto(`${SITE}?prodSmoke=${Date.now()}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => document.querySelectorAll('#tbody tr[data-rank]').length > 100, { timeout: 60000 });
    await page.waitForFunction(() => {
      const text = document.getElementById('lowSoopFavoriteCount')?.textContent || '';
      return text && !/확인|조회/.test(text);
    }, { timeout: 60000 });

    const loader = await (await page.goto(`${SITE}ranking-utils.js?prodSmoke=${Date.now()}`, { waitUntil: 'networkidle0', timeout: 30000 })).text();
    for (const script of [
      'applicant-detail-navigation-hotfix.js',
      'applicant-detail-v2-client.js',
      'applicant-detail-content-hotfix.js',
      'chzzk-detail-stats-hotfix.js',
      'flowercrab-chzzk-hotfix.js',
      'applicant-follower-column.js',
      'freepass-filter.js',
      'live-soop-filter-fix.js'
    ]) assert.match(loader, new RegExp(script.replaceAll('.', '\\.')), `loader missing ${script}`);

    await page.goto(`${SITE}?prodSmoke=${Date.now()}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => document.querySelectorAll('#tbody tr[data-rank]').length > 100, { timeout: 60000 });
    await page.waitForFunction(() => {
      const text = document.getElementById('lowSoopFavoriteCount')?.textContent || '';
      return text && !/확인|조회/.test(text);
    }, { timeout: 60000 });

    // 1) Normal SOOP applicant exits spinner and uses the cached-comment POST fast path.
    const normalStart = Date.now();
    await clickApplicant('bureu2002');
    const normalMs = Date.now() - normalStart;
    const normal = await page.evaluate(() => ({
      title: document.querySelector('#applicantDetailBody .detail-title')?.textContent?.trim() || '',
      body: document.getElementById('applicantDetailBody')?.innerText || '',
      photo: document.querySelector('#applicantDetailBody .detail-photo')?.src || '',
      station: [...document.querySelectorAll('#applicantDetailBody .detail-links a')]
        .find(a => /SOOP 방송국/.test(a.textContent || ''))?.href || ''
    }));
    assert.equal(normal.title, '부르');
    assert.match(normal.body, /그냥서버 재밌어보여서/);
    assert.match(normal.body, /입주비 동의함니다/);
    assert.match(normal.photo, /^https?:\/\//);
    assert.match(normal.station, /sooplive\.com\/station\/bureu2002/i);
    const fastRequest = detailRequests.find(req => req.url.includes('/api/applicant-detail-v2') && req.method === 'POST');
    assert.ok(fastRequest, `no POST v2 detail request observed: ${JSON.stringify(detailRequests)}`);
    const fastBody = JSON.parse(fastRequest.postData);
    for (const field of ['commentNo', 'userId', 'userNick', 'applicationComment', 'photoUrl']) {
      assert.ok(Object.hasOwn(fastBody, field), `POST detail body missing ${field}`);
    }
    assert.ok(normalMs < 12000, `normal detail exceeded timeout: ${normalMs}ms`);
    await closeDetail();

    // 2) CHZZK applicant renders split stats and direct station link.
    const chzzkStart = Date.now();
    await clickApplicant('flowercrab12');
    await page.waitForFunction(() => {
      const value = document.querySelector('[data-platform-stat="chzzk"] .detail-fan')?.textContent || '';
      return value && !/조회 중|정보 없음/.test(value);
    }, { timeout: 15000 });
    const flower = await page.evaluate(() => {
      const field = document.querySelector('#applicantDetailBody .detail-field.detail-platform-stats');
      const link = document.querySelector('#applicantDetailBody [data-chzzk-station-link]');
      const prev = document.querySelector('.detail-nav-prev');
      const next = document.querySelector('.detail-nav-next');
      const row = document.querySelector('.detail-nav-row');
      const grid = document.querySelector('#applicantDetailBody .detail-grid');
      return {
        title: document.querySelector('#applicantDetailBody .detail-title')?.textContent?.trim() || '',
        soop: document.querySelector('[data-platform-stat="soop"] .detail-fan')?.textContent?.trim() || '',
        chzzk: document.querySelector('[data-platform-stat="chzzk"] .detail-fan')?.textContent?.trim() || '',
        href: link?.href || '',
        linkText: link?.textContent?.trim() || '',
        gridColumns: field ? getComputedStyle(field).gridTemplateColumns : '',
        navRowBeforeGrid: Boolean(row && grid && (row.compareDocumentPosition(grid) & Node.DOCUMENT_POSITION_FOLLOWING)),
        navPosition: prev ? getComputedStyle(prev).position : '',
        prevText: prev?.textContent?.trim() || '',
        nextText: next?.textContent?.trim() || '',
        photo: document.querySelector('#applicantDetailBody .detail-photo')?.src || ''
      };
    });
    assert.equal(flower.title, '꽃게대장');
    assert.ok(Number.isFinite(numberText(flower.soop)), `invalid SOOP count: ${flower.soop}`);
    assert.ok(numberText(flower.chzzk) > 0, `invalid CHZZK follower count: ${flower.chzzk}`);
    assert.equal(flower.href, 'https://chzzk.naver.com/43e3c57feed0478ff9812109a40f9fe8');
    assert.match(flower.linkText, /치지직 방송국/);
    assert.ok(flower.gridColumns.trim().split(/\s+/).length >= 2, `stats are not split: ${flower.gridColumns}`);
    assert.equal(flower.navRowBeforeGrid, true);
    assert.equal(flower.navPosition, 'static');
    assert.ok(flower.prevText || flower.nextText, 'previous/next labels are both empty');
    assert.ok(Date.now() - chzzkStart < 15000, 'CHZZK detail did not settle in time');

    // 3) Photo zoom opens and Escape closes it.
    await page.click('#applicantDetailBody .detail-photo');
    await page.waitForFunction(() => document.getElementById('detailPhotoLightbox')?.classList.contains('open'), { timeout: 3000 });
    const zoomSrc = await page.$eval('#detailPhotoLightbox img', img => img.src);
    assert.match(zoomSrc, /^https?:\/\//);
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.getElementById('detailPhotoLightbox')?.classList.contains('open'), { timeout: 3000 });
    await closeDetail();

    // 4) Corrected KimCookie verified CHZZK mapping is live in the real detail UI.
    await clickApplicant('diemzleod');
    await page.waitForFunction(() => {
      const link = document.querySelector('#applicantDetailBody [data-chzzk-station-link]');
      const value = document.querySelector('[data-platform-stat="chzzk"] .detail-fan')?.textContent || '';
      return Boolean(link && value && !/조회 중|정보 없음/.test(value));
    }, { timeout: 15000 });
    const kim = await page.evaluate(() => ({
      href: document.querySelector('#applicantDetailBody [data-chzzk-station-link]')?.href || '',
      count: document.querySelector('[data-platform-stat="chzzk"] .detail-fan')?.textContent?.trim() || ''
    }));
    assert.equal(kim.href, 'https://chzzk.naver.com/f8f9c0d0029b58c79eb6070ff501cac1');
    assert.ok(numberText(kim.count) > 0, `KimCookie follower count invalid: ${kim.count}`);
    await closeDetail();

    // 5) URL text in applicant detail becomes a clickable link.
    const urlRowClicked = await page.evaluate(() => {
      const button = [...document.querySelectorAll('button.detail-comment-trigger')]
        .find(node => (node.textContent || '').includes('201207475'));
      if (!button) return false;
      button.click();
      return true;
    });
    if (urlRowClicked) {
      await page.waitForFunction(() => {
        const modal = document.querySelector('#applicantDetailModal.open');
        const body = document.getElementById('applicantDetailBody');
        return Boolean(modal && body && !body.querySelector('.detail-loading'));
      }, { timeout: 15000 });
      const vodHref = await page.evaluate(() => document.querySelector('#applicantDetailBody .detail-inline-link[href*="201207475"]')?.href || '');
      assert.equal(vodHref, 'https://vod.sooplive.com/player/201207475');
      await closeDetail();
    }

    // 6) 500-below filter uses the verified snapshot and does not refetch merely because of a click.
    const before = await page.$eval('#lowSoopFavoriteCount', el => el.textContent.trim());
    const requestsBeforeClick = soopCountRequests;
    const filterClicked = await page.evaluate(() => {
      const button = [...document.querySelectorAll('button')].find(node => (node.textContent || '').trim() === '500 이하');
      if (!button) return false;
      button.click();
      return true;
    });
    assert.equal(filterClicked, true, '500 이하 filter button missing');
    await new Promise(resolve => setTimeout(resolve, 1200));
    const after = await page.$eval('#lowSoopFavoriteCount', el => el.textContent.trim());
    assert.equal(after, before, `500 이하 count changed on click: ${before} -> ${after}`);
    assert.doesNotMatch(after, /확인|조회/);
    assert.equal(soopCountRequests, requestsBeforeClick, '500 이하 click triggered a fresh SOOP-count request');

    // 7) Stat card ordering stays low-SOOP -> freepass -> auto refresh.
    const labels = await page.$$eval('.stats .stat .k', nodes => nodes.map(node => (node.textContent || '').replace(/\s+/g, ' ').trim()));
    const lowIndex = labels.findIndex(x => x.includes('SOOP 즐겨찾기 500 이하'));
    const freeIndex = labels.findIndex(x => x.includes('프리패스 신청자'));
    const autoIndex = labels.findIndex(x => x.includes('자동 갱신'));
    assert.ok(lowIndex >= 0 && freeIndex > lowIndex && autoIndex > freeIndex, `bad stat order: ${JSON.stringify(labels)}`);

    console.log(JSON.stringify({
      ok: true,
      normalDetailMs: normalMs,
      normalFastPath: { method: fastRequest.method, url: fastRequest.url, fields: Object.keys(fastBody) },
      flowercrab: { soop: flower.soop, chzzk: flower.chzzk, href: flower.href },
      kimCookie: kim,
      lowSoopCount: after,
      statOrder: labels
    }, null, 2));
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error.stack || error);
  process.exit(1);
});
