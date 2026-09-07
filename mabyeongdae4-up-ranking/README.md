# 마병대 4 실시간 UP 랭킹

SOOP `devil0108` 방송국의 게시글 `206507027` 댓글을 실시간으로 가져와 UP 기준으로 보여주는 비공식 랭킹 페이지입니다.

## 기능
- 1초 자동 갱신
- UP순 / 최신순 / 오래된순
- 100위 커트라인
- 신청자 방송국 프로필 링크와 댓글 바로가기
- 즐겨찾기
- 병사 / 간부 / 미분류 자동 및 수동 분류
- 프리패스 / 프리패스 제외 관리
- 순위 변동 표시
- 로컬 설정 JSON 내보내기 / 불러오기

## 테스트
```bash
npm test
node --check app.js
node --check ranking-utils.js
node --check api/comments.js
```
