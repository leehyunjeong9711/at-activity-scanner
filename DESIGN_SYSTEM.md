# Adobe Target Activity Scanner — Design System

> 이 문서는 프로젝트의 모든 UI 결정 사항을 기록합니다.
> 새 기능 추가 / UI 수정 시 **이 문서를 먼저 참고**하여 일관성을 유지해 주세요.

---

## 목차

1. [기술 스택](#1-기술-스택)
2. [파일 구조](#2-파일-구조)
3. [컬러 시스템](#3-컬러-시스템)
4. [타이포그래피](#4-타이포그래피)
5. [스페이싱 (8px 그리드)](#5-스페이싱-8px-그리드)
6. [Border Radius](#6-border-radius)
7. [그림자 (Shadow)](#7-그림자-shadow)
8. [애니메이션](#8-애니메이션)
9. [컴포넌트 패턴](#9-컴포넌트-패턴)
10. [다크 모드 구현 원칙](#10-다크-모드-구현-원칙)
11. [반응형 브레이크포인트](#11-반응형-브레이크포인트)
12. [스타일 작성 규칙](#12-스타일-작성-규칙)

---

## 1. 기술 스택

| 역할 | 라이브러리 | 버전 |
|---|---|---|
| 스타일링 | **React-JSS** (`react-jss`) | `createUseStyles` 기반 |
| 애니메이션 | **Framer Motion** (`framer-motion`) | `motion`, `AnimatePresence` |
| 글로벌 CSS / 리셋 | **Tailwind CSS** | `@layer base` 활용 |
| 테마 변수 | **CSS Custom Properties** | `:root` / `.dark` 분기 |
| 아이콘 | Inline SVG | 외부 아이콘 라이브러리 없음 |

> **JSS를 선택한 이유**: 컴포넌트 props 기반 dynamic styling (accentColor, sdkStatus 등)이 필요하고,
> "Rule is not linked" 경고를 피하기 위해 정적 CSS 변수 + 최소한의 dynamic hook(`link: true`) 구조로 설계되었습니다.

---

## 2. 파일 구조

```
styles/
├── tokens.ts          # 디자인 토큰 (폰트·스페이싱·radius·shadow·색상 팩토리)
└── scanner-styles.ts  # 모든 JSS 스타일 훅 (useXxxStyles 형태로 export)

app/
└── globals.css        # Tailwind base + CSS 변수 전체 정의 (light·dark 분기)

components/
├── scanner-form.tsx   # UI 메인 컴포넌트 (스타일 훅 소비)
├── theme-toggle.tsx   # 다크모드 토글
└── ui/
    └── toast.tsx      # 토스트 알림
```

### 스타일 수정 시 파일 선택 기준

| 수정 내용 | 수정 파일 |
|---|---|
| 색상값 변경 (light/dark) | `app/globals.css` |
| 스페이싱·radius·폰트·shadow 상수 변경 | `styles/tokens.ts` |
| 특정 컴포넌트 레이아웃·스타일 변경 | `styles/scanner-styles.ts` |
| JSX 구조·로직 변경 | `components/scanner-form.tsx` |

---

## 3. 컬러 시스템

### 3-1. 구조 원칙

```
CSS Custom Property (globals.css)
         ↓
const v = { ... } (scanner-styles.ts 내부 참조 맵)
         ↓
JSS style 객체에서 v.surface, v.primary 등으로 사용
```

모든 color 값은 **CSS 변수**로만 정의합니다.
JSS 스타일 안에 `#ffffff` 같은 하드코딩 hex 값을 쓰지 않습니다 (동적 dark 색상 제외).

---

### 3-2. Tailwind / shadcn 기본 토큰 (`globals.css :root / .dark`)

| 토큰 변수 | Light (HSL) | Dark (HSL) | 용도 |
|---|---|---|---|
| `--background` | `210 20% 98%` | `224 71% 4%` | 페이지 전체 배경 |
| `--foreground` | `222 47% 11%` | `213 31% 91%` | 기본 텍스트 |
| `--card` | `0 0% 100%` | `222 47% 8%` | 카드 배경 |
| `--border` | `214 32% 91%` | `216 34% 17%` | 테두리 |
| `--primary` | `221 83% 53%` | `221 83% 60%` | 주요 액션 색 (파란색) |
| `--muted-foreground` | `215 16% 47%` | `215 20% 65%` | 보조 텍스트 |

---

### 3-3. JSS 전용 확장 토큰 (`globals.css --jss-*`)

#### Surface (배경 레이어)

| 변수 | Light | Dark | 용도 |
|---|---|---|---|
| `--jss-surface` | `0 0% 100%` | `222 47% 8%` | 카드 기본 배경 |
| `--jss-surface-hover` | `210 17% 98%` | `222 47% 11%` | 호버 시 배경 |
| `--jss-surface-2` | `210 17% 96%` | `222 47% 13%` | 중첩 배경 (탭 컨테이너 등) |

#### Primary (파란색 계열)

| 변수 | Light | Dark |
|---|---|---|
| `--jss-primary-hover` | `221 83% 40%` | `221 83% 70%` |
| `--jss-primary-bg` | `221 83% 95%` | `221 83% 13%` |
| `--jss-primary-text` | `221 83% 42%` | `221 83% 75%` |
| `--jss-primary-border` | `221 83% 85%` | `221 83% 25%` |
| `--jss-primary-ring` | `rgba(37,99,235,0.15)` | `rgba(59,130,246,0.25)` |

#### Semantic Colors

| 의미 | 변수 접두사 | Light 계열 | Dark 계열 |
|---|---|---|---|
| **성공** (활동 감지) | `--jss-success*` | 에메랄드 그린 | 어두운 에메랄드 |
| **경고** (오류·없음) | `--jss-warning*` | 앰버 오렌지 | 어두운 앰버 |

#### 뱃지 5색 팔레트

| 색 이름 | 변수 접두사 | 주요 용도 |
|---|---|---|
| `blue` | `--jss-badge-blue-*` | Activity ID |
| `violet` | `--jss-badge-violet-*` | Experience ID |
| `emerald` | `--jss-badge-emerald-*` | interact 요청 수 |
| `amber` | `--jss-badge-amber-*` | 경고 상태 |
| `slate` | `--jss-badge-slate-*` | Scope / 기본 |

#### 그림자 토큰

| 변수 | Light | Dark | 용도 |
|---|---|---|---|
| `--jss-card-shadow` | `0 1px 3px rgba(0,0,0,0.10)` | `0 1px 3px rgba(0,0,0,0.30)` | 카드 기본 |
| `--jss-hover-shadow` | `0 4px 6px rgba(0,0,0,0.07)` | `0 4px 12px rgba(0,0,0,0.40)` | 호버 전환 |
| `--jss-card-hover-shadow` | `0 8px 24px rgba(0,0,0,0.12)` | `0 8px 32px rgba(0,0,0,0.50)` | 카드 hover 최종 |

---

### 3-4. SDK 상태 배지 색상 (`tokens.ts sdkBadgeColor`)

| SDK 상태 | 의미 | 색 |
|---|---|---|
| `WebSDK` | AEP Edge / alloy 감지 | **에메랄드 그린** |
| `at.js` | Adobe Target 구버전 | **파란색** |
| `none` | 미설치 | **빨간색** |
| `unknown` | 감지 불분명 | **앰버** |

```typescript
// tokens.ts — sdkBadgeColor(status, dark) 사용 예
const colors = sdkBadgeColor("WebSDK", false);
// → { bg: "#ecfdf5", text: "#065f46", border: "#a7f3d0", dot: "#10b981" }
```

---

### 3-5. 액티비티 카드 액센트 색상

카드 왼쪽 보더에 순환 적용:

```typescript
const ACCENT_COLORS = [
  "#3b82f6",  // blue
  "#8b5cf6",  // violet
  "#10b981",  // emerald
  "#f59e0b",  // amber
  "#ef4444",  // red
  "#06b6d4",  // cyan
];
// 사용: ACCENT_COLORS[index % ACCENT_COLORS.length]
```

---

## 4. 타이포그래피

### 폰트 패밀리 (`tokens.ts`)

```typescript
font.sans = '"Pretendard Variable", Pretendard, Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
font.mono = '"JetBrains Mono", "Fira Code", "Cascadia Code", Consolas, monospace'
```

- **Pretendard** (한글 가독성 최우선) — CDN: `jsdelivr.net/gh/orioncactus/pretendard`
- **Inter** (라틴 보조) — Google Fonts
- `font.mono` → Activity ID, Experience ID, 타이머 등 코드성 데이터에 사용

### 폰트 크기 스케일

| 용도 | 크기 | weight | 적용 위치 |
|---|---|---|---|
| 히어로 타이틀 | `32px` (모바일 `26px`) | `700` | `heroTitle` |
| 카드 제목 | `14px` | `600` | `cardTitle` |
| 섹션 내 제목 | `13px` | `700` | `cardActivityName` |
| 본문 / 버튼 | `13–15px` | `400–500` | 일반 텍스트 |
| 뱃지 / 레이블 | `11px` | `500–600` | `badge`, `infoLabel` |
| 미니 캡션 | `10px` | `400–500` | 버전, 보조 정보 |

### letter-spacing 가이드

| 용도 | 값 |
|---|---|
| 히어로 타이틀 | `-0.03em` |
| 네비게이션 제목 | `-0.02em` |
| 일반 텍스트 | (기본값) |

---

## 5. 스페이싱 (8px 그리드)

**모든 padding / margin / gap 은 8px 단위**를 기본으로 합니다.

```typescript
// tokens.ts — sp 객체
sp[1]  =  8px   // 0.5rem — 아이콘·뱃지 내부 패딩
sp[2]  = 16px   // 1rem   — 카드 내부 간격, 섹션 패딩
sp[3]  = 24px   // 1.5rem — 카드 내부 body 패딩
sp[4]  = 32px   // 2rem   — 메인 컨텐츠 상하 패딩
sp[5]  = 40px   // 2.5rem
sp[6]  = 48px   // 3rem   — 히어로 섹션 상하 패딩
sp[8]  = 64px   // 4rem
sp[10] = 80px
sp[12] = 96px
```

### 레이아웃 핵심 수치

| 영역 | 값 |
|---|---|
| 콘텐츠 최대 폭 | `1152px` |
| 좌우 여백 (패딩) | `16px` |
| 네비게이션 높이 | `56px` |
| 히어로 섹션 패딩 | `48px 16px` |
| 메인 패딩 | `32px 16px` |
| 카드 헤더 패딩 | `20px 24px 12px` |
| 카드 바디 패딩 | `0 24px 20px` |

---

## 6. Border Radius

```typescript
// tokens.ts — radius 객체
radius.xs   =  4px   // 복사 버튼 등 소형 UI
radius.sm   =  6px   // 뱃지, 탭 트리거
radius.md   =  8px   // 검색 버튼
radius.lg   = 12px   // 카드, 배너, 진행 카드
radius.xl   = 16px   // 검색 입력 박스 (searchWrap)
radius.xxl  = 24px
radius.full = 9999   // 알약형 (SDK 배지, 탭 뱃지, 진행바)
```

---

## 7. 그림자 (Shadow)

`tokens.ts`의 `shadow` 객체는 정적 값 (라이트 전용), 다크 모드 그림자는 CSS 변수 사용:

```typescript
shadow.xs  = '0 1px 2px rgba(0,0,0,0.05)'         // 탭 활성 아이템
shadow.sm  = '0 1px 3px rgba(0,0,0,0.10), ...'    // 기본 카드 (라이트 참고값)
shadow.md  = '0 4px 6px rgba(0,0,0,0.07), ...'    // focus-ring 보조
shadow.lg  = '0 10px 15px rgba(0,0,0,0.10), ...'
shadow.xl  = '0 20px 25px rgba(0,0,0,0.10), ...'
shadow.card     = '0 8px 24px rgba(0,0,0,0.12)'   // 카드 hover (라이트)
shadow.cardDark = '0 8px 32px rgba(0,0,0,0.50)'   // 카드 hover (다크)
shadow.modal    = '0 25px 60px rgba(0,0,0,0.5)'   // 모달
```

> 실제 카드에서는 CSS 변수(`--jss-card-shadow`, `--jss-card-hover-shadow`)를 사용하므로
> 라이트/다크 전환이 자동으로 됩니다.

---

## 8. 애니메이션

### Framer Motion 기본 variants

```typescript
// scanner-form.tsx — 공통 재사용
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show:   { opacity: 1, y: 0,
            transition: { type: "spring", stiffness: 260, damping: 22 } },
};

const stagger = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.07, delayChildren: 0.04 } },
};
```

### 전환 시간 원칙

| 대상 | duration | easing |
|---|---|---|
| 배경 / 색상 전환 | `0.25s` | `ease` |
| 카드 hover (shadow) | `0.2s` | `ease` |
| 카드 hover (transform) | `0.22s` | `cubic-bezier(0.34,1.56,0.64,1)` — spring feel |
| 버튼 상태 전환 | `0.15s` | `ease` |
| 진행바 | `0.7s` | `ease-out` |
| 스크린샷 zoom | `0.35s` | `cubic-bezier(0.34,1.56,0.64,1)` |
| 모달 fade | `0.18s` | `ease` |
| 모달 scale | spring (`stiffness: 320, damping: 26`) | |

### JSS 키프레임

```typescript
// shimmer (스켈레톤 로딩)
"@keyframes shimmer": {
  "0%":   { backgroundPosition: "200% 0" },
  "100%": { backgroundPosition: "-200% 0" },
}

// ping (로딩 인디케이터 링)
"@keyframes ping": {
  "75%, 100%": { transform: "scale(2)", opacity: 0 },
}

// dotPulse (SDK 배지 활성 점)
"@keyframes dotPulse": {
  "0%, 100%": { opacity: 1 },
  "50%":      { opacity: 0.45 },
}
```

---

## 9. 컴포넌트 패턴

### 9-1. 카드 (Card)

**기본 구조:**
```
┌─────────────────────────────┐  ← border-radius: 12px
│  cardHeader  (20px 24px 12px패딩) │
│  ─ cardTitle (14px, fw600)   │
│  ─ cardDesc  (12px, muted)   │
├─────────────────────────────┤
│  cardBody   (0 24px 20px 패딩)    │
└─────────────────────────────┘
```

```typescript
// 사용 예
const card = useCardStyles();
<div className={card.card}>
  <div className={card.cardHeader}>
    <h3 className={card.cardTitle}>제목</h3>
    <p className={card.cardDesc}>설명</p>
  </div>
  <div className={card.cardBody}>
    {/* 내용 */}
  </div>
</div>
```

### 9-2. 액티비티 카드 (Dynamic — accentColor)

```typescript
// 카드 왼쪽 컬러 보더가 accentColor props에 따라 동적 변경
const s = useHoverCardStyles({ accentColor: "#3b82f6" });

// hover 시: translateY(-4px) + cardHoverShadow
// 특이사항: { link: true } 옵션 필수
```

### 9-3. 배지 (Badge)

5가지 색상 변형:

```typescript
const bc = useBadgeStyles();
<span className={`${bc.base} ${bc.blue}`}>Activity ID</span>
<span className={`${bc.base} ${bc.violet}`}>Experience ID</span>
<span className={`${bc.base} ${bc.emerald}`}>성공</span>
<span className={`${bc.base} ${bc.amber}`}>경고</span>
<span className={`${bc.base} ${bc.slate}`}>기본/Scope</span>
```

배지 스타일 특성:
- font: `font.mono`
- 크기: `11px`, `padding: 2px 7px`
- `maxWidth: 120px` + `text-overflow: ellipsis`

### 9-4. SDK 상태 배지 (Dynamic)

```typescript
// status: 'WebSDK' | 'at.js' | 'none' | 'unknown'
// dark: boolean (useDark() 훅에서 가져옴)
const s = useSdkBadgeStyles({ status: "WebSDK", dark: false });
<span className={s.badge}>
  <span className={s.dot} />   {/* 애니메이션 점 */}
  WebSDK
  <span className={s.version}>/ 2.19.2</span>
</span>
// 특이사항: { link: true } 옵션 필수
```

### 9-5. 상태 배너 (Banner)

```typescript
const banner = useBannerStyles();

// 성공 (초록)
<div className={banner.successBanner}> ... </div>

// 경고 (노란/오렌지)
<div className={banner.warningBanner}> ... </div>
```

### 9-6. 탭 (Tab)

```typescript
const tabs = useTabStyles();
<div className={tabs.tabList}>
  <button className={`${tabs.tabTrigger} ${isActive ? tabs.tabTriggerActive : ""}`}>
    탭 이름
    <span className={tabs.tabBadge}>3</span>          {/* 파란 숫자 뱃지 */}
    <span className={`${tabs.tabBadge} ${tabs.tabBadgeGreen}`}>5</span>  {/* 초록 뱃지 */}
  </button>
</div>
```

### 9-7. 검색 입력 (Search)

`useHeroStyles` 내 `searchWrap` — focus 시 파란 링 효과:

```typescript
// focus-within 시 자동 적용:
// borderColor: v.primary
// boxShadow: "0 0 0 3px var(--jss-primary-ring), shadow.md"
```

### 9-8. 로딩 (Progress)

```typescript
const loading = useLoadingStyles();
// progressCard → progressHeader → progressLabel + timer
//              → progressTrack → progressBar (width: pct + "%")
//              → skeletonGrid → skeletonCard → skeletonLine (shimmer)
```

### 9-9. 모달 (Screenshot Modal)

```typescript
const modal = useModalStyles();
// overlay (fixed full-screen) → modal (max-width 900px)
//   → img (max-width 100%, border: 1px solid)
//   → caption (제목 + 안내)
//   → closeBtn (우상단)
// 열기: AnimatePresence + motion.div (scale spring 애니메이션)
```

---

## 10. 다크 모드 구현 원칙

### 토글 방식

`document.documentElement.classList.toggle("dark")` + `localStorage.setItem("theme", "dark")`

### 색상 처리 계층

```
1. globals.css의 :root / .dark CSS 변수 → body 배경·텍스트 즉시 전환
2. JSS 스타일에서 CSS 변수 참조 → 리렌더 없이 자동 전환
3. Dynamic JSS hook (useSdkBadgeStyles 등) → dark prop을 React로 전달
```

### 주의사항

- JSS에서 dark/light 분기가 **필요한 경우 → CSS 변수**로 처리 (globals.css)
- 컴포넌트 props 기반 dynamic color가 필요한 경우 → `{ link: true }` 옵션 필수
- `useDark()` 훅으로 현재 테마 감지:
  ```typescript
  function useDark() {
    const [dark, setDark] = useState(false);
    useEffect(() => {
      const check = () => setDark(document.documentElement.classList.contains("dark"));
      check();
      const obs = new MutationObserver(check);
      obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
      return () => obs.disconnect();
    }, []);
    return dark;
  }
  ```
- 다크 모드 초기 깜빡임 방지를 위해 `app/layout.tsx` `<head>`에 인라인 스크립트 포함

---

## 11. 반응형 브레이크포인트

JSS 미디어 쿼리 형식:

```typescript
"@media (max-width: 1024px)": { gridTemplateColumns: "repeat(2, 1fr)" },
"@media (max-width: 640px)":  { gridTemplateColumns: "1fr" },
"@media (max-width: 640px)":  { fontSize: 26 },  // heroTitle
```

| 브레이크포인트 | 적용 변경 |
|---|---|
| `≤ 1024px` | 액티비티 카드 그리드: 3열 → 2열 |
| `≤ 640px` | 액티비티 카드 그리드: 2열 → 1열, 히어로 타이틀 26px |

---

## 12. 스타일 작성 규칙

### DO ✅

```typescript
// 1. CSS 변수로 색상 참조
background: v.surface,       // ✅ 다크 자동 대응
color: v.text,               // ✅

// 2. tokens.ts 상수 사용
borderRadius: radius.lg,     // ✅ (= 12)
padding: `${sp[3]}px`,       // ✅ (= 24px)
fontFamily: font.sans,       // ✅

// 3. 접두사 필요한 CSS 속성은 camelCase + 벤더 접두사
WebkitBackdropFilter: "blur(12px)",  // ✅
WebkitBoxOrient: "vertical" as const,  // ✅

// 4. 리터럴 타입이 필요한 값은 as const
flexDirection: "column" as const,    // ✅
position: "fixed" as const,          // ✅
```

### DON'T ❌

```typescript
// 1. 하드코딩 hex
background: "#ffffff",       // ❌ 다크 대응 안 됨
color: "#1a1a1a",            // ❌

// 2. px 숫자 직접 입력
padding: 24,                 // ❌ → sp[3] 사용
borderRadius: 12,            // ❌ → radius.lg 사용

// 3. dynamic hook에 link: true 누락
export const useXxx = createUseStyles<string, Theme>(
  { rule: ({ color }) => ({ background: color }) }
  // ❌ { link: true } 누락 → "Rule is not linked" 경고 발생
);

// 4. JSS에 직접 dark 분기
background: dark ? "#161d2d" : "#ffffff",  // ❌ → CSS 변수로 대체
```

### 새 컴포넌트 스타일 추가 시 체크리스트

- [ ] `scanner-styles.ts`에 `createUseStyles`로 훅 추가
- [ ] 색상은 `v.xxx` (CSS 변수) 참조
- [ ] 수치는 `sp`, `radius`, `shadow`, `font` 상수 사용
- [ ] dynamic props가 있으면 `{ link: true }` 추가
- [ ] globals.css에 새 CSS 변수 필요 시 `:root`과 `.dark` **양쪽** 모두 추가
- [ ] 반응형 필요 시 JSS 미디어 쿼리 형식으로 추가

---

## 부록: JSS 훅 목록

| 훅 | 파일 | 제공하는 클래스 | Dynamic props |
|---|---|---|---|
| `useLayoutStyles` | scanner-styles.ts | wrapper, navbar, navInner, navBrand, navLogo, navTitle, main | — |
| `useHeroStyles` | scanner-styles.ts | hero, heroInner, heroContent, heroTitle, heroSub, searchWrap, searchIcon, searchInput, searchBtn | — |
| `useCardStyles` | scanner-styles.ts | card, cardHeader, cardTitle, cardDesc, cardBody | — |
| `useLoadingStyles` | scanner-styles.ts | progressCard, progressBar, skeletonCard, skeletonLine, ... | — |
| `useBannerStyles` | scanner-styles.ts | successBanner, warningBanner, bannerIcon, bannerTitle, bannerBody, ... | — |
| `useTabStyles` | scanner-styles.ts | tabList, tabTrigger, tabTriggerActive, tabBadge, tabBadgeGreen, tabContent | — |
| `useActivityStyles` | scanner-styles.ts | grid, card, cardActivityName, infoRow, infoLabel, copyBtn, emptyState | — |
| `useBadgeStyles` | scanner-styles.ts | base, blue, violet, emerald, amber, slate | — |
| `useScreenshotStyles` | scanner-styles.ts | imgWrap, screenshot, tooltip | — |
| `useDebugStyles` | scanner-styles.ts | stack, rowBadges, monoBlock, urlList, urlItem, urlItemHighlight, ... | — |
| `useSdkBadgeStyles` | scanner-styles.ts | badge, dot, version | `{ status, dark }` ⚠️ |
| `useHoverCardStyles` | scanner-styles.ts | card, header, activityName, expName, body, infoRow, label, copyBtn | `{ accentColor }` ⚠️ |
| `useModalStyles` | scanner-styles.ts | overlay, modal, img, caption, closeBtn, thumbWrap, thumbImg, ... | — |

> ⚠️ = `{ link: true }` 옵션 포함, dynamic props 전달 필수

---

*최종 업데이트: 2026-02-25*
*작성 기준 브랜치: `main`*
