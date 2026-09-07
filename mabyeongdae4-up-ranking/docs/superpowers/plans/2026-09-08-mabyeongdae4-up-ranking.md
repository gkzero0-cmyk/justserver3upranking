# 마병대 4 실시간 UP 랭킹 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** SOOP 게시글 `devil0108/206507027` 댓글을 실시간 UP 랭킹으로 보여주고 병사/간부, 프리패스, 즐겨찾기, 순위변동을 관리하는 독립 Vercel 사이트를 만든다.

**Architecture:** 정적 HTML/CSS/JS 프론트엔드와 Vercel Serverless Function `/api/comments`를 사용한다. 댓글 데이터는 SOOP 공개 API에서 읽고, 사용자 지정 메타데이터는 `localStorage`에 유지한다.

**Tech Stack:** HTML, CSS, Vanilla JavaScript, Node.js 20 built-in test runner, Vercel Serverless Functions

**Spec:** `docs/superpowers/specs/2026-09-08-mabyeongdae4-up-ranking-design.md`

## Global Constraints
- 기존 `justserver-up-ranking` 배포를 변경하지 않는다.
- 대상 게시글은 `https://www.sooplive.com/station/devil0108/post/206507027`이다.
- 자동 갱신 주기는 1초다.
- 수동 분류는 자동 분류보다 우선한다.
- 로컬 설정은 JSON으로 내보내고 다시 불러올 수 있어야 한다.

---

### Task 1: 랭킹/분류/설정 유틸리티
**Files:**
- Create: `ranking-utils.js`
- Create: `tests/ranking-utils.test.js`

**Interfaces:**
- Produces: `favoriteKey`, `buildRankMap`, `getRankChange`, `parseKstDate`, `countKstToday`, `readFavoriteIds`, `toggleFavoriteId`, `detectApplicantType`, `resolveApplicantType`, `readObjectMap`, `cyclePassState`, `exportSettings`, `importSettings`

- [ ] **Step 1:** 원하는 동작을 검증하는 테스트를 작성한다.
- [ ] **Step 2:** `node --test tests/ranking-utils.test.js`가 신규 함수 미구현으로 실패하는지 확인한다.
- [ ] **Step 3:** 최소 구현을 작성한다.
- [ ] **Step 4:** 테스트를 다시 실행해 통과시킨다.

### Task 2: SOOP 댓글 API 어댑터
**Files:**
- Create: `api/comments.js`
- Create: `tests/comments-api.test.js`

**Interfaces:**
- Produces: `normalize`, `extractUp`, `buildCommentUrl` 테스트 가능 export와 Vercel handler

- [ ] **Step 1:** 채널/게시글 및 정규화 테스트를 작성한다.
- [ ] **Step 2:** 테스트 실패를 확인한다.
- [ ] **Step 3:** `devil0108/206507027` 전용 어댑터를 구현한다.
- [ ] **Step 4:** 테스트를 통과시킨다.

### Task 3: UI와 로컬 관리 기능
**Files:**
- Create: `index.html`
- Create: `styles.css`
- Create: `app.js`
- Create: `tests/index-integration.test.js`

**Interfaces:**
- Consumes: Task 1의 `RankingUtils`
- Produces: 검색/정렬/분류/즐겨찾기/프리패스/내보내기/불러오기 UI

- [ ] **Step 1:** 필수 UI 요소와 문자열을 검사하는 통합 테스트를 작성한다.
- [ ] **Step 2:** 테스트 실패를 확인한다.
- [ ] **Step 3:** 모바일 대응 UI와 동작을 구현한다.
- [ ] **Step 4:** 통합 테스트와 전체 테스트를 통과시킨다.

### Task 4: Vercel 설정과 문서
**Files:**
- Create: `package.json`
- Create: `vercel.json`
- Create: `README.md`

- [ ] **Step 1:** `npm test`, `node --check app.js`, `node --check ranking-utils.js`, `node --check api/comments.js`를 실행한다.
- [ ] **Step 2:** 실패 항목을 수정하고 모두 통과시킨다.
- [ ] **Step 3:** GitHub 기능 브랜치에 `mabyeongdae4-up-ranking/` 경로로 반영한다.
- [ ] **Step 4:** PR을 병합하고 별도 Vercel 프로젝트로 배포한다.
- [ ] **Step 5:** 실제 배포 URL과 `/api/comments`를 확인한다.
