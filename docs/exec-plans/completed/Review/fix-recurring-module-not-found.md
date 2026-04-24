---
title: Next.js Runtime Error 반복 재발 방지 및 근본 해결 계획
created: 2026-04-24
status: active
---

## 1. 지속 발생 원인 파악 (Root Cause Analysis)

앞서 `.next` 폴더를 삭제하고 클린 빌드를 했음에도 불구하고 `Cannot find module './331.js'` 에러가 계속 반복해서 발생하는 **근본 원인은 OneDrive 동기화**에 있습니다.

현재 프로젝트가 `d:\OneDrive\바탕 화면\CRETE\cai-canvas-v2` 경로에 위치해 있습니다. Next.js는 개발 모드(`npm run dev`)에서 파일 변경이 감지될 때마다 HMR(Fast Refresh)을 위해 `.next/cache/` 폴더 내부의 Webpack 캐시 파일을 실시간으로 쓰고 지웁니다. 
이때 백그라운드에서 실행 중인 **OneDrive 동기화 엔진이 방금 생성된 캐시 파일을 클라우드에 업로드하기 위해 일시적으로 파일 잠금(File Lock)**을 걸게 됩니다. Next.js는 해당 파일을 다시 읽으려다 접근하지 못하고 결국 모듈을 찾지 못했다는 런타임 에러를 뿜게 되는 전형적인 현상입니다.

---

## 2. 해결 계획 (Resolution Plan)

프로젝트 폴더 자체를 OneDrive가 동기화하지 않는 다른 드라이브나 경로(예: `C:\Projects`)로 옮기는 것이 가장 이상적입니다. 하지만 현재 작업 환경을 유지해야 한다면 다음의 방법을 적용하여 원천 차단할 수 있습니다.

### `next.config.ts` Webpack 캐시 비활성화 (권장)
개발 환경에서만 Webpack의 하드 디스크 파일 캐싱 기능을 끄고 **메모리(Memory) 캐싱만 사용**하도록 강제합니다. 이렇게 하면 OneDrive가 락을 걸 파일 자체가 생성되지 않으므로 문제가 완벽히 해결됩니다.

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: { unoptimized: true },
  webpack: (config, { dev }) => {
    // 개발 모드에서 파일 시스템 캐시를 비활성화하여 OneDrive 충돌 방지
    if (dev) {
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;
```

---

## 3. 작업 체크리스트

- [ ] `project_canvas/next.config.ts` 파일에 위 Webpack 캐시 비활성화 코드 적용
- [ ] 구동 중인 개발 서버(`npm run dev`) 완전히 종료
- [ ] 꼬여있는 `project_canvas/.next` 캐시 폴더 다시 한 번 완전히 삭제
- [ ] `npm run dev` 재실행 및 코드 수정/저장을 반복하여 오류 재발 여부 최종 확인
