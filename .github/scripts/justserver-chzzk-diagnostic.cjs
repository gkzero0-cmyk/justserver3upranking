const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const puppeteer = require('puppeteer-core');

function chromePath(){
  for(const p of ['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser']) if(fs.existsSync(p)) return p;
  for(const n of ['google-chrome','chromium']){ try { const p=execFileSync('which',[n],{encoding:'utf8'}).trim(); if(p) return p; } catch{} }
  throw new Error('chrome not found');
}

(async()=>{
  const browser=await puppeteer.launch({headless:true,executablePath:chromePath(),args:['--no-sandbox','--disable-dev-shm-usage']});
  const page=await browser.newPage();
  await page.setViewport({width:1280,height:900});
  const traffic=[];
  page.on('console',m=>console.log('CONSOLE',m.type(),m.text()));
  page.on('pageerror',e=>console.log('PAGEERROR',e.message));
  page.on('request',r=>{if(/applicant-detail|chzzk-channel/.test(r.url())){const x={kind:'request',url:r.url(),method:r.method(),postData:r.postData()||''};traffic.push(x);console.log('TRAFFIC',JSON.stringify(x));}});
  page.on('response',r=>{if(/applicant-detail|chzzk-channel/.test(r.url())){const x={kind:'response',url:r.url(),status:r.status()};traffic.push(x);console.log('TRAFFIC',JSON.stringify(x));}});
  try{
    await page.goto(`https://justserver-up-ranking.vercel.app/?diag=${Date.now()}`,{waitUntil:'domcontentloaded',timeout:60000});
    await page.waitForFunction(()=>document.querySelectorAll('#tbody tr[data-rank]').length>100,{timeout:60000});
    await new Promise(r=>setTimeout(r,2500));
    console.log('FLAGS',await page.evaluate(()=>({v2:!!window.__justserverApplicantDetailV2Installed,verified:!!window.__verifiedChzzkApplicantsHotfixInstalled,rows:document.querySelectorAll('#tbody tr[data-rank]').length})));
    const clicked=await page.evaluate(()=>{const b=[...document.querySelectorAll('button.nick.detail-trigger')].find(n=>String(n.dataset.detailUser||'').trim().toLowerCase()==='flowercrab12');if(!b)return false;b.click();return true;});
    console.log('CLICKED',clicked);
    for(let i=0;i<22;i++){
      await new Promise(r=>setTimeout(r,1000));
      const state=await page.evaluate(()=>({
        open:!!document.querySelector('#applicantDetailModal.open'),
        loading:!!document.querySelector('#applicantDetailBody .detail-loading'),
        error:document.querySelector('#applicantDetailBody .detail-error')?.innerText||'',
        title:document.querySelector('#applicantDetailBody .detail-title')?.textContent||'',
        text:(document.querySelector('#applicantDetailBody')?.innerText||'').slice(0,240),
        chzzk:document.querySelector('[data-platform-stat="chzzk"] .detail-fan')?.textContent||'',
        href:document.querySelector('[data-chzzk-station-link]')?.href||''
      }));
      console.log('STATE',i+1,JSON.stringify(state));
      if(!state.loading && (state.error||state.title)) break;
    }
    console.log('FINAL_TRAFFIC',JSON.stringify(traffic,null,2));
  } finally { await browser.close(); }
})().catch(e=>{console.error(e.stack||e);process.exit(1)});
