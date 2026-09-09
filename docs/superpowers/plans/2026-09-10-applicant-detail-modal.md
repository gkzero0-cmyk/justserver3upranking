# Applicant Detail Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an on-demand applicant detail popup that shows the applicant name, current SOOP favorite/fan count, parsed application message, move-in-fee agreement text, and attached application image without adding extra SOOP lookups to the 1-second ranking refresh.

**Architecture:** Keep the existing `/api/comments` polling path unchanged. Add a separate `/api/applicant-detail` endpoint called only when a user clicks an applicant name or comment; it finds the target SOOP comment, fetches the applicant station's current `fan_cnt`, parses the application template, and returns one compact detail payload. Add a small shared pure utility module for parsing comment fields and normalizing SOOP attachment URLs, plus a modal UI in `index.html`.

**Tech Stack:** Node.js >=20, Vercel serverless functions, browser HTML/CSS/vanilla JavaScript, SOOP public comment API, legacy-compatible public station JSON endpoint (`bjapi.afreecatv.com`).

**Spec:** Approved in chat on 2026-09-10: option 1, on-demand detail popup; SOOP current favorite/fan count is authoritative with application-declared count as fallback.

## Global Constraints

- Preserve the existing 1-second ranking refresh path and current ranking/favorites/new-applicant behavior.
- Fetch applicant detail only after name/comment activation.
- Favorite star clicks and comment expand/collapse clicks must not open the detail popup.
- Show current SOOP `fan_cnt` when available; fall back to the application-declared count when station lookup fails.
- Show attached comment image when available, otherwise show an explicit no-image state.
- Desktop modal is centered and large; mobile modal fits the viewport.
- Escape all user-provided text before rendering.

---

### Task 1: Applicant detail parsing utilities

**Files:**
- Create: `justserver-up-ranking-github-ready/applicant-detail-utils.js`
- Create: `justserver-up-ranking-github-ready/tests/applicant-detail-utils.test.js`

**Interfaces:**
- Produces: `parseApplicationComment(text, fallbackName)`, `normalizePhotoUrl(photo)`, `normalizeFanCount(value)`, `formatApplicationDetail(rawComment, station)`.

- [ ] **Step 1: Write failing tests** for slash-delimited applications, label-delimited applications, follower-count parsing, attachment URL normalization, and station-count fallback behavior.
- [ ] **Step 2: Run `node --test tests/applicant-detail-utils.test.js` and confirm RED** because `applicant-detail-utils.js` does not exist yet.
- [ ] **Step 3: Implement the minimal pure utility module** using UMD/CommonJS so Node tests and Vercel can require it.
- [ ] **Step 4: Run the utility tests and confirm GREEN.**
- [ ] **Step 5: Commit the utility and tests.**

### Task 2: On-demand applicant detail API

**Files:**
- Create: `justserver-up-ranking-github-ready/api/applicant-detail.js`
- Create: `justserver-up-ranking-github-ready/tests/applicant-detail-api.test.js`

**Interfaces:**
- Consumes: `formatApplicationDetail`, `normalizePhotoUrl` from `applicant-detail-utils.js`.
- Produces: `GET /api/applicant-detail?commentNo=<id>&userId=<id>` JSON with `name`, `userId`, `commentNo`, `fanCount`, `fanCountSource`, `message`, `moveInFee`, `photoUrl`, `commentUrl`, and `stationUrl`.

- [ ] **Step 1: Write failing static/API contract tests** proving the endpoint validates identifiers, uses the SOOP comment API only on demand, reads `fan_cnt` from the station endpoint, and returns normalized detail fields.
- [ ] **Step 2: Run the API test and confirm RED** because the endpoint file does not exist.
- [ ] **Step 3: Implement the endpoint** with a short in-memory cache, batched SOOP page lookup for the target comment, current station lookup, fallback data, no-store response headers, and useful 400/404/502 responses.
- [ ] **Step 4: Run utility + API tests and confirm GREEN.**
- [ ] **Step 5: Commit API and tests.**

### Task 3: Detail modal UI and click behavior

**Files:**
- Modify: `justserver-up-ranking-github-ready/index.html`
- Modify: `justserver-up-ranking-github-ready/tests/index-integration.test.js`

**Interfaces:**
- Consumes: `/api/applicant-detail` response.
- Produces: accessible modal opened from `.detail-trigger` applicant name/comment elements.

- [ ] **Step 1: Add failing integration assertions** for modal markup, `.detail-trigger`, the on-demand endpoint call, loading/error states, Escape/backdrop close behavior, and favorite/comment-toggle exclusion.
- [ ] **Step 2: Run the integration test and confirm RED.**
- [ ] **Step 3: Add modal CSS/HTML/JS** while preserving existing row actions and 1-second polling.
- [ ] **Step 4: Run all tests and syntax checks; confirm GREEN.**
- [ ] **Step 5: Commit UI and tests.**

### Task 4: Final verification and integration

**Files:**
- No new production files.

- [ ] **Step 1: Run `node --test tests/*.test.js`.**
- [ ] **Step 2: Run `node --check applicant-detail-utils.js`, `node --check api/applicant-detail.js`, and extracted inline-script syntax validation for `index.html`.**
- [ ] **Step 3: Compare `main` to `feature/applicant-detail-modal` and inspect every changed file.**
- [ ] **Step 4: Fast-forward `main` only after all checks pass, then re-run fresh verification on the merged state.**
