const CHANNEL_ID = 'chunbongtv';
const POST_ID = '204274449';
const SOOP_API = `https://chapi.sooplive.co.kr/api/${CHANNEL_ID}/title/${POST_ID}/comment`;
const POST_URL = `https://www.sooplive.com/station/${CHANNEL_ID}/post/${POST_ID}`;

const CACHE_MS = 850;
let cachedPayload = null;
let cachedAt = 0;
let inflight = null;

function toNumber(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const n = Number(String(value).replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : null;
}

function deepEntries(obj, prefix = '') {
  if (!obj || typeof obj !== 'object') return [];
  const out = [];
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      out.push(...deepEntries(value, path));
    } else {
      out.push([path, value]);
    }
  }
  return out;
}

function pick(obj, keys) {
  for (const key of keys) {
    const parts = key.split('.');
    let cur = obj;
    for (const part of parts) cur = cur?.[part];
    if (cur !== undefined && cur !== null && cur !== '') return cur;
  }
  return null;
}

function extractUp(raw) {
  const explicit = [
    'up_cnt','up_count','upCount','n_up_cnt','n_up_count','memo_up_cnt',
    'recommend_cnt','recommend_count','recommendCount','n_recommend_cnt','n_recommend_count',
    'comment_recommend_cnt','comment_recommend_count','memo_recommend_cnt',
    'like_cnt','like_count','likeCount','n_like_cnt','n_like_count',
    'good_cnt','good_count','goodCount','vote_cnt','vote_count',
    'up','recommend','like'
  ];
  for (const key of explicit) {
    const n = toNumber(pick(raw, [key]));
    if (n !== null) return n;
  }

  // SOOP may rename the field. Prefer numeric keys whose names clearly mean UP/recommend/like.
  const candidates = deepEntries(raw)
    .map(([path, value]) => ({ path, value: toNumber(value) }))
    .filter(x => x.value !== null)
    .filter(x => /(^|[._-])(up|recommend|like|good)([._-]|$)/i.test(x.path))
    .filter(x => !/(reply|comment|view|read|report|block|is_|yn$)/i.test(x.path));
  if (candidates.length) return candidates[0].value;
  return 0;
}

function normalize(raw) {
  const userId = String(pick(raw, [
    'user_id','userId','writer_id','writerId','member_id','memberId','bj_id'
  ]) || '').trim();
  const userNick = String(pick(raw, [
    'user_nick','userNick','nickname','nick_name','writer_nick','writerNick','user_name'
  ]) || userId || '알 수 없음').trim();
  const comment = String(pick(raw, [
    'comment','contents','content','memo','text','comment_content','commentText'
  ]) || '').replace(/<br\s*\/?\s*>/gi, '\n').replace(/<[^>]+>/g, '').trim();
  const regDate = String(pick(raw, [
    'reg_date','regDate','created_at','createdAt','write_date','writeDate','date'
  ]) || '').trim();
  const commentNo = String(pick(raw, [
    'p_comment_no','comment_no','commentNo','comment_id','commentId','no','id'
  ]) || '').trim();
  const explicitCommentUrl = String(pick(raw, [
    'comment_url','commentUrl','link_url','linkUrl','url'
  ]) || '').trim();
  const commentUrl = explicitCommentUrl || (commentNo ? `${POST_URL}?commentNo=${encodeURIComponent(commentNo)}#comment-${encodeURIComponent(commentNo)}` : POST_URL);

  return {
    commentNo,
    commentUrl,
    userId,
    userNick,
    comment,
    regDate,
    up: extractUp(raw)
  };
}

async function fetchPage(page, orderby = 'reg_date') {
  const url = new URL(SOOP_API);
  url.searchParams.set('page', String(page));
  url.searchParams.set('orderby', orderby);

  const res = await fetch(url, {
    headers: {
      'accept': 'application/json, text/plain, */*',
      'accept-language': 'ko-KR,ko;q=0.9,en;q=0.8',
      'origin': 'https://www.sooplive.com',
      'referer': `https://www.sooplive.com/station/${CHANNEL_ID}/post/${POST_ID}`,
      'user-agent': 'Mozilla/5.0 (compatible; JustServerUPRanking/1.0)'
    },
    cache: 'no-store'
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`SOOP API ${res.status}: ${body.slice(0, 160)}`);
  }
  return res.json();
}

async function buildPayload() {
    const first = await fetchPage(1);
    const firstData = Array.isArray(first?.data) ? first.data : [];
    const lastPage = Math.max(1, Number(first?.meta?.last_page || 1));
    const maxPages = Math.min(lastPage, 200);

    const restPages = [];
    // Fetch in small batches to avoid hammering SOOP while keeping refresh fast.
    for (let start = 2; start <= maxPages; start += 8) {
      const batch = [];
      for (let p = start; p < start + 8 && p <= maxPages; p++) batch.push(fetchPage(p));
      const results = await Promise.all(batch);
      restPages.push(...results);
    }

    const raw = firstData.concat(...restPages.map(x => Array.isArray(x?.data) ? x.data : []));
    const comments = raw.map(normalize).filter(x => x.userId || x.userNick || x.comment);

    // Keep one row per top-level comment. If duplicate API rows exist, retain the newest snapshot.
    const seen = new Map();
    comments.forEach((item, index) => {
      const key = item.commentNo || `${item.userId}:${item.regDate}:${index}`;
      seen.set(key, item);
    });

    const payload = {
      ok: true,
      channelId: CHANNEL_ID,
      postId: POST_ID,
      fetchedAt: new Date().toISOString(),
      total: seen.size,
      pages: maxPages,
      comments: [...seen.values()]
    };

    return { payload, raw };
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const now = Date.now();
    let result;
    if (cachedPayload && now - cachedAt < CACHE_MS) {
      result = { payload: cachedPayload, raw: [] };
    } else {
      if (!inflight) {
        inflight = buildPayload().then(built => {
          cachedPayload = built.payload;
          cachedAt = Date.now();
          return built;
        }).finally(() => { inflight = null; });
      }
      result = await inflight;
    }

    const payload = { ...result.payload };
    if (req.query?.debug === '1') {
      payload.debug = {
        firstRawKeys: result.raw[0] ? Object.keys(result.raw[0]) : [],
        firstRaw: result.raw[0] || null
      };
    }
    res.status(200).json(payload);
  } catch (error) {
    res.status(502).json({
      ok: false,
      error: error?.message || 'SOOP 댓글을 불러오지 못했습니다.',
      fetchedAt: new Date().toISOString()
    });
  }
}
