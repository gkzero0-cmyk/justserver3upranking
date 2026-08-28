# SOOP 댓글 실시간 UP 랭킹

대상 게시글: https://www.sooplive.com/station/chunbongtv/post/204274449

## Vercel 배포

이 폴더를 Vercel 프로젝트로 배포하면 됩니다. 별도 빌드 단계가 필요 없습니다.

- 정적 UI: `/index.html`, `/style.css`, `/app.js`
- 서버리스 댓글 프록시: `/api/comments`
- 기본 자동 갱신: 5초

SOOP 내부 API 응답 구조가 바뀌면 UP 필드 감지 로직을 조정해야 할 수 있습니다.


- 신청자 방송국의 애청자 수(`fan_cnt`)가 500명 미만이면 별도 표시합니다.
