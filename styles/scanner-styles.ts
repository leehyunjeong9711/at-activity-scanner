import { createUseStyles } from "react-jss";
import { font, radius, shadow, sp, sdkBadgeColor, type SdkStatus } from "./tokens";

// ── CSS 변수 참조 (정적 문자열) ──────────────────────────────────────
// 모든 다크/라이트 색상은 globals.css 변수로 처리 → JSS 동적 props 불필요
// → "Rule is not linked" 경고 완전 해소
const v = {
  bg:             "hsl(var(--background))",
  surface:        "hsl(var(--jss-surface))",
  surfaceHover:   "hsl(var(--jss-surface-hover))",
  surface2:       "hsl(var(--jss-surface-2))",
  border:         "hsl(var(--border))",
  text:           "hsl(var(--foreground))",
  textSub:        "hsl(var(--muted-foreground))",
  textMuted:      "hsl(var(--jss-text-muted))",
  primary:        "hsl(var(--primary))",
  primaryHover:   "hsl(var(--jss-primary-hover))",
  primaryBg:      "hsl(var(--jss-primary-bg))",
  primaryText:    "hsl(var(--jss-primary-text))",
  primaryBorder:  "hsl(var(--jss-primary-border))",
  primaryRing:    "var(--jss-primary-ring)",
  success:        "hsl(var(--jss-success))",
  successBg:      "hsl(var(--jss-success-bg))",
  successBorder:  "hsl(var(--jss-success-border))",
  successText:    "hsl(var(--jss-success-text))",
  warning:        "hsl(var(--jss-warning))",
  warningBg:      "hsl(var(--jss-warning-bg))",
  warningBorder:  "hsl(var(--jss-warning-border))",
  warningText:    "hsl(var(--jss-warning-text))",
  cardShadow:     "var(--jss-card-shadow)",
  hoverShadow:    "var(--jss-hover-shadow)",
  cardHoverShadow:"var(--jss-card-hover-shadow)",
  heroGradient:   "var(--jss-hero-gradient)",
} as const;

// ── 레이아웃 (페이지 래퍼, 네비게이션) ───────────────────────────────
export const useLayoutStyles = createUseStyles({
  wrapper: {
    display: "flex",
    minHeight: "100vh",
    flexDirection: "column",
    fontFamily: font.sans,
    background: v.bg,
    color: v.text,
    transition: "background 0.25s ease, color 0.25s ease",
  },

  navbar: {
    position: "sticky",
    top: 0,
    zIndex: 50,
    width: "100%",
    borderBottom: `1px solid ${v.border}`,
    background: "hsl(var(--background) / 0.85)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    transition: "background 0.25s ease, border-color 0.25s ease",
  },

  navInner: {
    margin: "0 auto",
    maxWidth: 1152,
    padding: "0 16px",
    height: 56,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },

  navBrand: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },

  navLogo: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    background: "#2563eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  navTitle: {
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: "-0.02em",
    color: v.text,
  },

  main: {
    margin: "0 auto",
    width: "100%",
    maxWidth: 1152,
    flex: 1,
    padding: "32px 16px",
  },
});

// ── 히어로 섹션 (검색바) ─────────────────────────────────────────────
export const useHeroStyles = createUseStyles({
  hero: {
    borderBottom: `1px solid ${v.border}`,
    background: v.heroGradient,
    padding: "48px 16px",
  },

  heroInner: {
    margin: "0 auto",
    maxWidth: 1152,
    padding: "0 16px",
    width: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },

  heroContent: {
    width: "100%",
    textAlign: "center" as const,
  },

  heroTitle: {
    fontSize: 32,
    fontWeight: 700,
    letterSpacing: "-0.03em",
    color: v.text,
    lineHeight: 1.25,
    margin: "0 0 8px",
    textAlign: "center" as const,
    "@media (max-width: 640px)": { fontSize: 26 },
  },

  heroSub: {
    fontSize: 14,
    color: v.textSub,
    margin: "0 0 28px",
    lineHeight: 1.6,
    textAlign: "center" as const,
  },

  searchWrap: {
    display: "flex",
    alignItems: "center",
    borderRadius: radius.xl,
    border: `1px solid ${v.border}`,
    background: v.surface,
    boxShadow: v.cardShadow,
    transition: "box-shadow 0.2s, border-color 0.2s",
    "&:focus-within": {
      borderColor: v.primary,
      boxShadow: `0 0 0 3px ${v.primaryRing}, ${shadow.md}`,
    },
  },

  searchIcon: {
    marginLeft: 16,
    flexShrink: 0,
    color: v.textMuted,
  },

  searchInput: {
    flex: 1,
    height: 48,
    padding: "0 12px",
    border: "none",
    background: "transparent",
    outline: "none",
    fontSize: 15,
    color: v.text,
    fontFamily: font.sans,
    "&::placeholder": { color: v.textMuted },
  },

  searchBtn: {
    margin: "0 6px 0 0",
    height: 36,
    padding: "0 16px",
    borderRadius: radius.md,
    border: "none",
    background: v.primary,
    color: "#fff",
    fontSize: 13,
    fontWeight: 600,
    fontFamily: font.sans,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 6,
    transition: "background 0.15s, opacity 0.15s",
    "&:hover:not(:disabled)": { background: v.primaryHover },
    "&:disabled": { opacity: 0.5, cursor: "not-allowed" },
  },
});

// ── 카드 기본 (공통 Card 스타일) ──────────────────────────────────────
export const useCardStyles = createUseStyles({
  card: {
    background: v.surface,
    borderRadius: radius.lg,
    border: `1px solid ${v.border}`,
    boxShadow: v.cardShadow,
    overflow: "hidden",
  },

  cardHeader: {
    padding: "20px 24px 12px",
    display: "flex",
    flexDirection: "column" as const,
    gap: 4,
  },

  cardTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: v.text,
    margin: 0,
    lineHeight: 1.4,
  },

  cardDesc: {
    fontSize: 12,
    color: v.textSub,
    margin: 0,
    lineHeight: 1.5,
  },

  cardBody: {
    padding: "0 24px 20px",
  },
});

// ── 로딩 상태 ────────────────────────────────────────────────────────
export const useLoadingStyles = createUseStyles({
  progressCard: {
    background: v.surface,
    borderRadius: radius.lg,
    border: `1px solid ${v.primaryBorder}`,
    boxShadow: v.cardShadow,
    padding: "20px 24px",
  },

  progressHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },

  progressLabel: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 13,
    fontWeight: 500,
    color: v.text,
  },

  pingDot: {
    position: "relative",
    width: 8,
    height: 8,
    flexShrink: 0,
  },

  pingRing: {
    position: "absolute",
    inset: 0,
    borderRadius: "50%",
    background: "#2563eb",
    opacity: 0.7,
    animation: "$ping 1s cubic-bezier(0,0,0.2,1) infinite",
  },

  pingCore: {
    position: "relative",
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#2563eb",
  },

  "@keyframes ping": {
    "75%, 100%": { transform: "scale(2)", opacity: 0 },
  },

  timer: {
    fontFamily: font.mono,
    fontSize: 13,
    color: v.textSub,
    fontVariantNumeric: "tabular-nums",
  },

  progressTrack: {
    height: 6,
    borderRadius: radius.full,
    background: v.surface2,
    overflow: "hidden",
  },

  progressBar: {
    height: "100%",
    borderRadius: radius.full,
    background: "linear-gradient(90deg, #2563eb, #3b82f6)",
    transition: "width 0.7s ease-out",
  },

  skeletonGrid: {
    display: "grid",
    gap: 16,
    gridTemplateColumns: "repeat(3, 1fr)",
    "@media (max-width: 1024px)": { gridTemplateColumns: "repeat(2, 1fr)" },
    "@media (max-width: 640px)":  { gridTemplateColumns: "1fr" },
  },

  skeletonCard: {
    background: v.surface,
    borderRadius: radius.lg,
    border: `1px solid ${v.border}`,
    padding: 24,
  },

  skeletonLine: {
    borderRadius: radius.sm,
    background: `linear-gradient(90deg, ${v.surface2} 25%, ${v.surfaceHover} 50%, ${v.surface2} 75%)`,
    backgroundSize: "200% 100%",
    animation: "$shimmer 1.5s infinite",
  },

  "@keyframes shimmer": {
    "0%":   { backgroundPosition: "200% 0" },
    "100%": { backgroundPosition: "-200% 0" },
  },
});

// ── 상태 배너 ────────────────────────────────────────────────────────
export const useBannerStyles = createUseStyles({
  successBanner: {
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
    padding: "12px 16px",
    borderRadius: radius.lg,
    border: `1px solid ${v.successBorder}`,
    background: v.successBg,
  },

  warningBanner: {
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
    padding: "12px 16px",
    borderRadius: radius.lg,
    border: `1px solid ${v.warningBorder}`,
    background: v.warningBg,
  },

  bannerIcon: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  bannerIconSuccess: {
    background: v.successBg,
    color: v.success,
  },

  bannerIconWarning: {
    background: v.warningBg,
    color: v.warning,
  },

  bannerTitle: {
    fontSize: 13,
    fontWeight: 600,
    margin: "0 0 2px",
  },

  bannerTitleSuccess: { color: v.successText },
  bannerTitleWarning: { color: v.warningText },

  bannerBody: {
    fontSize: 12,
    margin: 0,
    lineHeight: 1.5,
    whiteSpace: "pre-wrap" as const,
    wordBreak: "break-all" as const,
  },

  bannerBodySuccess: { color: v.success },
  bannerBodyWarning: { color: v.warning },
});

// ── 탭 ──────────────────────────────────────────────────────────────
export const useTabStyles = createUseStyles({
  tabList: {
    display: "inline-flex",
    alignItems: "center",
    borderRadius: radius.md,
    background: v.surface2,
    padding: 4,
    gap: 2,
  },

  tabTrigger: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    whiteSpace: "nowrap" as const,
    padding: "6px 12px",
    borderRadius: radius.sm,
    border: "none",
    background: "transparent",
    color: v.textSub,
    fontSize: 13,
    fontWeight: 500,
    fontFamily: font.sans,
    cursor: "pointer",
    transition: "background 0.15s, color 0.15s",
    "&:hover": { background: v.surfaceHover, color: v.text },
  },

  tabTriggerActive: {
    background: v.surface,
    color: v.text,
    boxShadow: shadow.xs,
  },

  tabBadge: {
    marginLeft: 6,
    borderRadius: radius.full,
    padding: "1px 6px",
    fontSize: 10,
    fontWeight: 700,
    background: v.primaryBg,
    color: v.primaryText,
  },

  tabBadgeGreen: {
    background: v.successBg,
    color: v.successText,
  },

  tabContent: {
    marginTop: 16,
  },
});

// ── 액티비티 카드 그리드 ─────────────────────────────────────────────
export const useActivityStyles = createUseStyles({
  grid: {
    display: "grid",
    gap: 16,
    gridTemplateColumns: "repeat(3, 1fr)",
    "@media (max-width: 1024px)": { gridTemplateColumns: "repeat(2, 1fr)" },
    "@media (max-width: 640px)":  { gridTemplateColumns: "1fr" },
  },

  card: {
    background: v.surface,
    borderRadius: radius.lg,
    border: `1px solid ${v.border}`,
    boxShadow: v.cardShadow,
    overflow: "hidden",
    height: "100%",
    transition: "box-shadow 0.2s, transform 0.2s",
    "&:hover": {
      boxShadow: v.hoverShadow,
    },
  },

  cardHeader: {
    padding: "16px 20px 10px",
  },

  cardActivityName: {
    fontSize: 13,
    fontWeight: 700,
    color: v.text,
    margin: "0 0 3px",
    lineHeight: 1.4,
    display: "-webkit-box",
    WebkitBoxOrient: "vertical" as const,
    WebkitLineClamp: 2,
    overflow: "hidden",
  },

  cardExpName: {
    fontSize: 11,
    color: v.textSub,
    margin: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  },

  cardBody: {
    padding: "0 20px 16px",
    display: "flex",
    flexDirection: "column" as const,
    gap: 8,
  },

  infoRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },

  infoLabel: {
    width: 88,
    flexShrink: 0,
    fontSize: 11,
    color: v.textMuted,
  },

  copyBtn: {
    marginLeft: "auto",
    flexShrink: 0,
    width: 22,
    height: 22,
    borderRadius: radius.xs,
    border: "none",
    background: "transparent",
    color: v.textMuted,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "background 0.12s, color 0.12s",
    "&:hover": {
      background: v.surface2,
      color: v.text,
    },
  },

  emptyState: {
    padding: "48px 24px",
    textAlign: "center" as const,
    color: v.textSub,
    fontSize: 13,
    border: `1px dashed ${v.border}`,
    borderRadius: radius.lg,
  },
});

// ── 배지 ────────────────────────────────────────────────────────────
export const useBadgeStyles = createUseStyles({
  base: {
    display: "inline-flex",
    alignItems: "center",
    borderRadius: radius.sm,
    padding: "2px 7px",
    fontSize: 11,
    fontFamily: font.mono,
    fontWeight: 500,
    border: "1px solid transparent",
    maxWidth: 120,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
    lineHeight: 1.6,
  },
  blue:    { background: "hsl(var(--jss-badge-blue-bg))",    color: "hsl(var(--jss-badge-blue-text))",    borderColor: "hsl(var(--jss-badge-blue-border))" },
  violet:  { background: "hsl(var(--jss-badge-violet-bg))",  color: "hsl(var(--jss-badge-violet-text))",  borderColor: "hsl(var(--jss-badge-violet-border))" },
  emerald: { background: "hsl(var(--jss-badge-emerald-bg))", color: "hsl(var(--jss-badge-emerald-text))", borderColor: "hsl(var(--jss-badge-emerald-border))" },
  amber:   { background: "hsl(var(--jss-badge-amber-bg))",   color: "hsl(var(--jss-badge-amber-text))",   borderColor: "hsl(var(--jss-badge-amber-border))" },
  slate:   { background: "hsl(var(--jss-badge-slate-bg))",   color: "hsl(var(--jss-badge-slate-text))",   borderColor: "hsl(var(--jss-badge-slate-border))" },
});

// ── 스크린샷 섹션 ────────────────────────────────────────────────────
export const useScreenshotStyles = createUseStyles({
  imgWrap: {
    position: "relative",
    overflow: "hidden",
    borderRadius: radius.md,
    border: `1px solid ${v.border}`,
    cursor: "zoom-in",
  },

  screenshot: {
    width: "100%",
    display: "block",
    transition: "transform 0.35s cubic-bezier(0.34,1.56,0.64,1)",
  },

  tooltip: {
    position: "absolute",
    bottom: 12,
    left: "50%",
    transform: "translateX(-50%)",
    background: "rgba(0,0,0,0.72)",
    color: "#fff",
    backdropFilter: "blur(8px)",
    padding: "6px 14px",
    borderRadius: radius.full,
    fontSize: 11,
    fontWeight: 500,
    whiteSpace: "nowrap" as const,
    pointerEvents: "none",
  },

  noScreenshot: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: 160,
    borderRadius: radius.md,
    background: v.surface2,
    fontSize: 13,
    color: v.textSub,
  },
});

// ── 디버그 패널 ──────────────────────────────────────────────────────
export const useDebugStyles = createUseStyles({
  stack: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 16,
  },

  monoBlock: {
    marginTop: 10,
    maxHeight: 280,
    overflowY: "auto" as const,
    borderRadius: radius.md,
    background: v.surface2,
    padding: 12,
    fontSize: 11,
    fontFamily: font.mono,
    color: v.textSub,
    whiteSpace: "pre-wrap" as const,
    wordBreak: "break-all" as const,
    lineHeight: 1.6,
  },

  toggleLink: {
    background: "none",
    border: "none",
    padding: 0,
    fontSize: 11,
    color: v.primary,
    cursor: "pointer",
    fontFamily: font.sans,
    "&:hover": { textDecoration: "underline" },
  },

  urlList: {
    maxHeight: 256,
    overflowY: "auto" as const,
    display: "flex",
    flexDirection: "column" as const,
    gap: 2,
  },

  urlItem: {
    padding: "3px 8px",
    borderRadius: radius.xs,
    fontFamily: font.mono,
    fontSize: 10,
    color: v.textSub,
    wordBreak: "break-all" as const,
    lineHeight: 1.5,
    "&:hover": { background: v.surface2 },
  },

  urlItemHighlight: {
    background: v.warningBg,
    color: v.warningText,
  },

  interactItem: {
    padding: "4px 8px",
    borderRadius: radius.xs,
    fontFamily: font.mono,
    fontSize: 10,
    background: v.successBg,
    color: v.successText,
    wordBreak: "break-all" as const,
    lineHeight: 1.5,
  },

  rowBadges: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap" as const,
  },
});

// ════════════════════════════════════════════════════════════════════
// ★ 진정한 Dynamic Styling — 컴포넌트 props에 따라 색상이 달라지는 경우만
// ════════════════════════════════════════════════════════════════════

// ── 1. SDK 상태 배지 (status + dark → 고유 색상 세트) ────────────────
// 이 훅은 status가 per-컴포넌트 prop이므로 link: true 필수
type SdkBadgeTheme = { status: SdkStatus; dark: boolean };

export const useSdkBadgeStyles = createUseStyles<string, SdkBadgeTheme>(
  {
    badge: ({ status, dark }: SdkBadgeTheme) => {
      const c = sdkBadgeColor(status, dark);
      return {
        display: "inline-flex",
        alignItems: "center",
        gap: sp[1] / 2,
        padding: `${sp[1] / 2}px ${sp[1]}px`,
        borderRadius: radius.full,
        border: `1px solid ${c.border}`,
        background: c.bg,
        color: c.text,
        fontSize: 11,
        fontWeight: 600,
        fontFamily: font.sans,
        letterSpacing: "0.01em",
        lineHeight: 1.5,
        userSelect: "none" as const,
        transition: "background 0.2s, color 0.2s, border-color 0.2s",
      };
    },

    dot: ({ status, dark }: SdkBadgeTheme) => ({
      width: 6,
      height: 6,
      borderRadius: "50%",
      flexShrink: 0,
      background: sdkBadgeColor(status, dark).dot,
      animation:
        status === "WebSDK" || status === "at.js"
          ? "$dotPulse 2.5s ease-in-out infinite"
          : "none",
    }),

    "@keyframes dotPulse": {
      "0%, 100%": { opacity: 1 },
      "50%":      { opacity: 0.45 },
    },

    version: ({ status, dark }: SdkBadgeTheme) => ({
      opacity: 0.72,
      fontSize: 10,
      fontFamily: font.mono,
      color: sdkBadgeColor(status, dark).text,
      "&::before": { content: '"/\\00a0"', marginLeft: 2 },
    }),
  },
  { link: true }
);

// ── 2. Activity Card — accentColor(per-card) 기반 borderLeft ─────────
// dark prop은 CSS 변수로 처리, accentColor만 진정한 dynamic prop
type CardTheme = { accentColor: string };

export const useHoverCardStyles = createUseStyles<string, CardTheme>(
  {
    card: ({ accentColor }: CardTheme) => ({
      background: v.surface,
      borderRadius: radius.lg,
      border: `1px solid ${v.border}`,
      borderLeft: `4px solid ${accentColor}`,
      boxShadow: v.cardShadow,
      overflow: "hidden",
      height: "100%",
      cursor: "default",
      transition: "transform 0.22s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.22s ease",
      "&:hover": {
        transform: "translateY(-4px)",
        boxShadow: v.cardHoverShadow,
      },
    }),

    header: {
      padding: `${sp[2]}px ${sp[3]}px ${sp[1]}px`,
    },

    activityName: {
      fontSize: 13,
      fontWeight: 700,
      color: v.text,
      margin: `0 0 ${sp[1] / 2}px`,
      lineHeight: 1.4,
      display: "-webkit-box",
      WebkitBoxOrient: "vertical" as const,
      WebkitLineClamp: 2,
      overflow: "hidden",
      fontFamily: font.sans,
    },

    expName: {
      fontSize: 11,
      color: v.textSub,
      margin: 0,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap" as const,
      fontFamily: font.sans,
    },

    body: {
      padding: `0 ${sp[3]}px ${sp[2]}px`,
      display: "flex",
      flexDirection: "column" as const,
      gap: sp[1],
    },

    infoRow: {
      display: "flex",
      alignItems: "center",
      gap: sp[1],
    },

    label: {
      width: 88,
      flexShrink: 0,
      fontSize: 11,
      color: v.textMuted,
      fontFamily: font.sans,
    },

    copyBtn: {
      marginLeft: "auto",
      flexShrink: 0,
      width: sp[3],
      height: sp[3],
      borderRadius: radius.xs,
      border: "none",
      background: "transparent",
      color: v.textMuted,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      transition: "background 0.12s, color 0.12s",
      "&:hover": {
        background: v.surface2,
        color: v.text,
      },
    },
  },
  { link: true }
);

// ── 3. 스크린샷 모달 ──────────────────────────────────────────────────
export const useModalStyles = createUseStyles({
  overlay: {
    position: "fixed" as const,
    inset: 0,
    zIndex: 200,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(0,0,0,0.88)",
    backdropFilter: "blur(6px)",
    WebkitBackdropFilter: "blur(6px)",
    cursor: "zoom-out",
    padding: sp[2],
  },

  modal: {
    position: "relative" as const,
    maxWidth: "90vw",
    maxHeight: "90vh",
    borderRadius: radius.xl,
    overflow: "hidden",
    boxShadow: shadow.modal,
    border: `1px solid ${v.border}`,
    cursor: "default",
    "&:focus-visible": { outline: "none" },
  },

  img: {
    display: "block",
    maxWidth: "100%",
    maxHeight: "85vh",
    objectFit: "contain" as const,
    border: "1px solid #dddddd",
  },

  closeBtn: {
    position: "absolute" as const,
    top: sp[1],
    right: sp[1],
    width: sp[4],
    height: sp[4],
    borderRadius: "50%",
    border: "none",
    background: "rgba(0,0,0,0.60)",
    color: "#ffffff",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background 0.15s, transform 0.15s",
    "&:hover": {
      background: "rgba(0,0,0,0.85)",
      transform: "scale(1.08)",
    },
  },

  caption: {
    position: "absolute" as const,
    bottom: 0,
    left: 0,
    right: 0,
    padding: `${sp[1]}px ${sp[2]}px`,
    background: "linear-gradient(to top, rgba(0,0,0,0.80), transparent)",
    color: "#ffffff",
    fontSize: 11,
    fontFamily: font.sans,
    fontWeight: 500,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },

  thumbWrap: {
    position: "relative" as const,
    overflow: "hidden",
    borderRadius: radius.md,
    border: `1px solid ${v.border}`,
    cursor: "zoom-in",
    maxWidth: "100%",
    transition: "box-shadow 0.2s",
    "&:hover": {
      boxShadow: v.cardHoverShadow,
    },
  },

  thumbImg: {
    display: "block",
    maxWidth: "100%",
    width: "100%",
    border: "1px solid #dddddd",
    transition: "transform 0.32s cubic-bezier(0.34,1.56,0.64,1)",
    "&:hover": {
      transform: "scale(1.03)",
    },
  },

  thumbHint: {
    position: "absolute" as const,
    bottom: sp[1],
    left: "50%",
    transform: "translateX(-50%)",
    background: "rgba(0,0,0,0.70)",
    backdropFilter: "blur(8px)",
    color: "#ffffff",
    padding: `${sp[1] / 2}px ${sp[2] / 2 * 3}px`,
    borderRadius: radius.full,
    fontSize: 11,
    fontWeight: 500,
    fontFamily: font.sans,
    whiteSpace: "nowrap" as const,
    pointerEvents: "none" as const,
  },

  noScreenshot: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    height: sp[10],
    borderRadius: radius.md,
    background: v.surface2,
    fontSize: 13,
    color: v.textSub,
    gap: sp[1],
    fontFamily: font.sans,
  },
});
