# 배관노트

소규모 배관 설비 업체를 위한 서버 저장형 PC·모바일 업무관리 MVP.

문의 접수 → 현장 확인 → 견적·고객 승인 → 작업 배정 → 자재 사용 → 완료·청구·정산을 연결합니다.
추가 작업 승인 누락, 자재 중복·초과 예약, 작업팀 일정 충돌, 청구 누락을 탐지하고 관련 저장을 차단합니다.

## 제출 자료
- [사업 기획서 및 검증 보고서](docs/사업기획서-검증보고서.pdf)
- [초기 업무 규칙 테스트 결과](docs/업무규칙-테스트결과-2026-11-01.txt)
- [초기 서버 통합 테스트 결과](docs/API-테스트결과-2026-11-01.txt)

위 보고서와 테스트 기록은 2026-11-01 제출 버전 기준입니다.

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
- 청구서·입금은 내부 관리용 수기 기록. 결제·세금계산서 연동 없음
- 직원별 권한, 업체·작업팀·자재 마스터 편집, 사진 첨부, 오프라인 사용은 후속 범위
- JSON 백업 내보내기 지원. 복원 화면은 미구현

## 개발 참고
- 예시 데이터는 가상의 현장 7건이며 처음 로그인한 계정에 생성됩니다.
- 로컬 개발 DB와 배포 DB는 별개입니다. 기존 로컬 DB에 초기 생성 마이그레이션을 중복 적용하지 마세요.
- `.openai/hosting.json`은 기존 Sites 배포 식별자를 포함합니다. 별도 배포를 구성할 때는 해당 배포 환경에 맞게 설정하세요.
- 의존성·빌드 결과·로컬 DB·환경변수 파일은 Git에서 제외됩니다.
