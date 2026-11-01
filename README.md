# 배관노트

소규모 배관 설비 업체를 위한 서버 저장형 PC·모바일 업무관리 MVP.

## 실행
1. Node.js 22.13 이상에서 npm ci
2. npm run build
3. node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_flaky_khan.sql
4. npm run dev
5. 표시된 로컬 주소에서 로그인 (로컬 개발 전용 모의 계정)

## 검증
- node --test tests/domain.test.mjs (28개)
- 로컬 서버 실행 후 node --test tests/api.test.mjs (9개)
- node node_modules/typescript/bin/tsc --noEmit
- npm run build
API 테스트는 로컬 테스트 DB에 가상 현장과 입고 기록을 추가합니다. 프로덕션에는 실행하지 않습니다.

## 구현
- lib/domain.ts: 상태 전이, 위험 탐지, 자재 예약, 고객 승인, 청구 대사
- app/api/state/route.ts: 로그인 사용자별 서버 저장, revision 조건부 갱신
- db/schema.ts 및 drizzle/: D1 스키마와 마이그레이션
- app/page.tsx, app/globals.css: 반응형 웹 UI

전체 워크스페이스를 한 행의 JSON 상태로 저장하고 revision 조건부 UPDATE를 사용합니다.
동시 요청은 한 요청만 성공하며 다른 요청은 HTTP 409와 최신 상태를 받습니다.
소규모 검증용 설계이며, 대규모 운영에서는 업무별 테이블·인덱스·감사로그 분리가 필요합니다.

## 범위
- 소유자 전용, 같은 계정의 PC·모바일 데이터 공유
- 가상 초기 현장 7건, 작업팀 3개, 자재 3종
- 승인 기록은 관리자 수기 입력. 전자서명·고객 인증·문자 발송 아님
