# FRONTEND.md — 프론트엔드 개발 가이드

---

## 기술 스택

| 레이어 | 표준 |
|--------|------|
| Framework | Next.js (App Router) |
| Styling | Tailwind CSS |
| Language | TypeScript |
| Package Manager | npm |

## 프로젝트 구조 (노드 앱 기준)

```
project_[node_name]/
├── _context/                          ← 노드 전용 컨텍스트 (Protocol + 디자인)
│   ├── protocol-[node_name]-v[N].txt  ← Principle Protocol
│   ├── [knowledge-doc].txt            ← Knowledge Docs (선택)
│   ├── brand-guidelines.md            ← 노드 브랜드 아이덴티티
│   ├── business-context.md            ← 비즈니스 컨텍스트
│   └── design-style-guide-node.md     ← 노드별 디자인 정책 (Part B — /shape 후 작성)
├── app/
│   ├── api/
│   │   └── generate/
│   │       └── route.ts   ← Protocol 주입 + AI API 호출
│   ├── page.tsx           ← 메인 UI
│   └── layout.tsx
├── components/
├── lib/
│   └── buildSystemPrompt.ts  ← Protocol 조합 유틸리티
└── public/
```

## Protocol 주입 유틸리티

```typescript
// lib/buildSystemPrompt.ts
export function buildSystemPrompt(
  principleProtocol: string,
  knowledgeDocs: string[] = []
): string {
  return [principleProtocol, ...knowledgeDocs].join("\n\n---\n\n");
}
```

## API Route 표준 패턴

```typescript
// app/api/generate/route.ts
import { GoogleGenAI } from "@google/genai";
import { buildSystemPrompt } from "@/lib/buildSystemPrompt";
import { principleProtocol } from "@/lib/protocol";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(request: Request) {
  const { userInput } = await request.json();

  const response = await ai.models.generateContent({
    model: "gemini-2.5-pro",
    config: { systemInstruction: buildSystemPrompt(principleProtocol) },
    contents: [{ role: "user", parts: [{ text: userInput }] }],
  });

  return Response.json({ result: response.text });
}
```

## 코딩 원칙

- Protocol 내용을 코드 레이어에서 하드코딩하지 않음 — Protocol 파일에서만 관리
- `systemInstruction` 파라미터 null 방어 코드 필수
- 에러 응답은 사용자에게 명확한 메시지로 표시
- 워터마크는 클라이언트 사이드에서 자동 적용

## 디자인 시스템

UI 구현 시 반드시 아래 순서로 문서를 참조한다. 각 문서는 하위 문서보다 우선한다.

| 우선순위 | 문서 | 역할 |
|----------|------|------|
| 1 | `docs/design-style/DESIGN.md` | 브랜드 원칙, 네이밍 컨벤션, UI 원칙 |
| 2 | `docs/design-style/design-style-guide-CAI.md` | 색상·폰트·간격·컴포넌트·인터랙션 전체 토큰 스펙 |
| 3 | `project_[node]/_context/design-style-guide-node.md` | 노드별 예외사항 (Part B — PART A보다 우선) |

**CAI 디자인 시스템 핵심 제약 (코드에 직접 적용):**
- 색상: Hex 그레이스케일 7색만 (`#000000` ~ `#FFFFFF`). 임의 색상 사용 금지.
- 폰트: `Bebas Neue` (헤더·CTA) + `Pretendard` (본문) 고정. 다른 폰트 로드 금지.
- 간격: `space-1(8px)` ~ `space-8(64px)` 토큰만 사용. 임의 px 값 금지.
- 높이: CTA 버튼 `52px` / 인터랙티브 요소 최솟값 `44px`.
- 결과물 출력 시 "참고용 시각화" 워터마크 필수.

> AGENT C 디자인 에이전트 운용 절차: `docs/references/loop-frontend-design-agent.txt`

---

`COPYRIGHTS 2026. CRE-TE CO.,LTD. ALL RIGHTS RESERVED.`
