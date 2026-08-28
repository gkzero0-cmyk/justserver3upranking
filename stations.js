const CACHE_TTL = 15 * 60 * 1000;
const MAX_IDS = 500;
const CONCURRENCY = 8;
const cache = global.__soopAudienceCache || (global.__soopAudienceCache = new Map());

function safeId(v) {
  const id = String(v || '').trim();
  return /^[a-zA-Z0-9_-]{1,40}$/.test(id) ? id : '';
}
function toNum(v){
  if(typeof v==='number' && Number.isFinite(v)) return v;
  const m=String(v??'').replace(/,/g,'').match(/-?\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : null;
}
function decodeHtml(s=''){
  return String(s).replace(/&quot;/g,'"').replace(/&#34;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
}
function parseAudienceFromPage(html){
  const raw=decodeHtml(html);
  const candidates=[
    /애청자\s*(?:수)?\s*[:：]?\s*([0-9][0-9,]*)\s*명?/i,
    /(?:label|title|name)["']?\s*[:=]\s*["']애청자["'][\s\S]{0,180}?(?:count|cnt|value)["']?\s*[:=]\s*["']?([0-9][0-9,]*)/i,
    /(?:count|cnt|value)["']?\s*[:=]\s*["']?([0-9][0-9,]*)["']?[\s\S]{0,180}?(?:label|title|name)["']?\s*[:=]\s*["']애청자["']/i,
    /["']애청자["']\s*[,}]?[\s\S]{0,120}?["'](?:count|cnt|value)["']\s*:\s*([0-9][0-9,]*)/i
  ];
  for(const re of candidates){ const m=raw.match(re); if(m){ const n=toNum(m[1]); if(Number.isFinite(n) && n>=0) return {count:n,source:'station_page_label'}; } }
  return null;
}

const KEY_PRIORITY = [
  'favorite_user_cnt','favorite_user_count','favorite_cnt','favorite_count',
  'follower_cnt','follower_count','followers','station_favorite_cnt','station_favorite_count',
  'bookmark_cnt','bookmark_count','audience_cnt','audience_count','listener_cnt','listener_count'
];
function findAudienceField(obj, path=''){
  if(!obj || typeof obj!=='object') return null;
  const entries=[];
  (function walk(v,p,depth){
    if(!v || typeof v!=='object' || depth>5) return;
    for(const [k,val] of Object.entries(v)){
      const full=p?`${p}.${k}`:k, lk=k.toLowerCase();
      if(KEY_PRIORITY.includes(lk)){
        const n=toNum(val); if(Number.isFinite(n) && n>=0) entries.push({count:n,source:`channel_api:${full}`,rank:KEY_PRIORITY.indexOf(lk)});
      }
      // Important: fan_cnt is intentionally NOT considered an audience metric.
      if(val && typeof val==='object') walk(val,full,depth+1);
    }
  })(obj,path,0);
  entries.sort((a,b)=>a.rank-b.rank);
  return entries[0] || null;
}

async function fetchText(url, referer){
  const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),6500);
  try{
    const res=await fetch(url,{headers:{accept:'text/html,application/xhtml+xml,application/json,text/plain,*/*','accept-language':'ko-KR,ko;q=0.9,en;q=0.8','user-agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/151 Safari/537.36',referer:referer||'https://www.sooplive.com/'},signal:controller.signal,redirect:'follow'});
    if(!res.ok) return {ok:false,status:res.status,text:''};
    return {ok:true,status:res.status,text:await res.text()};
  }finally{clearTimeout(timer)}
}

async function fetchAudience(userId){
  const cached=cache.get(userId);
  if(cached && Date.now()-cached.ts<CACHE_TTL) return cached.value;
  let result={count:null,source:'unknown',checked:true};
  const stationUrl=`https://www.sooplive.com/station/${encodeURIComponent(userId)}`;
  try{
    // 1) The public station page is the source of truth: read the number next to the Korean label "애청자".
    const page=await fetchText(stationUrl,stationUrl);
    if(page.ok){ const parsed=parseAudienceFromPage(page.text); if(parsed) result={...parsed,checked:true}; }

    // 2) Fallback to the modern channel API, but never use fan_cnt.
    if(result.count===null){
      const api=await fetchText(`https://api-channel.sooplive.co.kr/v1.1/channel/${encodeURIComponent(userId)}/station`,stationUrl);
      if(api.ok){
        try{ const json=JSON.parse(api.text); const parsed=findAudienceField(json); if(parsed) result={...parsed,checked:true}; }catch(_){ }
      }
    }
  }catch(_){ /* leave unknown */ }
  cache.set(userId,{ts:Date.now(),value:result});
  return result;
}

async function mapLimit(items,limit,worker){
  const out=new Array(items.length); let cursor=0;
  async function run(){ while(true){ const i=cursor++; if(i>=items.length)return; out[i]=await worker(items[i]); } }
  await Promise.all(Array.from({length:Math.min(limit,items.length)},run)); return out;
}

module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','no-store, max-age=0'); res.setHeader('Access-Control-Allow-Origin','*');
  if(req.method==='OPTIONS') return res.status(204).end();
  const ids=[...new Set(String(req.query.ids||'').split(',').map(safeId).filter(Boolean))].slice(0,MAX_IDS);
  if(!ids.length) return res.status(200).json({ok:true,stations:{},metric:'station_audience',label:'애청자'});
  try{
    const pairs=await mapLimit(ids,CONCURRENCY,async id=>[id,await fetchAudience(id)]);
    return res.status(200).json({ok:true,stations:Object.fromEntries(pairs),metric:'station_audience',label:'애청자',fan_cnt_excluded:true,fetchedAt:new Date().toISOString()});
  }catch(e){ return res.status(502).json({ok:false,error:e?.message||String(e)}); }
};
