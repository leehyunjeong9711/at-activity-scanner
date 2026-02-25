// ── Design Tokens ────────────────────────────────────────────────────
// 모든 JSS 스타일의 단일 소스 — dark/light 분기 팩토리

// ── 폰트 ─────────────────────────────────────────────────────────────
// Pretendard(한글) + Inter(라틴) 조합 — 가독성 최우선
export const font = {
  sans: '"Pretendard Variable", Pretendard, Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  mono: '"JetBrains Mono", "Fira Code", "Cascadia Code", Consolas, monospace',
};

// ── 8px 스페이싱 그리드 ──────────────────────────────────────────────
// 모든 padding / margin / gap 은 이 값만 사용
export const sp = {
  1:  8,   // 0.5rem
  2: 16,   // 1rem
  3: 24,   // 1.5rem
  4: 32,   // 2rem
  5: 40,   // 2.5rem
  6: 48,   // 3rem
  8: 64,   // 4rem
  10: 80,  // 5rem
  12: 96,  // 6rem
} as const;

// ── 보더 반경 ────────────────────────────────────────────────────────
export const radius = {
  xs:   4,
  sm:   6,
  md:   8,
  lg:  12,
  xl:  16,
  xxl: 24,
  full: 9999,
};

// ── 그림자 ───────────────────────────────────────────────────────────
export const shadow = {
  xs:    '0 1px 2px rgba(0,0,0,0.05)',
  sm:    '0 1px 3px rgba(0,0,0,0.10), 0 1px 2px rgba(0,0,0,0.06)',
  md:    '0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.06)',
  lg:    '0 10px 15px rgba(0,0,0,0.10), 0 4px 6px rgba(0,0,0,0.05)',
  xl:    '0 20px 25px rgba(0,0,0,0.10), 0 10px 10px rgba(0,0,0,0.04)',
  // 카드 hover 강조
  card:  '0 8px 24px rgba(0,0,0,0.12)',
  cardDark: '0 8px 32px rgba(0,0,0,0.50)',
  // 모달
  modal: '0 25px 60px rgba(0,0,0,0.5)',
};

// ── SDK 상태 → 배지 색상 팩토리 (Dynamic Styling 핵심) ───────────────
export type SdkStatus = 'WebSDK' | 'at.js' | 'none' | 'unknown';

export const sdkBadgeColor = (status: SdkStatus, dark: boolean) => {
  const map: Record<SdkStatus, { bg: string; text: string; border: string; dot: string }> = {
    'WebSDK': {
      bg:     dark ? 'rgba(16,185,129,0.12)' : '#ecfdf5',
      text:   dark ? '#6ee7b7'               : '#065f46',
      border: dark ? 'rgba(16,185,129,0.30)' : '#a7f3d0',
      dot:    '#10b981',
    },
    'at.js': {
      bg:     dark ? 'rgba(59,130,246,0.12)'  : '#eff6ff',
      text:   dark ? '#93c5fd'                : '#1d4ed8',
      border: dark ? 'rgba(59,130,246,0.30)'  : '#bfdbfe',
      dot:    '#3b82f6',
    },
    'none': {
      bg:     dark ? 'rgba(239,68,68,0.12)'   : '#fef2f2',
      text:   dark ? '#fca5a5'                : '#b91c1c',
      border: dark ? 'rgba(239,68,68,0.30)'   : '#fecaca',
      dot:    '#ef4444',
    },
    'unknown': {
      bg:     dark ? 'rgba(245,158,11,0.12)'  : '#fffbeb',
      text:   dark ? '#fcd34d'                : '#92400e',
      border: dark ? 'rgba(245,158,11,0.30)'  : '#fde68a',
      dot:    '#f59e0b',
    },
  };
  return map[status] ?? map['unknown'];
};

// ── 라이트/다크 색상 팩토리 ──────────────────────────────────────────
export const palette = (dark: boolean) => ({
  bg:           dark ? '#0c0f1a' : '#f8f9fa',
  bgSubtle:     dark ? '#111827' : '#f1f3f5',

  surface:      dark ? '#161d2d' : '#ffffff',
  surfaceHover: dark ? '#1c2539' : '#fafbfc',
  surface2:     dark ? '#1e2a3d' : '#f8fafc',

  border:       dark ? '#2a3547' : '#e5e7eb',
  borderLight:  dark ? '#1f2c3e' : '#f1f3f4',

  text:         dark ? '#f0f4ff' : '#1a1a1a',
  textSub:      dark ? '#94a3b8' : '#6b7280',
  textMuted:    dark ? '#64748b' : '#9ca3af',

  primary:      dark ? '#3b82f6' : '#2563eb',
  primaryHover: dark ? '#60a5fa' : '#1d4ed8',
  primaryBg:    dark ? 'rgba(59,130,246,0.12)' : '#eff6ff',
  primaryText:  dark ? '#93c5fd' : '#1d4ed8',
  primaryBorder:dark ? 'rgba(59,130,246,0.25)' : '#bfdbfe',
  primaryRing:  dark ? 'rgba(59,130,246,0.25)' : 'rgba(37,99,235,0.15)',

  success:        dark ? '#10b981' : '#059669',
  successBg:      dark ? 'rgba(16,185,129,0.10)'  : '#ecfdf5',
  successBorder:  dark ? 'rgba(16,185,129,0.25)'  : '#a7f3d0',
  successText:    dark ? '#6ee7b7' : '#065f46',

  warning:        dark ? '#f59e0b' : '#d97706',
  warningBg:      dark ? 'rgba(245,158,11,0.10)'  : '#fffbeb',
  warningBorder:  dark ? 'rgba(245,158,11,0.25)'  : '#fde68a',
  warningText:    dark ? '#fcd34d' : '#92400e',

  badge: {
    blue:   { bg: dark?'rgba(59,130,246,0.12)'  :'#eff6ff',  text: dark?'#93c5fd':'#1d4ed8', border: dark?'rgba(59,130,246,0.25)' :'#bfdbfe' },
    violet: { bg: dark?'rgba(139,92,246,0.12)'  :'#f5f3ff',  text: dark?'#c4b5fd':'#6d28d9', border: dark?'rgba(139,92,246,0.25)' :'#ddd6fe' },
    emerald:{ bg: dark?'rgba(16,185,129,0.12)'  :'#ecfdf5',  text: dark?'#6ee7b7':'#065f46', border: dark?'rgba(16,185,129,0.25)' :'#a7f3d0' },
    amber:  { bg: dark?'rgba(245,158,11,0.12)'  :'#fffbeb',  text: dark?'#fcd34d':'#92400e', border: dark?'rgba(245,158,11,0.25)' :'#fde68a' },
    slate:  { bg: dark?'rgba(100,116,139,0.12)' :'#f8fafc',  text: dark?'#94a3b8':'#475569', border: dark?'rgba(100,116,139,0.25)':'#e2e8f0' },
  },

  accents: ['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444','#06b6d4'],
});

export type Palette = ReturnType<typeof palette>;
