# [260424] Phase C — ImageThumbnail 수정 & 프리뷰 바 미표시 수정

**작성일**: 2026-04-24  
**작성자**: AGENT A (Claude)  
**상태**: 완료  
**참조**: 260424-193000-progress.txt Phase C

---

## 배경

Phase A/B 완료 후 사용자가 유보했던 두 가지 버그:
- **C-1**: 로컬 업로드 이미지 썸네일 깨짐
- **C-2**: 생성 후 하단 프리뷰 바가 표시되지 않음

---

## Phase C-1 — ImageThumbnail useMemo → useState+useEffect

### 문제 분석

**파일**: `project.10_print/app/components/sidebar/ImageInsert.tsx` (L131–135)

```typescript
// 현재 코드 (문제 있음)
const url = useMemo(() => URL.createObjectURL(file), [file.name, file.lastModified, file.size])
useEffect(() => {
  return () => URL.revokeObjectURL(url)
}, [url])
```

**근본 원인**:
- React Strict Mode에서 `useMemo`는 캐시 검증을 위해 두 번 실행될 수 있음
- `useMemo`가 재실행되면 이전 blob URL이 revoke되지 않은 채 새 URL이 생성됨
- 렌더 중 URL 생성 → `useEffect` 정리 타이밍 불일치 → 이미 revoke된 URL로 `<img>` 렌더링 가능

**해결책**: `VideoSlot`에서 이미 사용 중인 `useState + useEffect` 패턴으로 통일

```typescript
// 수정 후
const [url, setUrl] = useState<string | null>(null)
useEffect(() => {
  const objectUrl = URL.createObjectURL(file)
  setUrl(objectUrl)
  return () => URL.revokeObjectURL(objectUrl)
}, [file])
```

### 수정 대상 파일 (2곳 동일 수정)

| 파일 | 경로 |
|------|------|
| 소스 | `cai-harness-print/project.10_print/app/components/sidebar/ImageInsert.tsx` |
| 패키지 | `project_canvas/node_modules/@cai-crete/print-components/app/components/sidebar/ImageInsert.tsx` |

---

## Phase C-2 — 프리뷰 바 미표시 수정

### 문제 분석

`PreviewStrip.tsx`는 두 CSS 변수를 사용:

```jsx
style={{
  height: 'var(--preview-h)',   // 정의 없으면 height: auto → 크기 불명
  zIndex: 'var(--z-preview)',   // 정의 없으면 z-index: auto → 스택 순서 불확실
  ...
}}
```

**Canvas `globals.css` 누락 변수 확인**:

| 변수 | Print `globals.css` | Canvas `globals.css` |
|------|---------------------|----------------------|
| `--preview-h` | `10rem` ✅ | 없음 ❌ |
| `--z-preview` | `20` ✅ | 없음 ❌ |

→ Canvas에서 PrintExpandedView를 임베드하면 이 변수들이 정의되지 않아 프리뷰 바가 높이 0 또는 레이어 충돌로 보이지 않음

### 추가 조사 가능 원인

`splitHtmlPages()` 파싱 실패 시 `pages = []` → `PreviewStrip`이 `return null` 처리.
CSS 수정 후에도 미표시 시 `splitHtmlPages` 디버그 로그 추가 필요.

### 수정 대상 파일

**`project_canvas/app/globals.css`** `:root` 블록에 추가:
```css
--preview-h: 10rem;    /* 160px */
--z-preview: 20;       /* 하단 미리보기 스트립 */
```

---

## 체크리스트

- [x] 사전: `package.json` file: 링크 전환 + npm install (심볼릭 링크 확인)
- [x] C-1a: 소스 `ImageInsert.tsx` — `ImageThumbnail` useMemo → useState+useEffect
- [x] C-1b: 패키지는 심볼릭 링크이므로 별도 수정 불필요
- [x] C-2a: Canvas `globals.css` — `--preview-h`, `--z-preview` 추가
- [ ] C-2b: 실제 generate 후 프리뷰 바 표시 확인 (수동)
- [ ] C-2c: (조건부) 여전히 미표시 시 `splitHtmlPages` 디버그 로그 추가

---

`COPYRIGHTS 2026. CRE-TE CO.,LTD. ALL RIGHTS RESERVED.`
