# 계획서: 로그인 + 계정 기반 라이브러리 시스템

**작성일:** 2026-04-27  
**최종 수정:** 2026-04-27 (Q&A 반영 + 개선사항 업데이트)  
**작성자:** AGENT C (디자인/프론트엔드) + AGENT A (백엔드/인프라)  
**우선순위:** 높음  
**관련 노드:** project_canvas (N01~N07 공통 허브)

---

## 목표

사용자가 CAI 플랫폼에서 생성한 **이미지, 영상**을 계정에 귀속시켜 어느 기기·도메인에서도 조회·재활용할 수 있는 영구 라이브러리 구축. 동일 Supabase 프로젝트 키를 사용하는 모든 노드 앱에서 단일 계정으로 접근 가능(SSO 구조).

---

## 주요 설계 결정 및 근거

### Q&A로 확정된 사항

| 질문 | 결정 |
|------|------|
| fal.ai URL 1시간 만료 | 영상 생성 완료 즉시 서버에서 파일 fetch → Supabase Storage 복사. 이후 fal.ai URL 만료와 무관 |
| 용량 초과 시 | 기존 파일 유지, 신규 업로드 차단. 사용자 1인당 소프트 제한 2GB + 경고 UI 제공 |
| 도메인 미구매 시 | localhost / Vercel URL / 커스텀 도메인 무관. 데이터는 Supabase 프로젝트에 귀속되므로 어느 환경에서든 동일 계정·라이브러리 접근 가능 |
| Google 간편 로그인 | Supabase Auth Google OAuth 사용. Google Cloud Console 앱 등록 + Supabase 대시보드 설정 후 코드 1줄로 동작 |
| 타 노드 앱 이식 | 유틸 파일 복사 + 동일 환경변수 3개 공유로 완성. 같은 Supabase 프로젝트를 바라보는 앱들은 자동으로 같은 사용자 풀 공유 (사실상 SSO) |

### 라이브러리 동작 원칙 (개선사항 반영)

- 라이브러리 탭: **IMAGE / VIDEO** 2개 (문서 제외)
- 라이브러리 접근 위치: **헤더 우측** (라이브러리 아이콘 + 사용자 프로필)
- 캔버스에서 아트보드 삭제 → 라이브러리 항목 **영향 없음** (독립 저장)
- 라이브러리 내 **다운로드 / 삭제** 가능
- 라이브러리 항목 → 캔버스로 **드래그 앤 드랍** → 아트보드 삽입 (필수 구현)

### 외부 개발자 보완 사항 (전부 반영)

| 항목 | 반영 내용 |
|------|---------|
| Middleware matcher 정교화 | 정적 자산(`_next/static`, `_next/image`, `favicon.ico` 등) 제외 matcher 패턴 명시 |
| storage_path 상대 경로 | DB에는 버킷 내 상대 경로만 저장. 실제 URL은 API에서 `createSignedUrl()` 동적 생성 |

---

## 기술 스택

| 영역 | 선택 | 이유 |
|------|------|------|
| **인증** | Supabase Auth | 이메일 + Google OAuth 지원, Next.js 15 공식 통합 |
| **데이터베이스** | Supabase PostgreSQL | RLS로 사용자 데이터 DB 레벨 격리 |
| **파일 스토리지** | Supabase Storage | CDN 내장, 비공개 버킷 + signed URL, Auth 연동 정책 |
| **세션 관리** | `@supabase/ssr` | Next.js App Router 서버 컴포넌트·미들웨어 호환 |

> **선택하지 않은 대안들**
> - Firebase: Firestore 쿼리 기반 과금 — 라이브러리 규모 증가 시 비용 예측 불가
> - NextAuth + 별도 DB: Storage 레이어 별도 구성 필요, 복잡도 증가
> - Clerk: Auth 전용, Storage·DB 별도 연결 필요

---

## 시스템 아키텍처

```
[사용자 브라우저]
        │
        ▼
[project_canvas / Next.js 15 App Router]
        │
        ├── /auth/login         ← 로그인 (이메일 + Google OAuth)
        ├── /auth/signup        ← 회원가입
        ├── /library            ← 라이브러리 페이지 (IMAGE / VIDEO 탭)
        └── / (캔버스)          ← 기존 캔버스 (헤더에 라이브러리·프로필 추가)
        │
        ▼
[app/api/ — Server-Side API Routes]
        │
        ├── /api/library/save          ← 아이템 메타데이터 저장
        ├── /api/library/list          ← 목록 조회 (signed URL 동적 생성)
        ├── /api/library/delete        ← 아이템 + Storage 파일 삭제
        └── /api/library/upload        ← 파일 → Supabase Storage 업로드
        │
        ▼
[Supabase]
        ├── Auth (이메일 / Google OAuth)
        ├── PostgreSQL + RLS (메타데이터)
        └── Storage / library 버킷 (이미지·영상 파일)
```

---

## 데이터베이스 스키마

### `profiles` 테이블
```sql
create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text,
  avatar_url    text,
  storage_used  bigint default 0,   -- 누적 사용 바이트 (용량 관리용)
  created_at    timestamptz default now()
);
alter table profiles enable row level security;
create policy "본인 프로필만 접근" on profiles
  using (auth.uid() = id);
```

### `library_items` 테이블
```sql
create table library_items (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  node_id        text not null,       -- 'N03', 'N05', 'N07' 등
  type           text not null,       -- 'image' | 'video'
  title          text,
  storage_path   text not null,       -- 버킷 내 상대 경로만 저장
                                      -- 예: '{user_id}/images/{item_id}.webp'
  thumbnail_path text,                -- 영상 썸네일 상대 경로
  file_size      bigint,              -- 바이트 단위 (용량 추적용)
  metadata       jsonb default '{}',  -- 노드별 추가 데이터 (프롬프트, 파라미터 등)
  created_at     timestamptz default now()
);
alter table library_items enable row level security;
create policy "본인 라이브러리만 접근" on library_items
  using (auth.uid() = user_id);
```

> **storage_path 설계 원칙:** 풀 URL(`https://xxx.supabase.co/storage/v1/...`) 대신 버킷 내 상대 경로만 저장. 실제 접근 URL은 `list/route.ts`에서 `createSignedUrl(path, 3600)` 호출로 동적 생성. 도메인·버킷 이전 시 DB 레코드 수정 불필요.

### Supabase Storage 버킷 구조
```
library/                      ← 비공개 버킷 (public URL 비활성화)
└── {user_id}/
    ├── images/
    │   └── {item_id}.webp
    └── videos/
        ├── {item_id}.mp4
        └── thumbnails/
            └── {item_id}.webp
```

---

## 구현 Phase

---

### Phase 1: Supabase 프로젝트 설정 및 패키지 설치

> **사용자 직접 수행 필요:** 1-1, 1-2

**체크리스트:**

- [x] **1-1.** Supabase 콘솔에서 프로젝트 생성
  - 프로젝트명: `cai-project10`
  - 리전: `ap-northeast-1` (도쿄, 한국 사용자 기준 최저 지연)
- [x] **1-2.** `.env.local`에 환경변수 추가
  ```
  NEXT_PUBLIC_SUPABASE_URL=https://[project-ref].supabase.co
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=[publishable-key]
  SUPABASE_SERVICE_ROLE_KEY=[service-role-key]    ← NEXT_PUBLIC_ 접두사 없음 (서버 전용)
  ```
- [x] **1-3.** 패키지 설치
  ```bash
  npm install @supabase/supabase-js @supabase/ssr
  ```
- [x] **1-4.** Supabase SQL 에디터에서 스키마 실행 (`profiles`, `library_items`, RLS 정책)
- [x] **1-5.** Storage 버킷 `library` 생성 (비공개, 50MB 제한, MIME 제한)
- [x] **1-7.** Supabase → Authentication → URL Configuration 설정
  - Site URL: `http://localhost:3900`
  - Redirect URLs에 `http://localhost:3900/api/auth/callback` 추가
  - ⚠️ Vercel 배포 시 해당 URL을 배포 도메인으로 추가 등록 필요
- [ ] **1-6.** Google OAuth 설정 (선택)
  - Google Cloud Console → OAuth 앱 생성 → Client ID/Secret 발급
  - Supabase 대시보드 → Authentication → Providers → Google 활성화
  - 승인된 리디렉션 URI: `[SUPABASE_URL]/auth/v1/callback`

---

### Phase 2: Supabase 클라이언트 유틸리티 + 미들웨어

**파일 구조:**
```
project_canvas/
├── middleware.ts              ← 루트 레벨 (세션 갱신 + 보호 경로)
└── lib/
    ├── supabase/
    │   ├── client.ts          ← 브라우저 클라이언트 (싱글턴)
    │   └── server.ts          ← 서버 컴포넌트 / API Route 클라이언트
    └── types/
        └── library.ts         ← LibraryItem, LibraryType 타입
```

**체크리스트:**
- [x] **2-1.** `lib/supabase/client.ts` 작성 (브라우저 싱글턴)
- [x] **2-2.** `lib/supabase/server.ts` 작성 (쿠키 기반 서버 클라이언트)
- [x] **2-3.** `middleware.ts` 작성
  - 세션 쿠키 자동 갱신
  - 보호 경로: `/library`, `/api/library/*`
  - **정적 자산 제외 matcher** (성능 저하 방지):
    ```typescript
    export const config = {
      matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
      ],
    }
    ```
- [ ] **2-4.** `lib/types/library.ts` 작성
  ```typescript
  export type LibraryType = 'image' | 'video'
  export interface LibraryItem {
    id: string
    nodeId: string
    type: LibraryType
    title?: string
    storagePath: string
    thumbnailPath?: string
    fileSize?: number
    metadata: Record<string, unknown>
    createdAt: string
    signedUrl?: string      // API 응답 시 동적 생성, DB 미저장
    thumbnailUrl?: string
  }
  ```

---

### Phase 3: 인증 UI

**신규 파일:**
```
project_canvas/app/
├── auth/
│   ├── login/page.tsx         ← 로그인 (이메일 + Google 버튼)
│   └── signup/page.tsx        ← 회원가입
└── api/auth/callback/
    └── route.ts               ← OAuth 콜백 + 이메일 인증 처리
```

**체크리스트:**
- [ ] **3-1.** 로그인 페이지 (`/auth/login`)
  - 이메일/비밀번호 폼
  - **Google 간편 로그인 버튼** (`supabase.auth.signInWithOAuth({ provider: 'google' })`)
  - "회원가입" 링크
  - 에러 메시지 표시
  - CAI 디자인 시스템 토큰 적용
- [ ] **3-2.** 회원가입 페이지 (`/auth/signup`)
  - 이메일/비밀번호/비밀번호 확인 폼
  - Google 가입 버튼 (로그인과 동일 플로우)
  - 이메일 인증 메일 발송 안내
- [ ] **3-3.** OAuth 콜백 라우트 (`/api/auth/callback/route.ts`)
  - code → session 교환
  - 완료 후 `/` 리디렉션
- [ ] **3-4.** `app/layout.tsx` 서버에서 세션 읽기 통합
- [ ] **3-5.** 미인증 상태에서 `/library` 접근 시 `/auth/login`으로 자동 리디렉션 (미들웨어 처리)

---

### Phase 4: 라이브러리 API Routes

**신규 파일:**
```
project_canvas/app/api/library/
├── upload/route.ts   ← POST: 파일 → Supabase Storage 업로드
├── save/route.ts     ← POST: 메타데이터 DB 저장
├── list/route.ts     ← GET: 목록 조회 + signed URL 생성
└── delete/route.ts   ← DELETE: DB 행 + Storage 파일 삭제
```

**체크리스트:**
- [ ] **4-1.** `upload/route.ts`
  - multipart/form-data 수신
  - 서버에서 MIME 타입 검증 (클라이언트 우회 불가): `image/*`, `video/*`
  - 파일 크기 제한: 이미지 20MB, 영상 500MB
  - 사용자 누적 용량 확인 → **2GB 초과 시 409 에러 + 메시지 반환**
  - Supabase Storage 업로드 → **버킷 내 상대 경로** 반환
  - `profiles.storage_used` 증가 업데이트
- [ ] **4-2.** `save/route.ts`
  - 서버 세션 검증
  - `library_items` INSERT (`storage_path`는 상대 경로만)
- [ ] **4-3.** `list/route.ts`
  - `user_id` 기반 쿼리, `type` 필터 지원 (`image` | `video`)
  - cursor 기반 페이지네이션 (`created_at` 기준)
  - 각 아이템의 `storage_path`로 **`createSignedUrl(path, 3600)` 호출** → `signedUrl` 포함하여 반환
- [ ] **4-4.** `delete/route.ts`
  - `library_items` 행 삭제
  - `storage.remove([storage_path])` 파일 삭제
  - `profiles.storage_used` 감소 업데이트

---

### Phase 5: AI 노드 생성 결과 자동 저장 연동

**fal.ai 영상 URL 만료 대응 전략:**
> fal.ai 영상 생성 완료 시 서버 API Route가 즉시 해당 URL로 파일을 fetch하여 Supabase Storage에 복사. 이후 fal.ai URL 만료와 무관하게 영구 보존.

**체크리스트:**
- [ ] **5-1.** `lib/saveToLibrary.ts` 공통 헬퍼 작성
  ```typescript
  async function saveToLibrary(params: {
    nodeId: string
    type: 'image' | 'video'
    file: Blob | File | string   // string = fal.ai URL (서버에서 fetch)
    title?: string
    metadata?: Record<string, unknown>
  }): Promise<LibraryItem>
  ```
  - `file`이 URL string인 경우 서버에서 fetch 후 Supabase Storage 업로드
- [ ] **5-2.** N03 Image (sketch-to-image) 생성 완료 시 자동 저장 연결
- [ ] **5-3.** N05 Viewpoint 생성 완료 시 자동 저장 연결
- [ ] **5-4.** fal.ai Video 생성 완료 시 **즉시 서버 복사** 후 저장 연결
- [ ] **5-5.** N07 Print PDF/이미지 출력 완료 시 저장 옵션 추가
- [ ] **5-6.** 저장 성공/실패 토스트 알림 (기존 `GeneratingToast` 재활용)
- [ ] **5-7.** 캔버스 아트보드 삭제 시 라이브러리 항목에 **영향 없음** 확인 (독립성 테스트)

---

### Phase 6: 라이브러리 UI 페이지

**헤더 레이아웃:**
```
[CAI 로고]                       [라이브러리 아이콘] [사용자 아바타 ▾]
좌측                              우측
```

**신규 파일:**
```
project_canvas/app/library/
└── page.tsx

project_canvas/components/library/
├── LibraryGrid.tsx        ← 아이템 그리드 (무한 스크롤)
├── LibraryCard.tsx        ← 개별 카드 (이미지/영상 분기)
├── LibraryFilter.tsx      ← 탭: IMAGE | VIDEO
└── LibraryEmptyState.tsx  ← 빈 상태 화면
```

**체크리스트:**
- [ ] **6-1.** 라이브러리 페이지 (`/library`)
  - 서버 컴포넌트로 초기 데이터 로드
  - 탭 필터: **IMAGE / VIDEO** (문서 탭 없음)
  - 정렬: 최신순 / 오래된 순
  - 무한 스크롤 (Intersection Observer)
- [ ] **6-2.** `LibraryCard.tsx`
  - 이미지: 썸네일 미리보기
  - 영상: 썸네일 + 재생 아이콘 오버레이
  - 호버 액션: **다운로드 / 삭제**
  - 삭제 시 확인 다이얼로그
- [ ] **6-3.** 빈 상태 화면
  - "아직 저장된 항목이 없습니다" 안내 + 캔버스 이동 CTA
- [ ] **6-4.** **헤더 우측** 배치
  - 라이브러리 아이콘 버튼 (클릭 시 `/library` 이동)
  - 사용자 아바타 드롭다운 (프로필 / 로그아웃 / 사용 용량 표시)
  - 미로그인 시: "로그인" 버튼
- [ ] **6-5.** 용량 경고 UI: 1.8GB 이상 사용 시 "용량 부족 경고" 배너 표시
- [ ] **6-6.** `/audit` 스킬로 디자인 컴플라이언스 점수 확인 (목표 ≥ 14/20)

---

### Phase 7: 라이브러리 → 캔버스 드래그 앤 드랍 (필수)

> 사용자 요구사항: 라이브러리 항목을 캔버스로 드래그 앤 드랍하면 아트보드로 삽입

**체크리스트:**
- [ ] **7-1.** `LibraryCard`에 `draggable` 속성 + `onDragStart` 핸들러
  - `dataTransfer`에 `{ type: 'library-item', id, signedUrl, itemType }` 직렬화
- [ ] **7-2.** `InfiniteCanvas.tsx`에 `onDrop` 핸들러 추가
  - `dataTransfer`에서 library-item 데이터 파싱
  - 드랍 위치 캔버스 좌표 변환
  - 이미지: 즉시 아트보드 NodeCard 생성
  - 영상: 영상 아트보드 NodeCard 생성 (썸네일 표시)
- [ ] **7-3.** Print 노드 → 라이브러리에서 이미지 다중 선택 연동 (`canvas-print-integration` Phase 6 연계)

---

### Phase 8: 타 노드 앱 이식 가이드

> 동일 Supabase 프로젝트 키를 공유하면 모든 노드 앱이 같은 사용자 풀 + 라이브러리를 공유 (사실상 SSO).

**이식 대상 파일 목록 (복사 후 즉시 동작):**
```
lib/supabase/client.ts
lib/supabase/server.ts
lib/types/library.ts
middleware.ts
app/auth/login/page.tsx
app/auth/signup/page.tsx
app/api/auth/callback/route.ts
lib/saveToLibrary.ts
```

**각 노드 앱 이식 체크리스트:**
- [ ] **8-1.** 위 파일들을 대상 노드 앱(`project_planners`, `project_image` 등)에 복사
- [ ] **8-2.** `npm install @supabase/supabase-js @supabase/ssr` 실행
- [ ] **8-3.** `.env.local`에 동일한 3개 환경변수 복사 붙여넣기
  ```
  NEXT_PUBLIC_SUPABASE_URL=   ← project_canvas와 동일
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=   ← 동일
  SUPABASE_SERVICE_ROLE_KEY=   ← 동일
  ```
- [ ] **8-4.** 해당 노드 앱의 `middleware.ts` matcher 경로 확인 (노드별 보호 경로 조정)
- [ ] **8-5.** 각 노드 생성 결과에 `saveToLibrary()` 연결

> Vercel 배포 시 환경변수는 Vercel 대시보드 → Project Settings → Environment Variables에서 관리. 노드별 프로젝트마다 동일한 3개 키를 등록.

---

### Phase 9: 보안 강화 및 최종 검증

**체크리스트:**
- [ ] **9-1.** Supabase RLS 정책 재검토 (타인 데이터 접근 불가 확인)
- [ ] **9-2.** Storage 버킷 정책: signed URL만 허용, public URL 완전 비활성화
- [ ] **9-3.** `SUPABASE_SERVICE_ROLE_KEY` 클라이언트 번들 미포함 확인 (`NEXT_PUBLIC_` 접두사 절대 사용 금지)
- [ ] **9-4.** 파일 업로드 MIME 타입 서버 검증 (클라이언트 우회 불가)
- [ ] **9-5.** 용량 초과 시 업로드 차단 로직 동작 확인
- [ ] **9-6.** `tsc --noEmit` 에러 0 확인
- [ ] **9-7.** middleware matcher 정적 자산 제외 동작 확인 (불필요한 세션 갱신 없음)
- [ ] **9-8.** 캔버스 아트보드 삭제 후 라이브러리 항목 유지 확인

---

## 구현 순서

| 순서 | Phase | 선행 조건 |
|------|-------|---------|
| 1 | Phase 1 (Supabase 설정) | 사용자 콘솔 작업 필요 |
| 2 | Phase 2 (유틸 + 미들웨어) | Phase 1 완료 |
| 3 | Phase 3 (인증 UI) | Phase 2 완료 |
| 4 | Phase 4 (API Routes) | Phase 2 완료 |
| 5 | Phase 6 (라이브러리 UI) | Phase 3, 4 완료 |
| 6 | Phase 5 (노드 연동) | Phase 4 완료 |
| 7 | Phase 7 (드래그 앤 드랍) | Phase 5, 6 완료 |
| 8 | Phase 8 (이식 가이드) | Phase 1-7 완료 후 문서화 |
| 9 | Phase 9 (보안 검증) | 전체 완료 후 |

---

## 예상 소요 시간

| Phase | 예상 |
|-------|------|
| Phase 1-2 | 1-2시간 |
| Phase 3 | 2-3시간 |
| Phase 4 | 2-3시간 |
| Phase 5 | 1-2시간 |
| Phase 6 | 3-4시간 |
| Phase 7 | 1-2시간 |
| Phase 8 | 0.5시간 |
| Phase 9 | 1시간 |
| **합계** | **11-17시간** |

---

## 사용자 직접 수행 필요 항목

구현 착수 전 아래 2가지가 완료되어야 합니다:

1. **Supabase 프로젝트 생성** (supabase.com 콘솔)
2. **아래 3개 키를 `.env.local`에 주입**
   ```
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
   SUPABASE_SERVICE_ROLE_KEY=
   ```
3. **Google OAuth 앱 등록** (Google Cloud Console) — Phase 1-6 완료 후 진행 가능

---

`COPYRIGHTS 2026. CRE-TE CO.,LTD. ALL RIGHTS RESERVED.`
