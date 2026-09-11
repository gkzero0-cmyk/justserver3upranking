# Applicant Detail and Deadline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 신청자 상세 정보 파싱/표시 오류를 고치고 원문·프로필을 추가하며 메인 제목에 2026-09-20 기준 KST D-day를 표시한다.

**Architecture:** 신청 댓글 해석은 `applicant-detail-utils.js`의 순수 함수에서 처리하고 API는 SOOP 방송국 전체 응답을 전달해 중첩 `station.upd.fan_cnt`, `profile_image`, 댓글 원문을 정규화한다. 기존 `index.html`의 상세 렌더 구조는 유지하고, 이미 로드되는 `ranking-utils.js`가 상세 API 응답을 관찰해 이름 왼쪽 프로필과 원문 토글을 보강한다. D-day도 같은 유틸에서 KST 달력 기준으로 계산해 기존 제목 옆에 삽입한다.

**Tech Stack:** Node.js CommonJS/브라우저 UMD 유틸, Vercel Serverless API, vanilla HTML/CSS/JavaScript, `node:test`.

**Spec:** `docs/superpowers/specs/2026-09-11-applicant-detail-dday.md`

## Global Constraints
- 접수 마감일은 `2026-09-20`이다.
- D-day는 `Asia/Seoul` 달력 날짜 기준이다.
- 기존 1초 자동 갱신, 랭킹, 즐겨찾기, 신규 신청자, 댓글 더보기 동작을 유지한다.
- SOOP 방송국 현재 즐겨찾기 수는 `station.upd.fan_cnt`를 우선한다.
- 신청 첨부 사진과 방송국 프로필 사진은 서로 다른 필드로 유지한다.
- 방송국 프로필 사진은 상세 상단 신청자 이름 바로 왼쪽에만 표시한다.

---

### Task 1: 신청 댓글 파서와 방송국 상세 정규화

**Files:**
- Modify: `justserver-up-ranking-github-ready/tests/applicant-detail-utils.test.js`
- Modify: `justserver-up-ranking-github-ready/applicant-detail-utils.js`
- Modify: `justserver-up-ranking-github-ready/tests/applicant-detail-api.test.js`
- Modify: `justserver-up-ranking-github-ready/api/applicant-detail.js`

**Interfaces:**
- Consumes: SOOP 댓글 객체와 방송국 API JSON.
- Produces: `formatApplicationDetail(rawComment, station)` 결과의 `name`, `fanCount`, `message`, `moveInFee`, `originalComment`, `photoUrl`, `profileImageUrl`.

- [x] **Step 1: Write the failing tests**
  - 이모지 기반 4단 신청서, 라벨 변형, 중첩 fan/profile, 원문 보존 테스트를 추가한다.
- [x] **Step 2: Run tests to verify they fail**
  - 기존 파서는 이모지 4단 신청서와 중첩 `fan_cnt`를 처리하지 못하는 실패를 확인한다.
- [x] **Step 3: Write minimal implementation**
  - 장식 접두사를 무시하고 라벨/불릿 신청서를 분리한다.
  - `station.upd.fan_cnt`, `profile_image`, `originalComment`를 정규화한다.
  - API는 전체 station payload를 helper에 전달한다.
- [x] **Step 4: Run tests to verify they pass**
  - applicant detail 관련 11개 테스트 PASS.

### Task 2: 상세 모달 원문·프로필 UI

**Files:**
- Create: `justserver-up-ranking-github-ready/tests/applicant-detail-enhancement-ui.test.js`
- Modify: `justserver-up-ranking-github-ready/ranking-utils.js`

**Interfaces:**
- Consumes: `/api/applicant-detail`의 `profileImageUrl`, `originalComment`.
- Produces: 상세 상단 이름 바로 왼쪽 원형 프로필과 `신청 댓글 원문 보기/접기` 토글.

- [x] **Step 1: Write the failing test**
  - `installApplicantDetailEnhancements`, `profileImageUrl`, 원문 토글 마커를 요구한다.
- [x] **Step 2: Run test to verify it fails**
  - 기존 ranking utility에는 상세 보강 함수가 없어 실패함을 확인한다.
- [x] **Step 3: Write minimal implementation**
  - 상세 API fetch 응답을 관찰하고 `.detail-head`의 이름 왼쪽에 원형 프로필을 삽입한다.
  - 첫 번째 상세 정보 패널에 원문 보기/접기 토글을 삽입한다.
  - 기존 `.detail-photo-wrap` 및 오른쪽 댓글 첨부 이미지 렌더는 건드리지 않는다.
- [x] **Step 4: Run test to verify it passes**
  - 상세 UI 보강 테스트 PASS.

### Task 3: 접수 마감 D-day

**Files:**
- Modify: `justserver-up-ranking-github-ready/tests/ranking-utils.test.js`
- Modify: `justserver-up-ranking-github-ready/tests/server-schedule-card.test.js`
- Modify: `justserver-up-ranking-github-ready/ranking-utils.js`

**Interfaces:**
- Produces: `getKstDdayLabel(targetYmd, nowMs)` → `D-N`, `D-DAY`, `D+N`.

- [x] **Step 1: Write the failing tests**
  - `2026-09-11` KST에서 `2026-09-20`이 `D-9`, 당일 `D-DAY`, 다음 날 `D+1`인지 검증한다.
  - 제목 옆 `deadlineBadge`와 `2026-09-20` 상수를 검증한다.
- [x] **Step 2: Run tests to verify they fail**
  - 기존 utility에 D-day helper와 badge가 없어 실패함을 확인한다.
- [x] **Step 3: Write minimal implementation**
  - KST 달력 날짜 차이 헬퍼를 추가한다.
  - 기존 제목을 `hero-title-row`로 감싸고 `deadlineBadge`를 옆에 삽입한다.
  - 1분 간격으로 날짜 경계를 재확인한다.
- [x] **Step 4: Run test to verify it passes**
  - D-day helper 및 schedule/badge 테스트 PASS.

### Task 4: 회귀 검증 및 배포 준비

**Files:**
- No production file changes expected.

**Interfaces:**
- Consumes: Tasks 1–3의 최종 브랜치.
- Produces: 전체 테스트와 구문 검사 결과.

- [x] **Step 1: Run focused and regression tests**
  - applicant detail, ranking, schedule, new applicant, rank history 관련 로컬 검증 PASS.
- [x] **Step 2: Run syntax checks**
  - `node --check applicant-detail-utils.js`, `ranking-utils.js`, `api/applicant-detail.js` PASS.
- [ ] **Step 3: Review branch diff against the spec and GitHub deployment status**
- [ ] **Step 4: Finish branch and choose integration method**
