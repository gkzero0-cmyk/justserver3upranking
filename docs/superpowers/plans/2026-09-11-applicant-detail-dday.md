# Applicant Detail and Deadline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 신청자 상세 정보 파싱/표시 오류를 고치고 원문·프로필을 추가하며 메인 제목에 2026-09-20 기준 KST D-day를 표시한다.

**Architecture:** 신청 댓글 해석은 `applicant-detail-utils.js`의 순수 함수에서 처리하고 API는 SOOP 방송국 응답의 중첩 필드와 원문을 정규화해 반환한다. `index.html`은 API가 반환한 구조화 데이터만 렌더링하고 D-day 계산은 재사용 가능한 `ranking-utils.js` 헬퍼로 처리한다.

**Tech Stack:** Node.js CommonJS/브라우저 UMD 유틸, Vercel Serverless API, vanilla HTML/CSS/JavaScript, `node:test`.

**Spec:** `docs/superpowers/specs/2026-09-11-applicant-detail-dday.md`

## Global Constraints
- 접수 마감일은 `2026-09-20`이다.
- D-day는 `Asia/Seoul` 달력 날짜 기준이다.
- 기존 1초 자동 갱신, 랭킹, 즐겨찾기, 신규 신청자, 댓글 더보기 동작을 유지한다.
- SOOP 방송국 현재 즐겨찾기 수는 `station.upd.fan_cnt`를 우선한다.
- 신청 첨부 사진과 방송국 프로필 사진은 서로 다른 필드로 유지한다.

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

- [ ] **Step 1: Write the failing tests**
  - 이모지 기반 4단 신청서가 이름/수치/메시지/입주비로 분리되는 테스트를 추가한다.
  - `즐겨찾기수` 라벨을 인식하는 테스트를 추가한다.
  - `station.upd.fan_cnt`와 `profile_image`를 사용하는 테스트를 추가한다.
  - 원문 문자열이 `originalComment`로 유지되는 테스트를 추가한다.
- [ ] **Step 2: Run tests to verify they fail**
  - Run: `node --test tests/applicant-detail-utils.test.js tests/applicant-detail-api.test.js`
  - Expected: 새 이모지/중첩 fan/profile/original 요구 assertion이 실패한다.
- [ ] **Step 3: Write minimal implementation**
  - 장식 접두사를 무시해 라벨을 찾고 라벨 없는 줄 단위 신청서의 이름/팬수/마지막 입주비를 추론한다.
  - `formatApplicationDetail`에서 `station.upd.fan_cnt`, `station.profile_image`와 원문을 반환한다.
  - API payload에 `originalComment`, `profileImageUrl`을 포함한다.
- [ ] **Step 4: Run tests to verify they pass**
  - Run: `node --test tests/applicant-detail-utils.test.js tests/applicant-detail-api.test.js`
  - Expected: PASS.
- [ ] **Step 5: Commit**
  - Commit message: `fix: normalize applicant detail data`

### Task 2: 상세 모달 원문·프로필 UI

**Files:**
- Modify: `justserver-up-ranking-github-ready/tests/index-integration.test.js`
- Modify: `justserver-up-ranking-github-ready/index.html`

**Interfaces:**
- Consumes: `/api/applicant-detail`의 `profileImageUrl`, `originalComment`, 구조화 상세 필드.
- Produces: 제목 옆 프로필 아바타와 모달 내부 `신청 댓글 원문 보기` 토글.

- [ ] **Step 1: Write the failing test**
  - 상세 모달 렌더 코드에 `profileImageUrl`, `신청 댓글 원문 보기`, 원문 토글 data attribute가 존재하는지 검증한다.
- [ ] **Step 2: Run test to verify it fails**
  - Run: `node --test tests/index-integration.test.js`
  - Expected: 새 UI 문자열/필드 assertion이 실패한다.
- [ ] **Step 3: Write minimal implementation**
  - `.detail-head` 안에 프로필 이미지를 배치한다.
  - 원문 버튼과 숨김 원문 박스를 추가하고 이벤트 위임으로 펼침/접힘을 구현한다.
  - 기존 댓글 첨부 이미지는 오른쪽 패널에 유지한다.
- [ ] **Step 4: Run test to verify it passes**
  - Run: `node --test tests/index-integration.test.js`
  - Expected: PASS.
- [ ] **Step 5: Commit**
  - Commit message: `feat: show applicant profile and original comment`

### Task 3: 접수 마감 D-day

**Files:**
- Modify: `justserver-up-ranking-github-ready/tests/ranking-utils.test.js`
- Modify: `justserver-up-ranking-github-ready/ranking-utils.js`
- Modify: `justserver-up-ranking-github-ready/tests/index-integration.test.js`
- Modify: `justserver-up-ranking-github-ready/index.html`

**Interfaces:**
- Produces: `getKstDdayLabel(targetYmd, nowMs)` → `D-N`, `D-DAY`, `D+N`.

- [ ] **Step 1: Write the failing tests**
  - `2026-09-11` KST에서 `2026-09-20`이 `D-9`, 당일이 `D-DAY`, 다음 날이 `D+1`인지 검증한다.
  - 제목 옆 `deadlineBadge`와 `2026-09-20` 상수가 존재하는지 검증한다.
- [ ] **Step 2: Run tests to verify they fail**
  - Run: `node --test tests/ranking-utils.test.js tests/index-integration.test.js`
  - Expected: D-day 헬퍼/배지 assertion이 실패한다.
- [ ] **Step 3: Write minimal implementation**
  - KST 날짜를 정수 day key로 바꾸어 차이를 계산하는 헬퍼를 추가한다.
  - `<h1>`을 제목+배지 flex wrapper로 바꾸고 초기 렌더 및 날짜 변경 시 배지를 갱신한다.
- [ ] **Step 4: Run test to verify it passes**
  - Run: `node --test tests/ranking-utils.test.js tests/index-integration.test.js`
  - Expected: PASS.
- [ ] **Step 5: Commit**
  - Commit message: `feat: add application deadline countdown`

### Task 4: 회귀 검증 및 배포 준비

**Files:**
- No production file changes expected.

**Interfaces:**
- Consumes: Tasks 1–3의 최종 브랜치.
- Produces: 전체 테스트와 구문 검사 결과.

- [ ] **Step 1: Run full tests**
  - Run: `node --test tests/*.test.js`
  - Expected: 모든 테스트 PASS.
- [ ] **Step 2: Run syntax checks**
  - Run: `node --check applicant-detail-utils.js && node --check ranking-utils.js && node --check api/applicant-detail.js`
  - Expected: exit code 0.
- [ ] **Step 3: Review diff against the spec**
  - 이름/팬수/메시지/입주비, 원문, 프로필, D-day가 모두 포함되고 기존 기능이 제거되지 않았는지 확인한다.
- [ ] **Step 4: Commit any verification-only test adjustments if required**
  - Production behavior 변경 없이 테스트 fixture 정합성만 필요한 경우에 한해 commit한다.
