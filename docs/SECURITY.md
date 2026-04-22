# SECURITY.md — 보안 기준 문서

**관장하는 영역:** 보안적으로 무엇을 지켜야 하는가

에이전트가 기능 구현에 집중하다 보면 보안 고려사항을 누락하는 경향이 있습니다. SECURITY.md는 이 프로젝트에서 보안과 관련하여 반드시 준수해야 할 기준들을 명시합니다.

AGENTS.md의 금지 사항이 선언적 규칙(예: "API 키를 노출하지 말 것")이라면, SECURITY.md는 그 규칙들의 상세한 근거와 더 넓은 보안 기준 전체를 제공합니다.

**다루는 내용:**

- 어떤 데이터를 클라이언트에 노출해서는 안 되는지
- 비밀 값(API 키, 토큰 등)의 관리 방식
- 입력 유효성 검증을 어느 레이어에서 어떻게 수행하는지
- 인증과 인가 처리 방식
- 이 프로젝트에서 특히 주의해야 할 알려진 취약점 패턴

---

## API 키 관리

- API 키는 절대 코드에 하드코딩하지 않음
- `.env.local` 파일로 관리, `.gitignore`에 반드시 포함
- Vercel 배포 시 Environment Variables로 설정

```
GEMINI_API_KEY=AIza...
```

## Protocol 파일 보안

- Principle Protocol은 서버 사이드에서만 로드
- 클라이언트(브라우저)에 Protocol 내용 노출 금지
- API Route에서 systemInstruction 파라미터로만 전달

## 입력 검증

- 사용자 입력은 API Route에서 검증 후 처리
- 이미지 업로드: 파일 타입·크기 제한 (JPEG/PNG/WebP, 10MB 이하)
- 텍스트 입력: 길이 제한 (2000자 이하)
- 개인 정보 포함 이미지 업로드 방지 안내

---

`COPYRIGHTS 2026. CRE-TE CO.,LTD. ALL RIGHTS RESERVED.`
