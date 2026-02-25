"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  scanTargetActivity,
  type ScanResult,
  type TargetActivityItem,
  type DebugInfo,
} from "@/app/actions/scan-target";
import { useToast } from "@/components/ui/toast";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  useLayoutStyles,
  useHeroStyles,
  useCardStyles,
  useLoadingStyles,
  useBannerStyles,
  useTabStyles,
  useActivityStyles,
  useBadgeStyles,
  useScreenshotStyles,
  useDebugStyles,
  // ★ JSS Dynamic Styling
  useSdkBadgeStyles,
  useHoverCardStyles,
  useModalStyles,
} from "@/styles/scanner-styles";
import { palette, type SdkStatus } from "@/styles/tokens";

// ── 다크모드 감지 훅 ─────────────────────────────────────────────────
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

// ── 클립보드 복사 훅 ─────────────────────────────────────────────────
function useCopy() {
  const { toast } = useToast();
  return useCallback(async (text: string, label = "값") => {
    try {
      await navigator.clipboard.writeText(text);
      toast(`${label} 복사 완료`, "success");
    } catch {
      toast("복사 실패", "error");
    }
  }, [toast]);
}

// ── 스캔 단계 ────────────────────────────────────────────────────────
const STAGES = [
  { at:  0, label: "브라우저 실행 중…",          pct:  5 },
  { at:  5, label: "페이지 로딩 중…",            pct: 25 },
  { at: 15, label: "동의 처리 중…",              pct: 40 },
  { at: 22, label: "Adobe SDK 초기화 대기 중…",  pct: 58 },
  { at: 32, label: "Target 요청 수집 중…",       pct: 75 },
  { at: 45, label: "데이터 분석 중…",            pct: 90 },
];
function getStage(e: number) {
  let s = STAGES[0];
  for (const x of STAGES) if (e >= x.at) s = x;
  return s;
}

// ── Framer Motion 변형 ───────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show:   { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 260, damping: 22 } },
};
const stagger = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.07, delayChildren: 0.04 } },
};

// ════════════════════════════════════════════════════════════════════
// 메인 컴포넌트
// ════════════════════════════════════════════════════════════════════
export function ScannerForm() {
  const dark = useDark();  // SDK 배지(useSdkBadgeStyles) 에만 사용

  const layout = useLayoutStyles();
  const hero   = useHeroStyles();

  const [url, setUrl]         = useState("");
  const [result, setResult]   = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [tab, setTab]         = useState("activities");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setResult(null);
    setLoading(true);
    setElapsed(0);
    setTab("activities");

    const start = Date.now();
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 500);

    try {
      const res = await scanTargetActivity(url);
      setResult(res);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setResult({ success: false, error: `서버 오류: ${msg}` });
    } finally {
      clearInterval(timer);
      setLoading(false);
    }
  }

  const stage = getStage(elapsed);
  const p = palette(dark);

  return (
    <div className={layout.wrapper}>

      {/* ── 네비게이션 ── */}
      <header className={layout.navbar}>
        <div className={layout.navInner}>
          <div className={layout.navBrand}>
            <div className={layout.navLogo}>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
                fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
              </svg>
            </div>
            <span className={layout.navTitle}>Adobe Target Activity Scanner</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* ── 히어로 섹션 ── */}
      <section className={hero.hero}>
        <div className={hero.heroInner}>
          <div className={hero.heroContent}>
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
            <h1 className={hero.heroTitle}>
              URL만 입력하면<br />액티비티를 자동 수집
            </h1>
            <p className={hero.heroSub}>
              Playwright 브라우저가 페이지를 열어 Adobe Target interact 요청을 실시간으로 가로챕니다.
            </p>
          </motion.div>

          <motion.form
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.1 }}
            onSubmit={handleSubmit}
          >
            <div
              className={hero.searchWrap}
              style={loading ? { borderColor: p.primary, boxShadow: `0 0 0 3px ${p.primaryRing}` } : undefined}
            >
              <span className={hero.searchIcon}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
                </svg>
              </span>
              <input
                type="url"
                placeholder="https://www.samsung.com/uk/offer/"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={loading}
                className={hero.searchInput}
              />
              <button
                type="submit"
                disabled={loading || !url.trim()}
                className={hero.searchBtn}
              >
                {loading ? (
                  <>
                    <svg style={{ animation: "spin 1s linear infinite" }}
                      xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
                      fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                    </svg>
                    스캔 중
                  </>
                ) : (
                  <>
                    스캔
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
                      fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </>
                )}
              </button>
            </div>
          </motion.form>
          </div>
        </div>
      </section>

      {/* ── 메인 ── */}
      <main className={layout.main}>

        {/* 로딩 */}
        <AnimatePresence>
          {loading && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <LoadingSection dark={dark} elapsed={elapsed} stagePct={stage.pct} stageLabel={stage.label} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* 결과 */}
        <AnimatePresence>
          {!loading && result && (
            <motion.div
              key="result"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              style={{ display: "flex", flexDirection: "column", gap: 24 }}
            >
              <ResultView
                result={result}
                dark={dark}
                tab={tab}
                onTabChange={setTab}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* 스핀 키프레임 (전역 인라인 style) */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── 로딩 섹션 ────────────────────────────────────────────────────────
function LoadingSection({ dark, elapsed, stagePct, stageLabel }: {
  dark: boolean; elapsed: number; stagePct: number; stageLabel: string;
}) {
  const s = useLoadingStyles();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div className={s.progressCard}>
        <div className={s.progressHeader}>
          <div className={s.progressLabel}>
            <span className={s.pingDot}>
              <span className={s.pingRing} />
              <span className={s.pingCore} />
            </span>
            {stageLabel}
          </div>
          <span className={s.timer}>{elapsed}s</span>
        </div>
        <div className={s.progressTrack}>
          <div className={s.progressBar} style={{ width: `${Math.min(stagePct + (elapsed % 10), 95)}%` }} />
        </div>
      </div>

      <motion.div variants={stagger} initial="hidden" animate="show" className={s.skeletonGrid}>
        {[1, 2, 3].map((i) => (
          <motion.div key={i} variants={fadeUp} className={s.skeletonCard}>
            <div className={s.skeletonLine} style={{ height: 14, width: "70%", marginBottom: 8 }} />
            <div className={s.skeletonLine} style={{ height: 10, width: "45%", marginBottom: 20 }} />
            {[1, 2, 3].map((j) => (
              <div key={j} style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <div className={s.skeletonLine} style={{ height: 10, width: 60 }} />
                <div className={s.skeletonLine} style={{ height: 20, width: 80, borderRadius: 4 }} />
              </div>
            ))}
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}

// ── 결과 뷰 ─────────────────────────────────────────────────────────
function ResultView({ result, dark, tab, onTabChange }: {
  result: ScanResult; dark: boolean; tab: string; onTabChange: (t: string) => void;
}) {
  const banner = useBannerStyles();
  const tabs   = useTabStyles();

  return (
    <>
      {/* 상태 배너 */}
      <motion.div variants={fadeUp} initial="hidden" animate="show">
        {result.success ? (
          <div className={banner.successBanner}>
            <div style={{ ...parseStyle(banner.bannerIcon), ...parseStyle(banner.bannerIconSuccess) }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5"/>
              </svg>
            </div>
            <div>
              <p className={`${banner.bannerTitle} ${banner.bannerTitleSuccess}`}>
                {result.items.length}개 액티비티 발견
              </p>
              <p className={`${banner.bannerBody} ${banner.bannerBodySuccess}`}>
                Adobe Target 활성 액티비티가 감지되었습니다.
              </p>
            </div>
          </div>
        ) : (
          <div className={banner.warningBanner}>
            <div style={{ ...parseStyle(banner.bannerIcon), ...parseStyle(banner.bannerIconWarning) }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className={`${banner.bannerTitle} ${banner.bannerTitleWarning}`}>스캔 결과 없음</p>
              <p className={`${banner.bannerBody} ${banner.bannerBodyWarning}`}>{result.error}</p>
            </div>
          </div>
        )}
      </motion.div>

      {/* 탭 */}
      {result.debug && (
        <>
          <motion.div variants={fadeUp} initial="hidden" animate="show">
            <div className={tabs.tabList}>
              {(["activities", "screenshot", "debug"] as const).map((t) => (
                <button
                  key={t}
                  className={`${tabs.tabTrigger} ${tab === t ? tabs.tabTriggerActive : ""}`}
                  onClick={() => onTabChange(t)}
                >
                  <TabIcon name={t} />
                  &nbsp;
                  {t === "activities" ? "액티비티" : t === "screenshot" ? "스크린샷" : "디버그"}
                  {t === "activities" && result.success && (
                    <span className={tabs.tabBadge}>{result.items.length}</span>
                  )}
                  {t === "debug" && result.debug && result.debug.interactRequests.length > 0 && (
                    <span className={`${tabs.tabBadge} ${tabs.tabBadgeGreen}`}>
                      {result.debug.interactRequests.length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </motion.div>

          <div className={tabs.tabContent}>
            {tab === "activities" && (
              <ActivitiesTab
                items={result.success ? result.items : []}
                dark={dark}
              />
            )}
            {tab === "screenshot" && (
              <ScreenshotTab screenshot={result.debug?.screenshotBase64 ?? ""} dark={dark} />
            )}
            {tab === "debug" && result.debug && (
              <DebugTab debug={result.debug} dark={dark} />
            )}
          </div>
        </>
      )}

      {/* debug 없는 성공 케이스 */}
      {result.success && !result.debug && (
        <ActivitiesTab items={result.items} dark={dark} />
      )}
    </>
  );
}

// ── 액티비티 탭 ──────────────────────────────────────────────────────
function ActivitiesTab({ items, dark }: { items: TargetActivityItem[]; dark: boolean }) {
  const s = useActivityStyles();

  if (items.length === 0) {
    return (
      <motion.div variants={fadeUp} initial="hidden" animate="show">
        <div className={s.emptyState}>
          <div style={{ marginBottom: 8, fontSize: 28 }}>🔍</div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>발견된 액티비티 없음</div>
          <div style={{ fontSize: 11 }}>스캔 중 활성 액티비티를 찾지 못했습니다.</div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className={s.grid}>
      {items.map((item, i) => (
        <motion.div key={i} variants={fadeUp}>
          <ActivityCard item={item} index={i} dark={dark} />
        </motion.div>
      ))}
    </motion.div>
  );
}

// ── 액티비티 카드 (★ JSS Dynamic: accentColor + dark → hover 스타일) ─
const ACCENT_COLORS = ["#3b82f6","#8b5cf6","#10b981","#f59e0b","#ef4444","#06b6d4"];

function ActivityCard({ item, index, dark }: { item: TargetActivityItem; index: number; dark: boolean }) {
  const accentColor = ACCENT_COLORS[index % ACCENT_COLORS.length];
  // ★ props를 JSS에 직접 주입 → accentColor·dark 값에 따라 border·shadow 동적 계산
  const s = useHoverCardStyles({ accentColor });

  return (
    <div className={s.card} style={{ height: "100%" }}>
      <div className={s.header}>
        <p className={s.activityName}>
          {item.activityName || `Activity #${item.activityId}`}
        </p>
        {item.experienceName && (
          <p className={s.expName}>{item.experienceName}</p>
        )}
      </div>
      <div className={s.body}>
        <CopyRow label="Activity ID"   value={item.activityId}          badge="blue"    hoverCard={s} dark={dark} />
        <CopyRow label="Experience ID" value={item.experienceId || "—"} badge="violet"  hoverCard={s} dark={dark} copyable={!!item.experienceId} />
        <CopyRow label="Scope"         value={item.scope || "—"}        badge="slate"   hoverCard={s} dark={dark} copyable={!!item.scope} />
        {item.sdkType && (
          // ★ SDK 타입 행은 SdkStatusBadge 컴포넌트로 대체
          <div className={s.infoRow}>
            <span className={s.label}>SDK</span>
            <SdkStatusBadge status={item.sdkType as SdkStatus} dark={dark} showVersion />
          </div>
        )}
      </div>
    </div>
  );
}

// ── SDK 상태 배지 (★ JSS Dynamic: status → 색상 자동 분기) ────────────
function SdkStatusBadge({
  status,
  dark,
  showVersion,
  version,
}: {
  status: SdkStatus;
  dark: boolean;
  showVersion?: boolean;
  version?: string;
}) {
  // ★ status + dark 를 JSS에 직접 전달 → 색상 팩토리(sdkBadgeColor)로 동적 스타일 생성
  const s = useSdkBadgeStyles({ status, dark });
  return (
    <span className={s.badge}>
      <span className={s.dot} />
      {status === "none" ? "감지 안 됨" : status}
      {showVersion && version && version !== "unknown" && (
        <span className={s.version}>{version}</span>
      )}
    </span>
  );
}

// ── 복사 행 ──────────────────────────────────────────────────────────
type BadgeColor = "blue" | "violet" | "emerald" | "amber" | "slate";

// hoverCard: useHoverCardStyles 에서 반환된 classes — 레이아웃 재사용
function CopyRow({ label, value, badge, dark, hoverCard, copyable = true }: {
  label: string;
  value: string;
  badge: BadgeColor;
  dark: boolean;
  hoverCard: ReturnType<typeof useHoverCardStyles>;
  copyable?: boolean;
}) {
  const bc   = useBadgeStyles();
  const copy = useCopy();
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await copy(value, label);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className={hoverCard.infoRow}>
      <span className={hoverCard.label}>{label}</span>
      <span className={`${bc.base} ${bc[badge]}`}>{value}</span>
      {copyable && value !== "—" && (
        <motion.button
          whileTap={{ scale: 0.82 }}
          className={hoverCard.copyBtn}
          onClick={handleCopy}
          aria-label={`${label} 복사`}
        >
          <AnimatePresence mode="wait" initial={false}>
            {copied ? (
              <motion.svg key="chk"
                initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.4, opacity: 0 }} transition={{ duration: 0.12 }}
                xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
                fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5"/>
              </motion.svg>
            ) : (
              <motion.svg key="cpy"
                initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.4, opacity: 0 }} transition={{ duration: 0.12 }}
                xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
                <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
              </motion.svg>
            )}
          </AnimatePresence>
        </motion.button>
      )}
    </div>
  );
}

// ── 스크린샷 탭 + 풀스크린 모달 (★ JSS Dynamic: dark → 모달 테마) ────
function ScreenshotTab({ screenshot, dark }: { screenshot: string; dark: boolean }) {
  const card  = useCardStyles();
  const modal = useModalStyles();
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);

  // ESC로 모달 닫기
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <>
      <motion.div variants={fadeUp} initial="hidden" animate="show">
        <div className={card.card}>
          <div className={card.cardHeader}>
            <h3 className={card.cardTitle}>스캔 시점 스크린샷</h3>
            <p className={card.cardDesc}>
              클릭하면 전체 화면으로 볼 수 있습니다. 봇 차단·동의 배너 여부를 확인하세요.
            </p>
          </div>
          <div className={card.cardBody}>
            {screenshot ? (
              <div
                className={modal.thumbWrap}
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                onClick={() => setOpen(true)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && setOpen(true)}
                aria-label="스크린샷 전체 화면으로 보기"
              >
                {/* 요청: maxWidth: 100%, border: 1px solid #ddd */}
                <img
                  src={`data:image/jpeg;base64,${screenshot}`}
                  alt="스캔 스크린샷 썸네일"
                  className={modal.thumbImg}
                />
                <AnimatePresence>
                  {hovered && (
                    <motion.div
                      className={modal.thumbHint}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      transition={{ duration: 0.16 }}
                    >
                      🔍 클릭하면 전체 화면으로 보기
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className={modal.noScreenshot}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
                  <path d="M21 15l-5-5L5 21"/>
                </svg>
                스크린샷 없음
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* ★ JSS Dynamic 모달 — dark prop에 따라 border/caption 색상 자동 변환 */}
      <AnimatePresence>
        {open && (
          <motion.div
            className={modal.overlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              className={modal.modal}
              initial={{ scale: 0.88, opacity: 0 }}
              animate={{ scale: 1,    opacity: 1 }}
              exit={{    scale: 0.88, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 26 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* 요청: maxWidth: 100%, border: 1px solid #ddd */}
              <img
                src={`data:image/jpeg;base64,${screenshot}`}
                alt="스캔 스크린샷 전체 화면"
                className={modal.img}
              />
              {/* 하단 캡션 바 */}
              <div className={modal.caption}>
                <span>스캔 시점 스크린샷</span>
                <span style={{ opacity: 0.6, fontSize: 10 }}>ESC 또는 배경 클릭으로 닫기</span>
              </div>
              {/* 닫기 버튼 */}
              <button
                className={modal.closeBtn}
                onClick={() => setOpen(false)}
                aria-label="모달 닫기"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18M6 6l12 12"/>
                </svg>
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ── 디버그 탭 ────────────────────────────────────────────────────────
function DebugTab({ debug, dark }: { debug: DebugInfo; dark: boolean }) {
  const card  = useCardStyles();
  const db    = useDebugStyles();
  const bc    = useBadgeStyles();
  const [showRaw, setShowRaw] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const shown = showAll ? debug.allRequests : debug.allRequests.slice(0, 40);

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className={db.stack}>

      {/* SDK 진단 */}
      <motion.div variants={fadeUp}>
        <div className={card.card}>
          <div className={card.cardHeader}>
            <h3 className={card.cardTitle}>SDK 진단</h3>
            {/* ★ JSS Dynamic 배지 — sdkType 값에 따라 녹색/파란색/빨간색 자동 분기 */}
            <div className={db.rowBadges} style={{ marginTop: 6 }}>
              <SdkStatusBadge
                status={(debug.sdkType as SdkStatus) || "none"}
                dark={dark}
                showVersion
                version={debug.sdkVersion}
              />
            </div>
          </div>
          {debug.rawSdkData && debug.rawSdkData !== "(없음)" && (
            <div className={card.cardBody}>
              <button className={db.toggleLink} onClick={() => setShowRaw((v) => !v)}>
                {showRaw ? "SDK 응답 숨기기" : "SDK 원본 응답 보기"}
              </button>
              <AnimatePresence>
                {showRaw && (
                  <motion.pre
                    className={db.monoBlock}
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}
                  >
                    {debug.rawSdkData}
                  </motion.pre>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </motion.div>

      {/* interact 요청 */}
      <motion.div variants={fadeUp}>
        <div className={card.card}
          style={debug.interactRequests.length > 0
            ? { borderColor: dark ? "rgba(16,185,129,0.3)" : "#a7f3d0" }
            : undefined}>
          <div className={card.cardHeader}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h3 className={card.cardTitle}>interact / smetrics 요청</h3>
              <span className={`${bc.base} ${debug.interactRequests.length > 0 ? bc.emerald : bc.slate}`}>
                {debug.interactRequests.length}건
              </span>
            </div>
          </div>
          {debug.interactRequests.length > 0 && (
            <div className={card.cardBody}>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                {debug.interactRequests.map((u, i) => (
                  <li key={i} className={db.interactItem}>{u}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </motion.div>

      {/* 전체 요청 */}
      <motion.div variants={fadeUp}>
        <div className={card.card}>
          <div className={card.cardHeader}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h3 className={card.cardTitle}>전체 네트워크 요청</h3>
              <span className={`${bc.base} ${bc.slate}`}>{debug.allRequests.length}건</span>
            </div>
            <p className={card.cardDesc}>Adobe / smetrics 관련 URL이 있는지 확인하세요.</p>
          </div>
          <div className={card.cardBody}>
            <ul className={db.urlList} style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {shown.map((u, i) => (
                <li
                  key={i}
                  className={`${db.urlItem} ${/smetrics|tt\.omtrdc|interact|delivery/i.test(u) ? db.urlItemHighlight : ""}`}
                >
                  {u}
                </li>
              ))}
            </ul>
            {debug.allRequests.length > 40 && (
              <button className={db.toggleLink} style={{ marginTop: 8 }} onClick={() => setShowAll((v) => !v)}>
                {showAll ? "접기" : `나머지 ${debug.allRequests.length - 40}건 더 보기`}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── 탭 아이콘 ────────────────────────────────────────────────────────
function TabIcon({ name }: { name: string }) {
  if (name === "activities") return (
    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/>
      <rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>
    </svg>
  );
  if (name === "screenshot") return (
    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
      <path d="M21 15l-5-5L5 21"/>
    </svg>
  );
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>
    </svg>
  );
}

// ── 유틸: JSS 클래스명을 스타일 객체로 파싱 (bannerIcon 합성용) ───────
// JSS는 클래스 합성이 가능하므로 실제로는 className 문자열 조합으로 충분
function parseStyle(_cls: string): React.CSSProperties {
  return {};
}
