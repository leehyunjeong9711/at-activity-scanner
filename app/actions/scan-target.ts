"use server";

import { chromium } from "rebrowser-playwright";

export type TargetActivityItem = {
  activityId: string;
  experienceId: string;
  scope: string;
  sdkType?: string;
  activityName?: string;
  experienceName?: string;
};

export type DebugInfo = {
  screenshotBase64: string;
  allRequests: string[];
  interactRequests: string[];
  sdkType: string;
  sdkVersion: string;
  rawSdkData: string;
};

export type ScanResult =
  | { success: true;  items: TargetActivityItem[]; debug?: DebugInfo }
  | { success: false; error: string;               debug?: DebugInfo };

function dedupe(items: TargetActivityItem[]): TargetActivityItem[] {
  const seen = new Set<string>();
  return items.filter((it) => {
    const key = `${it.activityId}:${it.experienceId}:${it.scope}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ── AEP Edge / Alloy 응답 구조 파싱 ─────────────────────────────────
function parseTargetData(raw: unknown): TargetActivityItem[] {
  const items: TargetActivityItem[] = [];
  if (!raw || typeof raw !== "object") return items;

  function walkProposition(prop: Record<string, unknown>) {
    const sd       = prop.scopeDetails as Record<string, unknown> | undefined;
    const activity = (sd?.activity ?? prop.activity) as Record<string, unknown> | undefined;
    const exp      = (sd?.experience ?? prop.experience) as Record<string, unknown> | undefined;

    // meta 필드 수집 (items[].meta 또는 items[].data.content 안에 있기도 함)
    const meta = (() => {
      if (!Array.isArray(prop.items)) return undefined;
      for (const it of prop.items as Record<string, unknown>[]) {
        const m = (it as Record<string, unknown>)?.meta as Record<string, unknown> | undefined;
        if (m) return m;
      }
    })();

    // activityId 탐색: scopeDetails.activity.id, AT:base64 디코딩, meta, responseTokens 등 여러 경로
    let activityId = String(
      activity?.id ??
      sd?.activityId ??
      prop.activityId ??
      meta?.["activity.id"] ??
      ""
    );

    // AT:base64 인코딩된 id 디코딩 (예: "AT:eyJhY3Rpdml0eUlkIjoiMTIzIiwiZXhwZXJpZW5jZUlkIjoiMCJ9")
    if (!activityId && typeof prop.id === "string" && prop.id.startsWith("AT:")) {
      try {
        const decoded = JSON.parse(Buffer.from(prop.id.slice(3), "base64").toString("utf-8")) as Record<string, unknown>;
        activityId = String(decoded.activityId ?? "");
      } catch {}
    }

    if (!activityId || activityId === "undefined" || activityId === "") return;

    let experienceId = String(
      exp?.id ?? sd?.experienceId ?? prop.experienceId ?? meta?.["experience.id"] ?? ""
    );
    // AT:base64에서 experienceId 디코딩
    if (!experienceId && typeof prop.id === "string" && prop.id.startsWith("AT:")) {
      try {
        const decoded = JSON.parse(Buffer.from(prop.id.slice(3), "base64").toString("utf-8")) as Record<string, unknown>;
        experienceId = String(decoded.experienceId ?? "");
      } catch {}
    }

    items.push({
      activityId,
      experienceId,
      scope:          String(prop.scope  ?? sd?.scope          ?? ""),
      activityName:   String(activity?.name ?? meta?.["activity.name"]   ?? ""),
      experienceName: String(exp?.name       ?? meta?.["experience.name"] ?? ""),
    });
  }

  function dig(obj: unknown) {
    if (!obj || typeof obj !== "object") return;
    const o = obj as Record<string, unknown>;

    // handle[].payload (AEP Edge 네트워크 응답)
    if (Array.isArray(o.handle)) {
      for (const h of o.handle as Record<string, unknown>[]) {
        if (Array.isArray(h?.payload)) {
          for (const p of h.payload as Record<string, unknown>[]) walkProposition(p);
        }
      }
    }
    // propositions / decisions / content (Alloy sendEvent 반환값)
    for (const key of ["propositions", "decisions", "content"]) {
      if (Array.isArray(o[key])) {
        for (const p of o[key] as Record<string, unknown>[]) walkProposition(p);
      }
    }
    // events[].decisions (일부 응답 포맷)
    if (Array.isArray(o.events)) {
      for (const ev of o.events as Record<string, unknown>[]) {
        dig(ev);
      }
    }
    // execute.mboxes / prefetch.mboxes (at.js batch 응답)
    for (const section of ["execute", "prefetch"] as const) {
      const exec = o[section] as Record<string, unknown> | undefined;
      if (!exec) continue;
      const parts = [
        exec.pageLoad,
        ...(Array.isArray(exec.mboxes) ? exec.mboxes : []),
        ...(Array.isArray(exec.views)  ? exec.views  : []),
      ];
      for (const sec of parts) {
        if (!sec || typeof sec !== "object") continue;
        const s = sec as Record<string, unknown>;
        for (const opt of (Array.isArray(s.options) ? s.options : []) as Record<string, unknown>[]) {
          const rt = opt.responseTokens as Record<string, unknown> | undefined;
          const aid = String(rt?.["activity.id"] ?? "");
          if (aid && aid !== "undefined") {
            items.push({
              activityId:     aid,
              experienceId:   String(rt?.["experience.id"]   ?? ""),
              scope:          String(rt?.["activity.scope"]  ?? s.name ?? ""),
              activityName:   String(rt?.["activity.name"]   ?? ""),
              experienceName: String(rt?.["experience.name"] ?? ""),
            });
          }
        }
      }
    }
  }

  dig(raw);
  return items;
}

export async function scanTargetActivity(url: string): Promise<ScanResult> {
  const trimmed = url.trim();
  if (!trimmed) return { success: false, error: "URL을 입력해 주세요." };

  let parsed: URL;
  try { parsed = new URL(trimmed); }
  catch { return { success: false, error: "올바른 URL 형식이 아닙니다." }; }
  if (!["http:", "https:"].includes(parsed.protocol))
    return { success: false, error: "http 또는 https URL만 지원합니다." };

  // 디버그 파라미터 추가
  const scanUrl = (() => {
    const u = new URL(trimmed);
    u.searchParams.set("mboxDebug",   "1");
    u.searchParams.set("alloy_debug", "true");
    return u.toString();
  })();

  // 서버 환경(Render 등 X서버 없음)에서는 headless 강제 적용
  const isServer = !process.env.DISPLAY && process.env.NODE_ENV === "production";
  const headless = isServer ? true : false;

  const stealthArgs = [
    "--disable-blink-features=AutomationControlled",
    "--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage",
    "--no-first-run", "--no-default-browser-check",
    "--disable-gpu",          // 컨테이너 환경 GPU 없음
    "--no-zygote",            // container 프로세스 격리 문제 방지
    ...(headless ? [] : ["--window-position=-2400,-2400"]),
  ];

  let browser;
  try {
    // 서버 환경에서는 channel:"chrome" 시도 생략 (Chrome 미설치)
    if (!isServer) {
      try {
        browser = await chromium.launch({ headless, channel: "chrome", args: stealthArgs });
      } catch { /* Chrome 없을 시 아래 fallback */ }
    }
    if (!browser) {
      browser = await chromium.launch({ headless, args: stealthArgs });
    }
  } catch (e) {
    return { success: false, error: `브라우저 실행 실패: ${(e as Error).message}` };
  }

  const allRequestUrls: string[]       = [];
  const interactRequestUrls: string[]  = [];
  const networkItems: TargetActivityItem[] = [];
  let screenshotBase64 = "";
  let sdkType    = "none";
  let sdkVersion = "unknown";
  let rawSdkData = "";

  try {
    const isUK = /samsung\.com\/uk/i.test(trimmed);
    const isJP = /samsung\.com\/jp|jpn/i.test(trimmed);
    const locale     = isJP ? "ja-JP" : isUK ? "en-GB" : "en-US";
    const acceptLang = isJP ? "ja-JP,ja;q=0.9" : isUK ? "en-GB,en;q=0.9" : "en-US,en;q=0.9";

    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/131.0.6778.265 Safari/537.36",
      ignoreHTTPSErrors: true,
      viewport:  { width: 1440, height: 900 },
      locale,
      timezoneId: isJP ? "Asia/Tokyo" : isUK ? "Europe/London" : "America/New_York",
      extraHTTPHeaders: {
        "Accept-Language":    acceptLang,
        "sec-ch-ua":          '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
        "sec-ch-ua-mobile":   "?0",
        "sec-ch-ua-platform": '"Windows"',
      },
    });

    // stealth
    await context.addInitScript(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => undefined });
      const w = window as unknown as Record<string, unknown>;
      if (!w.chrome) w.chrome = { runtime: {} };
    });

    const page = await context.newPage();

    // ── ★ window.alloy 정의 시점 가로채기 ★ ─────────────────────────
    // Samsung Launch가 window.alloy = fn 하는 순간 래퍼 주입
    // → Samsung이 자연 발화하는 모든 alloy() 호출 결과를 자동 수집
    await page.addInitScript(() => {
      const w = window as unknown as Record<string, unknown>;
      w.__alloyLog = [] as { cmd: string; result: string }[];

      let _real: ((cmd: string, ...a: unknown[]) => Promise<unknown>) | null = null;

      const wrap = (fn: (cmd: string, ...a: unknown[]) => Promise<unknown>) => {
        return function (cmd: string, ...args: unknown[]) {
          const p = fn.apply(window, [cmd, ...args] as [string, ...unknown[]]);
          p.then((res: unknown) => {
            (w.__alloyLog as { cmd: string; result: string }[]).push({
              cmd,
              result: JSON.stringify(res ?? null),
            });
          }).catch(() => {});
          return p;
        } as (cmd: string, ...a: unknown[]) => Promise<unknown>;
      };

      try {
        Object.defineProperty(window, "alloy", {
          configurable: true,
          get() { return _real; },
          set(fn: (cmd: string, ...a: unknown[]) => Promise<unknown>) {
            _real = wrap(fn);
          },
        });
      } catch {
        // defineProperty 실패 시 단순 폴링으로 폴백
        let done = false;
        const tid = setInterval(() => {
          if (done) return;
          const existing = w.alloy as ((cmd: string, ...a: unknown[]) => Promise<unknown>) | undefined;
          if (existing && typeof existing === "function" && !(existing as unknown as { __wrapped?: boolean }).__wrapped) {
            const wrapped = wrap(existing);
            (wrapped as unknown as { __wrapped: boolean }).__wrapped = true;
            w.alloy = wrapped;
            done = true;
            clearInterval(tid);
          }
        }, 50);
      }

      // sessionStorage 디버그 플래그
      try { sessionStorage.setItem("at_check",    "true"); } catch {}
      try { sessionStorage.setItem("mboxDebug",   "true"); } catch {}
      try { sessionStorage.setItem("alloy_debug", "true"); } catch {}
    });

    // TrustArc autoblock 무력화 — context 레벨로 iframe 포함 전체 차단
    await context.route(/trustarc\.com\/autoblockasset/i, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/javascript; charset=utf-8",
        body: "/* autoblock disabled */",
      });
    });

    // TrustArc 동의 쿠키 + localStorage 주입
    const cookieDomain = "." + parsed.hostname.split(".").slice(-2).join(".");
    const rootDomain   = parsed.hostname.split(".").slice(-2).join(".");
    const nowIso = new Date().toISOString();
    await context.addCookies([
      { name: "cmapi_cookie_privacy",   value: "permit 1,2,3", domain: cookieDomain, path: "/", httpOnly: false, secure: false, sameSite: "Lax" },
      { name: "notice_behavior",        value: "expressed,eu",  domain: cookieDomain, path: "/", httpOnly: false, secure: false, sameSite: "Lax" },
      { name: "notice_gdpr_prefs",      value: "0,1,2:",        domain: cookieDomain, path: "/", httpOnly: false, secure: false, sameSite: "Lax" },
      { name: "cm_default_preferences", value: "permit 1,2,3",  domain: cookieDomain, path: "/", httpOnly: false, secure: false, sameSite: "Lax" },
      { name: "notice_poptime",         value: nowIso,          domain: cookieDomain, path: "/", httpOnly: false, secure: false, sameSite: "Lax" },
      // 도메인 없는 버전도 추가 (samsung.com)
      { name: "cmapi_cookie_privacy",   value: "permit 1,2,3", domain: rootDomain, path: "/", httpOnly: false, secure: false, sameSite: "Lax" },
      { name: "notice_behavior",        value: "expressed,eu",  domain: rootDomain, path: "/", httpOnly: false, secure: false, sameSite: "Lax" },
    ]);
    await context.addInitScript(() => {
      // localStorage TrustArc 동의값
      const kv: [string, string][] = [
        ["truste.eu.cookie.cmapi_cookie_privacy",   "permit 1,2,3"],
        ["truste.eu.cookie.notice_behavior",        "expressed,eu"],
        ["truste.eu.cookie.notice_gdpr_prefs",      "0,1,2:"],
        ["truste.eu.cookie.cm_default_preferences", "permit 1,2,3"],
      ];
      for (const [k, v] of kv) { try { localStorage.setItem(k, v); } catch {} }

      // TrustArc CMA API를 페이지 로드 전부터 mock
      const w = window as unknown as Record<string, unknown>;
      const mockCma = {
        callApi: (name: string, _domain: unknown, cb: ((r: unknown) => void) | undefined) => {
          if (name === "getGDPRConsentDecision" || name === "getConsent") {
            if (typeof cb === "function") cb({ consentDecision: 1 });
          }
        },
      };
      const existingTruste = (w.truste as Record<string, unknown> | undefined) ?? {};
      w.truste = { ...existingTruste, cma: mockCma };

      // GTM dataLayer 선점 — Launch 룰이 trustarc 관련 이벤트를 기다리는 경우 대비
      w.dataLayer = w.dataLayer ?? [];
    });

    // ── context 수준 응답 리스너 (page + iframe + SW 포함) ────────────
    const isInteract = (u: string) =>
      /v1\/interact|interact\?configId|smetrics|tt\.omtrdc\.net|\/delivery/i.test(u);

    context.on("request", (req) => {
      const u = req.url();
      if (allRequestUrls.length < 150) allRequestUrls.push(u);
      if (isInteract(u)) interactRequestUrls.push(u);
    });

    context.on("response", async (response) => {
      if (!isInteract(response.url())) return;
      const shortUrl = response.url().slice(0, 100);
      const status   = response.status();
      rawSdkData += `\n[network-response] HTTP${status} ${shortUrl}`;
      try {
        if (status < 200 || status >= 300) {
          rawSdkData += ` (skip: non-2xx)`;
          return;
        }
        const text = await response.text().catch((e: Error) => {
          rawSdkData += ` (text-read-error: ${e.message})`;
          return "";
        });
        if (!text) {
          rawSdkData += ` (empty body)`;
          return;
        }
        // 응답 바디 앞부분 기록 (디버그)
        rawSdkData += `\nbody-preview: ${text.slice(0, 800)}`;

        let body: unknown;
        try { body = JSON.parse(text); }
        catch {
          const m = text.match(/\{[\s\S]*\}/);
          if (m) { try { body = JSON.parse(m[0]); } catch {} }
        }
        if (body) {
          const parsed = parseTargetData(body);
          rawSdkData += `\nparsed-items: ${parsed.length}`;
          networkItems.push(...parsed);
        } else {
          rawSdkData += `\n(JSON parse failed)`;
        }
      } catch (e) {
        rawSdkData += `\n[response-catch] ${(e as Error).message}`;
      }
    });

    // ── 페이지 로드 (최대 45초, load 이벤트까지 기다려야 스크립트 실행됨) ──
    const res = await page.goto(scanUrl, { waitUntil: "load", timeout: 45000 });
    if (!res || !res.ok())
      return { success: false, error: `페이지 로드 실패 (HTTP ${res?.status() ?? "unknown"})` };

    // 동의 버튼 클릭 시도
    await new Promise((r) => setTimeout(r, 1500));
    for (const sel of [
      "#truste-consent-button",
      "#truste-show-consent",
      ".truste-button-2",
      "[data-testid='consent-accept']",
      "button[aria-label*='Accept']",
      "button[aria-label*='accept']",
    ]) {
      await page.locator(sel).first().click({ timeout: 800 }).catch(() => {});
    }

    // ── TrustArc 동의 이벤트 강제 발화 ────────────────────────────────
    // Samsung Launch 룰이 TrustArc JS 이벤트를 기다리는 경우 커버
    await page.evaluate(() => {
      const w = window as unknown as Record<string, unknown>;

      // 1. truste.cma.callApi 실시간 override (이미 로드됐을 경우)
      const truste = (w.truste as Record<string, unknown> | undefined);
      if (truste) {
        truste.cma = {
          callApi: (name: string, _domain: unknown, cb: ((r: unknown) => void) | undefined) => {
            if (name === "getGDPRConsentDecision" || name === "getConsent") {
              if (typeof cb === "function") cb({ consentDecision: 1 });
            }
          },
        };
      }

      // 2. GTM dataLayer 이벤트 (Samsung Launch가 dataLayer를 polling할 때)
      const dl = (w.dataLayer as unknown[]) ?? [];
      w.dataLayer = dl;
      for (const evtName of [
        "trustarc_consent_given",
        "consent_given",
        "truste_consent",
        "consentGranted",
        "CookieConsentGranted",
        "OneTrustGroupsUpdated",
      ]) {
        dl.push({ event: evtName, consent_given: true });
      }

      // 3. DOM CustomEvent (Adobe Launch direct event 리스너)
      for (const evtName of [
        "consent_updated",
        "truste.eu.cookie",
        "TrustArcConsentGiven",
        "trustarc:consent:accepted",
        "cmapi_consent_loaded",
      ]) {
        try {
          document.dispatchEvent(new CustomEvent(evtName, {
            bubbles: true,
            detail: { category: "C0001,C0002,C0003,C0004", consent: true },
          }));
        } catch { /* ignore */ }
      }

      // 4. postMessage (TrustArc iframe → parent 통신 채널 모방)
      try {
        window.postMessage({ type: "consent_update",   cmapi_cookie_privacy: "permit 1,2,3" }, "*");
        window.postMessage({ name: "trustarc_consent", status: "accept" }, "*");
      } catch { /* ignore */ }
    });

    // 사용자 인터랙션 시뮬레이션 (Launch Rule 트리거 조건)
    await new Promise((r) => setTimeout(r, 800));
    await page.mouse.move(720, 400).catch(() => {});
    for (let y = 0; y <= 600; y += 300) {
      await page.evaluate((sy) => window.scrollTo({ top: sy, behavior: "smooth" }), y);
      await new Promise((r) => setTimeout(r, 200));
    }

    // SDK 초기화 대기 (최대 10초)
    await page.waitForFunction(() => {
      const w = window as unknown as Record<string, unknown>;
      return typeof w.alloy === "function" ||
        typeof (w.adobe as Record<string, unknown> | undefined)?.target !== "undefined";
    }, { timeout: 10000 }).catch(() => {});

    // ── SDK 초기화 후 TrustArc 동의 이벤트 2차 발화 ─────────────────
    // Launch 룰 리스너가 늦게 등록되는 경우를 커버
    await page.evaluate(() => {
      const w = window as unknown as Record<string, unknown>;
      const truste = w.truste as Record<string, unknown> | undefined;
      if (truste) {
        truste.cma = {
          callApi: (name: string, _d: unknown, cb: ((r: unknown) => void) | undefined) => {
            if (name === "getGDPRConsentDecision" || name === "getConsent") {
              if (typeof cb === "function") cb({ consentDecision: 1 });
            }
          },
        };
      }
      const dl = (w.dataLayer as unknown[]) ?? [];
      w.dataLayer = dl;
      for (const evtName of ["trustarc_consent_given", "consent_given", "truste_consent", "consentGranted"]) {
        dl.push({ event: evtName, consent_given: true });
      }
      for (const evtName of ["consent_updated", "truste.eu.cookie", "TrustArcConsentGiven", "cmapi_consent_loaded"]) {
        try {
          document.dispatchEvent(new CustomEvent(evtName, {
            bubbles: true,
            detail: { category: "C0001,C0002,C0003,C0004", consent: true },
          }));
        } catch { /* ignore */ }
      }
      try { window.postMessage({ type: "consent_update", cmapi_cookie_privacy: "permit 1,2,3" }, "*"); } catch { /* ignore */ }
    });

    // ── 비동기 Target 응답 완료 대기 (5초) ───────────────────────────
    await new Promise((r) => setTimeout(r, 5000));

    // ── SDK 존재 확인 (alloyLog 여부와 무관하게 먼저 체크) ────────────
    const sdkPresence = await page.evaluate(() => {
      const w = window as unknown as Record<string, unknown>;
      const hasAlloy  = typeof w.alloy === "function";
      const hasTarget = !!(w.adobe as Record<string, unknown> | undefined)?.target;
      let version = "unknown";
      if (hasAlloy) {
        try {
          const log = (w.__alloyLog as { cmd: string; result: string }[] | undefined) ?? [];
          const info = log.find((e) => e.cmd === "getLibraryInfo");
          if (info) {
            const parsed = JSON.parse(info.result) as Record<string, unknown>;
            version = String((parsed?.libraryInfo as Record<string, unknown>)?.version ?? "unknown");
          }
        } catch {}
      }
      if (hasTarget) {
        try {
          const t = (w.adobe as Record<string, unknown>).target as Record<string, unknown>;
          const info = (t.getLibraryInfo as () => Record<string, unknown>)();
          version = String(info?.version ?? "unknown");
        } catch {}
      }
      return { hasAlloy, hasTarget, version };
    });

    if (sdkPresence.hasAlloy)  { sdkType = "WebSDK"; sdkVersion = sdkPresence.version; }
    if (sdkPresence.hasTarget) { sdkType = "at.js";  sdkVersion = sdkPresence.version; }

    // ── Samsung Launch가 발화한 alloy 호출 결과 수집 ─────────────────
    const alloyLog = await page.evaluate(
      () => (window as unknown as Record<string, unknown>).__alloyLog as { cmd: string; result: string }[] ?? []
    );
    rawSdkData += `\n[alloyLog-count] ${alloyLog.length}건`;

    let sdkDetected = sdkPresence.hasAlloy || sdkPresence.hasTarget;
    for (const entry of alloyLog) {
      if (entry.cmd === "getLibraryInfo") {
        try {
          const info = JSON.parse(entry.result) as Record<string, unknown>;
          sdkVersion = String((info?.libraryInfo as Record<string, unknown>)?.version ?? sdkVersion);
        } catch {}
      }
      if (entry.cmd === "sendEvent") {
        rawSdkData += `\n[alloy-sendEvent] ${entry.result.slice(0, 1500)}`;
        try {
          networkItems.push(...parseTargetData(JSON.parse(entry.result)));
        } catch {}
      }
    }

    // ── at.js getOffers 폴백 ──────────────────────────────────────────
    if (networkItems.length === 0 && sdkDetected && sdkType === "at.js") {
      const atResult = await page.evaluate(async () => {
        const w   = window as unknown as Record<string, unknown>;
        const t   = (w.adobe as Record<string, unknown> | undefined)?.target as Record<string, unknown> | undefined;
        if (!t) return null;
        try {
          return await new Promise<string>((resolve, reject) => {
            (t.getOffers as (o: unknown) => void)({
              request: { execute: { pageLoad: {} } },
              success: (r: unknown) => resolve(JSON.stringify(r)),
              error:   (e: unknown) => reject(new Error(String(e))),
            });
          });
        } catch (e) { return `__error__:${(e as Error).message}`; }
      });
      if (atResult && !atResult.startsWith("__error__")) {
        rawSdkData += `\n[at.js-getOffers] ${atResult.slice(0, 1000)}`;
        try { networkItems.push(...parseTargetData(JSON.parse(atResult))); } catch {}
      }
    }

    // ── 결과 없으면: sendEvent 직접 호출 (폴백) ────────────────────────
    if (networkItems.length === 0 && sdkDetected && sdkType === "WebSDK") {
      const fallbackResult = await page.evaluate(async () => {
        const w = window as unknown as Record<string, unknown>;
        if (typeof w.alloy !== "function") return null;
        const alloy = w.alloy as (cmd: string, opts?: unknown) => Promise<unknown>;
        try {
          const result = await alloy("sendEvent", {
            renderDecisions: true,
            personalization: { sendDisplayEvent: false },
            xdm: {
              eventType: "decisioning.propositionFetch",
              web: {
                webPageDetails: { URL: window.location.href },
                webReferrer:    { URL: document.referrer },
              },
              timestamp: new Date().toISOString(),
            },
          });
          return JSON.stringify(result);
        } catch (e) {
          return `__error__:${(e as Error).message}`;
        }
      });

      if (fallbackResult && !fallbackResult.startsWith("__error__")) {
        rawSdkData += `\n[fallback-sendEvent] ${fallbackResult.slice(0, 1200)}`;
        try { networkItems.push(...parseTargetData(JSON.parse(fallbackResult))); } catch {}
        await new Promise((r) => setTimeout(r, 3000));
      } else {
        rawSdkData += `\n[fallback-error] ${fallbackResult ?? "null"}`;
      }
    }

    // sdkDetected가 false면 sdkType도 none으로 보정
    if (!sdkDetected) sdkType = "none";

    // ── 스크린샷 (JPEG 저품질로 크기 최소화) ──────────────────────────
    try {
      screenshotBase64 = (
        await page.screenshot({ type: "jpeg", quality: 60, fullPage: false, clip: { x: 0, y: 0, width: 1440, height: 600 } })
      ).toString("base64");
    } catch {}

    // ── 결과 조합 ─────────────────────────────────────────────────────
    const debug: DebugInfo = {
      screenshotBase64,
      allRequests:      allRequestUrls,
      interactRequests: interactRequestUrls,
      sdkType:    sdkType    || "none",
      sdkVersion: sdkVersion || "unknown",
      rawSdkData: (rawSdkData || "(없음)").slice(0, 8000),
    };

    if (sdkType === "none") {
      return {
        success: false,
        error: "Adobe Target이 설치되지 않았습니다. (window.alloy 및 window.adobe.target 모두 감지 안 됨)",
        debug,
      };
    }

    const items = dedupe(networkItems.map((it) => ({ ...it, sdkType })));

    if (items.length === 0) {
      const interactCount = interactRequestUrls.length;
      const alloyCallCount = alloyLog.filter((e) => e.cmd === "sendEvent").length;
      return {
        success: false,
        error:
          `${sdkType} v${sdkVersion} 감지. ` +
          `interact 네트워크 ${interactCount}건, alloy sendEvent 호출 ${alloyCallCount}건.\n` +
          (interactCount === 0 && alloyCallCount === 0
            ? "→ TrustArc가 여전히 Alloy 실행을 막고 있거나, Launch Rule 조건 미충족일 수 있습니다."
            : "→ interact 요청은 발생했으나 활성 액티비티 없음(대상 고객 조건 미충족 등).") +
          `\nSDK 응답 일부: ${rawSdkData.slice(0, 300)}`,
        debug,
      };
    }

    return { success: true, items, debug };

  } catch (e) {
    return { success: false, error: `스캔 중 오류: ${(e as Error).message}` };
  } finally {
    await browser?.close().catch(() => {});
  }
}
