# Execution Plan — Resolve Claude Timeout

> 작성일: 2026-04-22
> 목표: 잘못된 경로 참조 제거를 통한 Claude Code 연결 안정성 확보
> 담당: AGENT A (실행 에이전트)
> **상태: COMPLETED**

---

## 1. 배경 및 문제 분석
- **현상**: Claude Code 실행 시 "Query closed before response received" 에러 발생.
- **원인**: `.claude/settings.json` 및 `settings.local.json`에 현재 시스템에 존재하지 않는 절대 경로(`c:\Users\USER01`)와 네트워크 드라이브(`\\loft254`)가 하드코딩되어 있어, 설정 로드 시 타임아웃 발생.

---

## 2. 해결 단계

### Phase 1: 설정 파일 정형화 (Cleanup)
- [x] `.claude/settings.json` 내의 모든 `USER01` 관련 경로 제거 및 허용 명령어 최소화.
- [x] `.claude/settings.local.json` 내의 네트워크 드라이브(`\\loft254`) 및 타 사용자 경로 참조 전체 제거.
- [x] `permissions.additionalDirectories` 항목 중 유효하지 않은 항목 삭제 → 빈 배열로 초기화.

### Phase 2: 검증 및 재시작
- [x] 두 설정 파일 최종 상태 확인 완료.
- [ ] Claude Code(VSCode Extension) 재시작 필요 (사용자 직접 수행).

---

## 3. 상세 수정 내역

### .claude/settings.json
- 제거: `Edit(/.claude/skills/code-reviewer/**)`, `Bash(wc -l ...)`, `Bash(ls -lah ...)`, `Bash(find ...)`, `Bash(python3 ...)` 등 외부 경로 의존 명령어 전체
- 제거: `additionalDirectories`의 `c:\Users\USER01\Downloads\cai-harness-print`
- 유지: `hooks` (Protocol 감지 훅 — 정상 동작 확인)

### .claude/settings.local.json
- 전면 재작성: 기존 30줄+ 의 무효 경로 참조를 10줄로 축소
- 유지: `npm run *`, `npx tsc *`, `npx impeccable *`, `Skill(critique)` 등 현재 환경에 유효한 항목만 보존

---

## 4. 결과
- 설정 로드 시 불필요한 경로 탐색 및 네트워크 대기 제거.
- Claude Code 재시작 후 연결 안정성 복구 기대.

---

`COPYRIGHTS 2026. CRE-TE CO.,LTD. ALL RIGHTS RESERVED.`
