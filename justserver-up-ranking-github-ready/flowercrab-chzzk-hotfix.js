(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  if(root){
    root.FlowercrabChzzkHotfix=api;
    root.VerifiedChzzkApplicantsHotfix=api;
    if(root.RankingUtils) api.patchRankingUtils(root.RankingUtils);
    if(root.document&&typeof root.fetch==='function') api.install(root);
  }
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const REFRESH_MS=5*60*1000;
  const VERIFIED_APPLICANTS=Object.freeze({
    ruchar0526:Object.freeze({channelName:'ruchar',channelId:'ca3c2250f11c54ce8ba30fce2da7d837'}),
    luiliuli:Object.freeze({channelName:'루이Luii',channelId:'98d01e25e79820a55d261f3baf19f2eb'}),
    rians2:Object.freeze({channelName:'RianS2',channelId:'2737bfddb6120be9faafc4402678bb42'}),
    changhyon50:Object.freeze({channelName:'자율2025',channelId:'4b2477f3cf709125fa17ece64ad66ffc'}),
    duckchip123:Object.freeze({channelName:'노리668',channelId:'1d694389462927382fbd3b9239792729'}),
    ppokbun:Object.freeze({channelName:'김뽁분',channelId:'15558be4cb5d45e6f6c0d2ee9967b8b4'}),
    jemin18:Object.freeze({channelName:'예준찡',channelId:'e997149e0941aabdefdbaec44ed04a3e'}),
    diana1207:Object.freeze({channelName:'쑤니s',channelId:'e3b1c8a6af2882052ceda4b225a422c0'}),
    flowercrab12:Object.freeze({channelName:'꽃게대장',channelId:'43e3c57feed0478ff9812109a40f9fe8'}),
    diemzleod:Object.freeze({channelName:'김쿠키!',channelId:'f8f9c0d0029b58c79eb6070ff501cac1'})
  });
  const USER_ID='flowercrab12';
  const CHANNEL_ID=VERIFIED_APPLICANTS[USER_ID].channelId;
  const CHANNEL_URL=`https://chzzk.naver.com/${CHANNEL_ID}`;
  const CHANNEL_NAME=VERIFIED_APPLICANTS[USER_ID].channelName;
  const normalizeUserId=v=>String(v||'').trim().toLowerCase();
  const itemUserId=item=>typeof item==='string'?normalizeUserId(item):normalizeUserId(item?.userId??item?.user_id??item?.writer_id??item?.writerId);
  function getVerifiedApplicant(item){
    const userId=itemUserId(item),config=VERIFIED_APPLICANTS[userId];
    return config?{userId,channelName:config.channelName,channelId:config.channelId,channelUrl:`https://chzzk.naver.com/${config.channelId}`}:null;
  }
  const isVerifiedApplicant=item=>Boolean(getVerifiedApplicant(item));
  function patchRankingUtils(utils){
    if(!utils||utils.__verifiedChzzkApplicantsPatched) return utils;
    const original=typeof utils.isChzzkApplicant==='function'?utils.isChzzkApplicant.bind(utils):()=>false;
    utils.isChzzkApplicant=item=>isVerifiedApplicant(item)||original(item);
    utils.countChzzkApplicants=comments=>{
      const applicants=new Set();
      for(const item of comments||[]){
        if(!utils.isChzzkApplicant(item)) continue;
        const userId=String(item?.userId||'').trim();
        const key=userId?`user:${userId}`:(typeof utils.favoriteKey==='function'?utils.favoriteKey(item):'');
        if(key) applicants.add(key);
      }
      return applicants.size;
    };
    utils.__verifiedChzzkApplicantsPatched=true;
    utils.__flowercrabChzzkPatched=true;
    return utils;
  }
  function decorateDetailPayload(payload){
    if(!payload||!payload.ok) return payload;
    const verified=getVerifiedApplicant(payload);
    return verified?{...payload,chzzkStationUrl:verified.channelUrl}:payload;
  }
  function formatCount(value){
    const n=Number(value);
    return Number.isFinite(n)&&n>=0?new Intl.NumberFormat('ko-KR').format(Math.round(n)):'-';
  }
  function install(win){
    if(!win||!win.document||typeof win.fetch!=='function'||win.__verifiedChzzkApplicantsHotfixInstalled) return;
    win.__verifiedChzzkApplicantsHotfixInstalled=true;
    win.__flowercrabChzzkHotfixInstalled=true;
    patchRankingUtils(win.RankingUtils);
    const doc=win.document,nativeFetch=win.fetch.bind(win),states=new Map();
    let renderQueued=false;
    const stateFor=userId=>{if(!states.has(userId))states.set(userId,{loading:false,count:null,matched:false,at:0});return states.get(userId);};
    const requestUrl=input=>typeof input==='string'?input:String(input?.url||input?.href||'');
    function rowForUser(userId){
      for(const trigger of doc.querySelectorAll('.detail-trigger[data-detail-user]')) if(normalizeUserId(trigger.dataset.detailUser)===userId) return trigger.closest('tr[data-rank]');
      return null;
    }
    function ensureFollowerLines(){
      renderQueued=false;
      for(const userId of Object.keys(VERIFIED_APPLICANTS)){
        const stack=rowForUser(userId)?.querySelector('td.followers .follower-stack');
        if(!stack) continue;
        let line=stack.querySelector('.follower-line[data-platform="chzzk"]');
        if(!line){
          line=doc.createElement('div');
          line.className='follower-line loading';
          line.dataset.platform='chzzk';
          line.innerHTML='<span class="follower-platform">치지직</span><span class="follower-value">확인 중…</span>';
          stack.appendChild(line);
        }
        line.dataset.verifiedChzzk=userId;
        const state=stateFor(userId),value=line.querySelector('.follower-value');
        line.classList.toggle('loading',state.loading);
        line.classList.toggle('missing',!state.loading&&!state.matched);
        if(value)value.textContent=state.loading?'확인 중…':state.matched?formatCount(state.count):'-';
      }
    }
    function scheduleRender(){
      if(renderQueued)return;
      renderQueued=true;
      (win.requestAnimationFrame||(cb=>win.setTimeout(cb,0)))(ensureFollowerLines);
    }
    async function loadChannel(userId){
      const verified=getVerifiedApplicant(userId),state=stateFor(userId);
      if(!verified||state.loading||(state.at&&Date.now()-state.at<REFRESH_MS))return;
      state.loading=true;scheduleRender();
      try{
        const params=new URLSearchParams({name:verified.channelName,channelUrl:verified.channelUrl});
        const response=await nativeFetch(`/api/chzzk-channel?${params}`,{cache:'no-store'}),data=await response.json();
        state.matched=Boolean(response.ok&&data?.ok&&data?.matched&&data?.channelId===verified.channelId);
        state.count=state.matched?data.followerCount:null;
      }catch{state.matched=false;state.count=null;}
      finally{state.loading=false;state.at=Date.now();scheduleRender();}
    }
    const loadAllChannels=()=>Object.keys(VERIFIED_APPLICANTS).forEach(loadChannel);
    win.fetch=async(...args)=>{
      const response=await nativeFetch(...args),url=requestUrl(args[0]);
      if(!/\/api\/applicant-detail(?:-v2)?(?:\?|#|$)/.test(url))return response;
      try{
        const payload=await response.clone().json(),decorated=decorateDetailPayload(payload);
        if(decorated===payload||typeof win.Response!=='function')return response;
        const headers=new win.Headers(response.headers);headers.delete('content-length');
        return new win.Response(JSON.stringify(decorated),{status:response.status,statusText:response.statusText,headers});
      }catch{return response;}
    };
    const tbody=doc.getElementById('tbody');
    if(tbody&&win.MutationObserver)new win.MutationObserver(scheduleRender).observe(tbody,{childList:true,subtree:true});
    scheduleRender();loadAllChannels();
  }
  return{VERIFIED_APPLICANTS,USER_ID,CHANNEL_ID,CHANNEL_URL,CHANNEL_NAME,normalizeUserId,getVerifiedApplicant,isVerifiedApplicant,patchRankingUtils,decorateDetailPayload,formatCount,install};
});
