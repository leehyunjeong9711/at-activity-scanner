"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as XLSX from "xlsx";
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
  useSdkBadgeStyles,
  useHoverCardStyles,
  useModalStyles,
} from "@/styles/scanner-styles";
import { palette, type SdkStatus } from "@/styles/tokens";

// ── 일괄 스캔 타입 ─────────────────────────────────────────────────────
type ScanMode = "single" | "batch";
type BatchItemStatus = "pending" | "scanning" | "done" | "error";
type BatchResult = {
  url: string;
  status: BatchItemStatus;
  result?: ScanResult;
};

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

// ── 파일에서 URL 파싱 (클라이언트 전용) ─────────────────────────────
async function parseUrlsFromFile(file: File): Promise<string[]> {
  const urls: string[] = [];

  if (file.name.toLowerCase().endsWith(".csv")) {
    const text = await file.text();
    for (const line of text.split(/[\r\n]+/)) {
      for (const cell of line.split(",")) {
        const val = cell.trim().replace(/^["']|["']$/g, "");
        try {
          const u = new URL(val);
          if (["http:", "https:"].includes(u.protocol)) urls.push(val);
        } catch {}
      }
    }
    return [...new Set(urls)];
  }

  // xlsx / xls
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target!.result, { type: "array" });
        for (const sn of wb.SheetNames) {
          const rows = XLSX.utils.sheet_to_json(wb.Sheets[sn], { header: 1 }) as unknown[][];
          for (const row of rows) {
            for (const cell of row) {
              const val = String(cell ?? "").trim();
              try {
                const u = new URL(val);
                if (["http:", "https:"].includes(u.protocol)) urls.push(val);
              } catch {}
            }
          }
        }
        resolve([...new Set(urls)]);
      } catch (err) { reject(err); }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

// ── 배치 결과 엑셀 내보내기 ─────────────────────────────────────────
async function exportBatchResults(results: BatchResult[]) {
  const header = [
    "URL", "SDK 타입",
    "액티비티 ID", "액티비티 이름",
    "익스피리언스 ID", "익스피리언스 이름",
    "스코프", "오류 메시지",
  ];

  const rows: (string | number)[][] = [];

  for (const r of results) {
    if (!r.result || !r.result.success) {
      rows.push([r.url, "", "", "", "", "", "", r.result?.error ?? "스캔 안 됨"]);
      continue;
    }
    const items = r.result.items;
    const sdkType = items[0]?.sdkType ?? r.result.debug?.sdkType ?? "";
    if (items.length === 0) {
      rows.push([r.url, sdkType, "(감지된 액티비티 없음)", "", "", "", "", ""]);
    } else {
      for (const item of items) {
        rows.push([
          r.url,
          item.sdkType ?? sdkType,
          item.activityId,
          item.activityName ?? "",
          item.experienceId,
          (item as { experienceName?: string }).experienceName ?? "",
          item.scope,
          "",
        ]);
      }
    }
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
  ws["!cols"] = [
    { wch: 55 }, { wch: 10 },
    { wch: 16 }, { wch: 35 },
    { wch: 16 }, { wch: 30 },
    { wch: 35 }, { wch: 50 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, "스캔 결과");
  XLSX.writeFile(wb, `AT_스캔결과_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// ════════════════════════════════════════════════════════════════════
// 메인 컴포넌트
// ════════════════════════════════════════════════════════════════════
export function ScannerForm() {
  const dark   = useDark();
  const layout = useLayoutStyles();
  const hero   = useHeroStyles();

  // ── 단일 URL 상태 ──
  const [url, setUrl]         = useState("");
  const [result, setResult]   = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [tab, setTab]         = useState("activities");

  // ── 모드 / 배치 상태 ──
  const [mode, setMode]                     = useState<ScanMode>("single");
  const fileInputRef                        = useRef<HTMLInputElement>(null);
  const [batchFile, setBatchFile]           = useState<File | null>(null);
  const [batchUrls, setBatchUrls]           = useState<string[]>([]);
  const [batchResults, setBatchResults]     = useState<BatchResult[]>([]);
  const [batchRunning, setBatchRunning]     = useState(false);
  const [batchCurrentIdx, setBatchCurrentIdx] = useState(-1);
  const [isDragOver, setIsDragOver]         = useState(false);
  const [fileError, setFileError]           = useState<string | null>(null);
  const [batchParsing, setBatchParsing]     = useState(false);

  const p = palette(dark);

  // ── 단일 URL 스캔 ──
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

  // ── 파일 선택 처리 ──
  async function handleFileSelect(file: File) {
    setFileError(null);
    setBatchUrls([]);
    setBatchResults([]);
    setBatchFile(file);
    setBatchParsing(true);
    try {
      const urls = await parseUrlsFromFile(file);
      if (urls.length === 0) {
        setFileError(
          "URL을 찾을 수 없습니다. 파일에 http:// 또는 https://로 시작하는 URL이 포함되어 있는지 확인하세요."
        );
        setBatchFile(null);
      } else {
        setBatchUrls(urls);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setFileError(`파일을 읽을 수 없습니다: ${msg}`);
      setBatchFile(null);
    } finally {
      setBatchParsing(false);
    }
  }

  // ── 일괄 스캔 실행 ──
  async function handleBatchScan() {
    if (batchUrls.length === 0 || batchRunning) return;

    setBatchRunning(true);
    setBatchCurrentIdx(0);
    setBatchResults(batchUrls.map((u) => ({ url: u, status: "pending" })));
    setElapsed(0);

    const start = Date.now();
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 500);

    try {
      for (let i = 0; i < batchUrls.length; i++) {
        setBatchCurrentIdx(i);
        setBatchResults((prev) =>
          prev.map((r, idx) => (idx === i ? { ...r, status: "scanning" } : r))
        );

        try {
          const res = await scanTargetActivity(batchUrls[i]);
          setBatchResults((prev) =>
            prev.map((r, idx) => (idx === i ? { ...r, status: "done", result: res } : r))
          );
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          setBatchResults((prev) =>
            prev.map((r, idx) =>
              idx === i
                ? { ...r, status: "error", result: { success: false, error: `서버 오류: ${msg}` } }
                : r
            )
          );
        }
      }
    } finally {
      clearInterval(timer);
      setBatchRunning(false);
      setBatchCurrentIdx(-1);
    }
  }

  const stage = getStage(elapsed);

  return (
    <div className={layout.wrapper}>

      {/* ── 네비게이션 ── */}
      <header className={layout.navbar} style={{ position: "sticky", top: 0, zIndex: 50, width: "100%", borderBottom: "1px solid hsl(var(--border))", background: "hsl(var(--background) / 0.85)", backdropFilter: "blur(12px)" }}>
        <div className={layout.navInner} style={{ margin: "0 auto", maxWidth: 1152, padding: "0 16px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div className={layout.navBrand} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className={layout.navLogo} style={{ background: "#2563eb", borderRadius: 6, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
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
      <section className={hero.hero} style={{ borderBottom: "1px solid hsl(var(--border))", padding: "48px 16px" }}>
        <div className={hero.heroInner} style={{ margin: "0 auto", maxWidth: 1152, padding: "0 16px", width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div className={hero.heroContent} style={{ width: "100%", textAlign: "center" }}>
            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
              <h1 className={hero.heroTitle} style={{ textAlign: "center", fontSize: 32, fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.25, margin: "0 0 8px" }}>
                URL만 입력하면<br />액티비티를 자동 수집
              </h1>
              <p className={hero.heroSub} style={{ textAlign: "center", fontSize: 14, lineHeight: 1.6, margin: "0 0 28px", color: "hsl(var(--muted-foreground))" }}>
                Playwright 브라우저가 페이지를 열어 Adobe Target interact 요청을 실시간으로 가로챕니다.
              </p>
            </motion.div>

            {/* ── 모드 토글 ── */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.05 }}
              style={{ marginBottom: 12, display: "flex", justifyContent: "center" }}
            >
              <div style={{
                display: "inline-flex", gap: 4, padding: 4,
                background: "hsl(var(--muted))", borderRadius: 10,
              }}>
                {(["single", "batch"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    style={{
                      padding: "7px 18px", borderRadius: 7, border: "none",
                      background: mode === m ? "hsl(var(--card))" : "transparent",
                      color: mode === m ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
                      fontWeight: mode === m ? 600 : 400,
                      cursor: "pointer", fontSize: 13,
                      boxShadow: mode === m ? "0 1px 3px rgba(0,0,0,0.10)" : "none",
                      transition: "all 0.15s",
                      display: "flex", alignItems: "center", gap: 6,
                    }}
                  >
                    {m === "single" ? (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
                          fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
                        </svg>
                        단일 URL
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
                          fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                          <polyline points="14 2 14 8 20 8"/>
                          <line x1="8" y1="13" x2="16" y2="13"/>
                          <line x1="8" y1="17" x2="16" y2="17"/>
                          <line x1="8" y1="9" x2="10" y2="9"/>
                        </svg>
                        엑셀 일괄 스캔
                      </>
                    )}
                  </button>
                ))}
              </div>
            </motion.div>

            {/* ── 단일 URL 폼 (원본 구조 유지) ── */}
            {mode === "single" && (
              <motion.form
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.1 }}
                onSubmit={handleSubmit}
              >
                <div
                  className={hero.searchWrap}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    borderRadius: 16,
                    border: `1px solid ${loading ? "hsl(var(--primary))" : "hsl(var(--border))"}`,
                    background: "hsl(var(--jss-surface))",
                    boxShadow: loading ? `0 0 0 3px ${p.primaryRing}` : "var(--jss-card-shadow)",
                    transition: "box-shadow 0.2s, border-color 0.2s",
                  }}
                >
                  <span className={hero.searchIcon} style={{ marginLeft: 16, flexShrink: 0, color: "hsl(var(--muted-foreground))", display: "flex", alignItems: "center" }}>
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
                    style={{ flex: 1, height: 48, padding: "0 12px", border: "none", background: "transparent", outline: "none", fontSize: 15, color: "hsl(var(--foreground))", fontFamily: "inherit" }}
                  />
                  <button
                    type="submit"
                    disabled={loading || !url.trim()}
                    className={hero.searchBtn}
                    style={{ margin: "0 6px 0 0", height: 36, padding: "0 16px", borderRadius: 8, border: "none", background: "hsl(var(--primary))", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, opacity: (loading || !url.trim()) ? 0.5 : 1, transition: "background 0.15s, opacity 0.15s", flexShrink: 0 }}
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
            )}

            {/* ── 배치 파일 업로드 ── */}
            {mode === "batch" && (
              <motion.div
                key="batch-upload"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                style={{ width: "100%", maxWidth: 560, margin: "0 auto" }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  style={{ display: "none" }}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) await handleFileSelect(file);
                    e.target.value = "";
                  }}
                />

                {/* 드롭존 (파일 미선택 시) */}
                {!batchFile && (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={async (e) => {
                      e.preventDefault();
                      setIsDragOver(false);
                      const file = e.dataTransfer.files[0];
                      if (file) await handleFileSelect(file);
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
                    style={{
                      border: `2px dashed ${isDragOver ? "hsl(var(--primary))" : "hsl(var(--border))"}`,
                      borderRadius: 12, padding: "30px 24px", textAlign: "center",
                      cursor: "pointer",
                      background: isDragOver ? "hsl(221 83% 53% / 0.05)" : "transparent",
                      transition: "all 0.2s",
                    }}
                  >
                    <div style={{ fontSize: 32, marginBottom: 10 }}>📎</div>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4, color: "hsl(var(--foreground))" }}>
                      엑셀 파일을 드래그하거나 클릭하여 업로드
                    </div>
                    <div style={{ fontSize: 12, color: "hsl(var(--muted-foreground))" }}>
                      지원 형식: .xlsx, .xls, .csv · URL이 포함된 시트
                    </div>
                  </div>
                )}

                {/* 파싱 중 로딩 */}
                {batchParsing && (
                  <div style={{
                    display: "flex", alignItems: "center", gap: 10, justifyContent: "center",
                    padding: "20px 24px", borderRadius: 12,
                    border: "2px dashed hsl(var(--border))",
                    color: "hsl(var(--muted-foreground))", fontSize: 14,
                  }}>
                    <svg style={{ animation: "spin 1s linear infinite", flexShrink: 0 }}
                      xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                      fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                    </svg>
                    파일 분석 중...
                  </div>
                )}

                {/* 파일 오류 */}
                {fileError && (
                  <div style={{
                    marginTop: 10, padding: "10px 14px", borderRadius: 8,
                    background: "hsl(0 84% 60% / 0.08)", color: "hsl(0 72% 51%)",
                    fontSize: 13, display: "flex", alignItems: "center", gap: 8,
                  }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
                      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
                      <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    <span style={{ flex: 1 }}>{fileError}</span>
                    <button
                      onClick={() => { setFileError(null); setBatchFile(null); }}
                      style={{ textDecoration: "underline", cursor: "pointer", background: "none", border: "none", color: "inherit", fontSize: 12 }}
                    >
                      다시 선택
                    </button>
                  </div>
                )}

                {/* 파일 선택됨 */}
                {batchFile && batchUrls.length > 0 && (
                  <div>
                    {/* 파일 정보 헤더 */}
                    <div style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "10px 14px", borderRadius: 10,
                      border: "1px solid hsl(var(--border))",
                      background: "hsl(var(--card))", marginBottom: 10,
                    }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
                        fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                        <polyline points="14 2 14 8 20 8"/>
                      </svg>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontWeight: 600, fontSize: 13,
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {batchFile.name}
                        </div>
                        <div style={{ fontSize: 12, color: "hsl(var(--muted-foreground))" }}>
                          {batchUrls.length}개 URL 감지됨
                        </div>
                      </div>
                      <button
                        onClick={() => { setBatchFile(null); setBatchUrls([]); setBatchResults([]); }}
                        style={{
                          fontSize: 11, color: "hsl(var(--muted-foreground))", background: "none",
                          border: "none", cursor: "pointer", textDecoration: "underline",
                        }}
                      >
                        다시 선택
                      </button>
                    </div>

                    {/* URL 미리보기 */}
                    <div style={{
                      marginBottom: 12, background: "hsl(var(--muted))",
                      borderRadius: 8, padding: "8px 12px",
                    }}>
                      {batchUrls.slice(0, 5).map((u, i) => (
                        <div key={i} style={{
                          fontSize: 11, color: "hsl(var(--muted-foreground))",
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          lineHeight: 1.9,
                        }}>
                          · {u}
                        </div>
                      ))}
                      {batchUrls.length > 5 && (
                        <div style={{ fontSize: 11, color: "hsl(var(--muted-foreground))", marginTop: 2, opacity: 0.7 }}>
                          + {batchUrls.length - 5}개 더…
                        </div>
                      )}
                    </div>

                    {/* 스캔 시작 버튼 */}
                    <button
                      onClick={handleBatchScan}
                      disabled={batchRunning}
                      style={{
                        width: "100%", padding: "12px 0", borderRadius: 9, border: "none",
                        background: batchRunning ? "hsl(var(--muted))" : "hsl(var(--primary))",
                        color: batchRunning ? "hsl(var(--muted-foreground))" : "hsl(var(--primary-foreground))",
                        fontWeight: 600, fontSize: 14, cursor: batchRunning ? "not-allowed" : "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                        transition: "all 0.15s",
                      }}
                    >
                      {batchRunning ? (
                        <>
                          <svg style={{ animation: "spin 1s linear infinite" }}
                            xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
                            fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                          </svg>
                          일괄 스캔 진행 중…
                        </>
                      ) : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
                            fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
                          </svg>
                          {batchUrls.length}개 URL 일괄 스캔 시작
                        </>
                      )}
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* ── 메인 ── */}
      <main className={layout.main} style={{ margin: "0 auto", width: "100%", maxWidth: 1152, flex: 1, padding: "32px 16px" }}>

        {/* ── 단일 URL: 로딩 + 결과 ── */}
        {mode === "single" && (
          <>
            <AnimatePresence>
              {loading && (
                <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <LoadingSection dark={dark} elapsed={elapsed} stagePct={stage.pct} stageLabel={stage.label} />
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {!loading && result && (
                <motion.div
                  key="result"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  style={{ display: "flex", flexDirection: "column", gap: 24 }}
                >
                  <ResultView result={result} dark={dark} tab={tab} onTabChange={setTab} />
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}

        {/* ── 배치 결과 ── */}
        {mode === "batch" && batchResults.length > 0 && (
          <AnimatePresence>
            <motion.div
              key="batch-results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <BatchResultsList
                results={batchResults}
                currentIdx={batchCurrentIdx}
                running={batchRunning}
                elapsed={elapsed}
                dark={dark}
              />
            </motion.div>
          </AnimatePresence>
        )}
      </main>

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
              <ActivitiesTab items={result.success ? result.items : []} dark={dark} />
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

// ── 액티비티 카드 ─────────────────────────────────────────────────────
const ACCENT_COLORS = ["#3b82f6","#8b5cf6","#10b981","#f59e0b","#ef4444","#06b6d4"];

function ActivityCard({ item, index, dark }: { item: TargetActivityItem; index: number; dark: boolean }) {
  const accentColor = ACCENT_COLORS[index % ACCENT_COLORS.length];
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
          <div className={s.infoRow}>
            <span className={s.label}>SDK</span>
            <SdkStatusBadge status={item.sdkType as SdkStatus} dark={dark} showVersion />
          </div>
        )}
      </div>
    </div>
  );
}

// ── SDK 상태 배지 ─────────────────────────────────────────────────────
function SdkStatusBadge({
  status, dark, showVersion, version,
}: {
  status: SdkStatus; dark: boolean; showVersion?: boolean; version?: string;
}) {
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

function CopyRow({ label, value, badge, dark, hoverCard, copyable = true }: {
  label: string; value: string; badge: BadgeColor; dark: boolean;
  hoverCard: ReturnType<typeof useHoverCardStyles>; copyable?: boolean;
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

// ── 스크린샷 탭 ───────────────────────────────────────────────────────
function ScreenshotTab({ screenshot, dark }: { screenshot: string; dark: boolean }) {
  const card  = useCardStyles();
  const modal = useModalStyles();
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);

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
                role="button" tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && setOpen(true)}
                aria-label="스크린샷 전체 화면으로 보기"
              >
                <img src={`data:image/jpeg;base64,${screenshot}`} alt="스캔 스크린샷 썸네일" className={modal.thumbImg} />
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

      <AnimatePresence>
        {open && (
          <motion.div
            className={modal.overlay}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              className={modal.modal}
              initial={{ scale: 0.88, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.88, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 26 }}
              onClick={(e) => e.stopPropagation()}
            >
              <img src={`data:image/jpeg;base64,${screenshot}`} alt="스캔 스크린샷 전체 화면" className={modal.img} />
              <div className={modal.caption}>
                <span>스캔 시점 스크린샷</span>
                <span style={{ opacity: 0.6, fontSize: 10 }}>ESC 또는 배경 클릭으로 닫기</span>
              </div>
              <button className={modal.closeBtn} onClick={() => setOpen(false)} aria-label="모달 닫기">
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
      <motion.div variants={fadeUp}>
        <div className={card.card}>
          <div className={card.cardHeader}>
            <h3 className={card.cardTitle}>SDK 진단</h3>
            <div className={db.rowBadges} style={{ marginTop: 6 }}>
              <SdkStatusBadge
                status={(debug.sdkType as SdkStatus) || "none"}
                dark={dark} showVersion version={debug.sdkVersion}
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
                <li key={i}
                  className={`${db.urlItem} ${/smetrics|tt\.omtrdc|interact|delivery/i.test(u) ? db.urlItemHighlight : ""}`}>
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

function parseStyle(_cls: string): React.CSSProperties { return {}; }

// ════════════════════════════════════════════════════════════════════
// 배치 스캔 결과 컴포넌트
// ════════════════════════════════════════════════════════════════════

// ── 전체 배치 결과 리스트 ─────────────────────────────────────────────
function BatchResultsList({ results, currentIdx, running, elapsed, dark }: {
  results: BatchResult[];
  currentIdx: number;
  running: boolean;
  elapsed: number;
  dark: boolean;
}) {
  const card = useCardStyles();

  const doneCount    = results.filter((r) => r.status === "done" || r.status === "error").length;
  const total        = results.length;
  const pct          = total > 0 ? Math.round((doneCount / total) * 100) : 0;
  const successCount = results.filter((r) => r.status === "done" && r.result?.success).length;
  const activityTotal = results
    .filter((r) => r.result?.success)
    .reduce((sum, r) => sum + (r.result?.success ? r.result.items.length : 0), 0);

  const currentUrl = currentIdx >= 0 && currentIdx < results.length
    ? results[currentIdx].url
    : null;

  return (
    <motion.div variants={stagger} initial="hidden" animate="show"
      style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* ── 진행 상황 헤더 카드 ── */}
      <motion.div variants={fadeUp}>
        <div className={card.card}>
          <div className={card.cardHeader}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
              <div>
                <h3 className={card.cardTitle}>
                  {running ? "일괄 스캔 진행 중…" : "일괄 스캔 완료"}
                </h3>
                <p className={card.cardDesc} style={{ marginTop: 4 }}>
                  {doneCount} / {total} 완료
                  {running
                    ? ` · 경과 ${elapsed}s`
                    : ` · 성공 ${successCount}개 · 총 ${activityTotal}개 액티비티`
                  }
                </p>
                {running && currentUrl && (
                  <p className={card.cardDesc} style={{ marginTop: 2, fontSize: 11 }}>
                    현재: <span style={{ fontFamily: "monospace" }}>{currentUrl}</span>
                  </p>
                )}
              </div>

              {/* 엑셀 내보내기 버튼 */}
              {!running && doneCount > 0 && (
                <button
                  onClick={() => exportBatchResults(results)}
                  style={{
                    padding: "7px 14px", borderRadius: 7,
                    border: "1px solid hsl(var(--border))",
                    background: "hsl(var(--card))",
                    color: "hsl(var(--foreground))",
                    fontWeight: 500, fontSize: 12, cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 6,
                    transition: "all 0.15s",
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  결과 엑셀 다운로드
                </button>
              )}
            </div>

            {/* 프로그레스 바 */}
            <div style={{
              marginTop: 14, height: 6, background: "hsl(var(--muted))",
              borderRadius: 3, overflow: "hidden",
            }}>
              <div style={{
                height: "100%",
                width: `${running ? Math.max(pct, 2) : 100}%`,
                background: running ? "hsl(var(--primary))" : "#10b981",
                borderRadius: 3,
                transition: "width 0.5s ease",
              }} />
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── URL별 결과 카드 ── */}
      {results.map((r, i) => (
        <motion.div key={`${r.url}-${i}`} variants={fadeUp}>
          <BatchResultRow result={r} index={i} dark={dark} isCurrent={i === currentIdx} />
        </motion.div>
      ))}
    </motion.div>
  );
}

// ── 개별 URL 결과 행 ─────────────────────────────────────────────────
function BatchResultRow({ result, index, dark, isCurrent }: {
  result: BatchResult; index: number; dark: boolean; isCurrent: boolean;
}) {
  const card = useCardStyles();
  const [expanded, setExpanded] = useState(false);

  const isSuccess = result.status === "done" && result.result?.success;
  const isWarn    = result.status === "done" && !result.result?.success;
  const isError   = result.status === "error";

  const borderColor = isCurrent
    ? "hsl(var(--primary))"
    : isSuccess ? "#10b981"
    : isWarn || isError ? "#f59e0b"
    : "hsl(var(--border))";

  const activityCount = result.result?.success ? result.result.items.length : null;
  const sdkType = result.result?.success
    ? (result.result.items[0]?.sdkType ?? result.result.debug?.sdkType ?? "")
    : (result.result?.debug?.sdkType ?? "");

  function StatusIcon() {
    if (result.status === "pending") return (
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: "hsl(var(--muted-foreground))", display: "inline-block", opacity: 0.5 }} />
    );
    if (result.status === "scanning") return (
      <svg style={{ animation: "spin 1s linear infinite" }}
        xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24"
        fill="none" stroke="hsl(var(--primary))" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
      </svg>
    );
    if (isSuccess) return (
      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24"
        fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6 9 17l-5-5"/>
      </svg>
    );
    if (isWarn) return (
      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24"
        fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
        <path d="M12 9v4"/><path d="M12 17h.01"/>
      </svg>
    );
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24"
        fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>
      </svg>
    );
  }

  return (
    <div className={card.card} style={{ borderLeft: `3px solid ${borderColor}`, transition: "border-color 0.3s" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        {/* 상태 아이콘 */}
        <div style={{ flexShrink: 0, width: 20, display: "flex", justifyContent: "center", paddingTop: 2 }}>
          <StatusIcon />
        </div>

        {/* URL + 서브텍스트 */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 12, fontWeight: 500,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            color: isCurrent ? "hsl(var(--primary))" : "hsl(var(--foreground))",
          }}>
            {result.url}
          </div>

          {result.status === "pending" && (
            <div style={{ fontSize: 11, color: "hsl(var(--muted-foreground))", marginTop: 2 }}>대기 중</div>
          )}
          {result.status === "scanning" && (
            <div style={{ fontSize: 11, color: "hsl(var(--primary))", marginTop: 2 }}>스캔 중…</div>
          )}
          {(result.status === "done" || result.status === "error") && (
            <div style={{ fontSize: 11, color: "hsl(var(--muted-foreground))", marginTop: 2, display: "flex", gap: 10, flexWrap: "wrap" }}>
              {sdkType && <span>{sdkType}</span>}
              {activityCount !== null && (
                <span style={{ color: activityCount > 0 ? "#10b981" : "hsl(var(--muted-foreground))" }}>
                  {activityCount > 0 ? `${activityCount}개 액티비티` : "액티비티 없음"}
                </span>
              )}
              {isError && (
                <span style={{ color: "#ef4444" }}>오류 발생</span>
              )}
            </div>
          )}
        </div>

        {/* 오른쪽: 배지 + 펼치기 버튼 */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          {activityCount !== null && activityCount > 0 && (
            <span style={{
              padding: "2px 8px", borderRadius: 10,
              background: "hsl(221 83% 53% / 0.12)",
              color: "hsl(var(--primary))",
              fontSize: 11, fontWeight: 600,
            }}>
              {activityCount}
            </span>
          )}

          {(result.status === "done" || result.status === "error") && (
            <button
              onClick={() => setExpanded((v) => !v)}
              style={{
                padding: "4px 10px", borderRadius: 6,
                border: "1px solid hsl(var(--border))",
                background: "none", cursor: "pointer",
                fontSize: 11, color: "hsl(var(--muted-foreground))",
                display: "flex", alignItems: "center", gap: 4,
                transition: "all 0.15s",
              }}
            >
              {expanded ? "접기" : "상세"}
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
                <path d="m6 9 6 6 6-6"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* ── 상세 펼침 ── */}
      <AnimatePresence>
        {expanded && result.result && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22 }}
            style={{ overflow: "hidden" }}
          >
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid hsl(var(--border))" }}>
              {result.result.success && result.result.items.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {result.result.items.map((item, i) => (
                    <div key={i} style={{
                      padding: "9px 12px", borderRadius: 8,
                      background: "hsl(var(--muted))", fontSize: 12,
                      borderLeft: `3px solid ${ACCENT_COLORS[i % ACCENT_COLORS.length]}`,
                    }}>
                      <div style={{ fontWeight: 600, marginBottom: 5 }}>
                        {item.activityName || `Activity #${item.activityId}`}
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "3px 16px", color: "hsl(var(--muted-foreground))" }}>
                        <span>Activity ID: <strong style={{ color: "hsl(var(--foreground))" }}>{item.activityId}</strong></span>
                        {item.experienceId && (
                          <span>Experience ID: <strong style={{ color: "hsl(var(--foreground))" }}>{item.experienceId}</strong></span>
                        )}
                        {item.experienceName && (
                          <span>Experience: <strong style={{ color: "hsl(var(--foreground))" }}>{item.experienceName}</strong></span>
                        )}
                        {item.scope && (
                          <span>Scope: <strong style={{ color: "hsl(var(--foreground))" }}>{item.scope}</strong></span>
                        )}
                        {item.sdkType && (
                          <span>SDK: <strong style={{ color: "hsl(var(--foreground))" }}>{item.sdkType}</strong></span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{
                  fontSize: 12, color: "hsl(var(--muted-foreground))",
                  padding: "6px 0", lineHeight: 1.6,
                }}>
                  {result.result.success ? "발견된 액티비티 없음" : result.result.error}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
