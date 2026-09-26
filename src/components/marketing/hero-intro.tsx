"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

const FRAMES = ["signup", "pay", "console", "copy", "scan"] as const;
type Frame = (typeof FRAMES)[number];
const ANSWER_STEPS = [
  ["kakao", 6000],
  ["line", 3000],
  ["youtube", 2000],
  ["netflix", 2000],
  ["zoom", 2000],
  ["teams", 2000],
  ["webex", 2000],
  ["backup", 2000],
  ["ping", 3000],
] as const;
type Answer = (typeof ANSWER_STEPS)[number][0];
type Beat = { kind: "q" | "note" | "closing"; text: string; n?: number };

const SHRINK_MS = 3000;
const LINE_MS = 2000;
const NOTE_MS = 1000;
const FRAME_MS = 2000;
const FIRST_MS = FRAMES.length * FRAME_MS;
const ANSWER_TOTAL = ANSWER_STEPS.reduce((sum, step) => sum + step[1], 0);
const PLAY_MS = FIRST_MS + ANSWER_TOTAL;
const SAMPLE_EMAIL = "across@";

const SPOT = {
  email: { x: 40, y: 42 },
  pay: { x: 30, y: 68 },
  open: { x: 38, y: 74 },
  copy: { x: 72, y: 58 },
} as const;

const QR_CELLS = [
  "1111111000101111111",
  "1000001011101000001",
  "1011101001001011101",
  "1011101010101011101",
  "1011101000011011101",
  "1000001010111000001",
  "1111111010101111111",
  "0000000010010000000",
  "1100101110101110101",
  "0011010001110001011",
  "1100101110001010111",
  "0000000010110010100",
  "1111111010011101001",
  "1000001011100010110",
  "1011101000101111010",
  "1011101011010001101",
  "1011101000110110010",
  "1000001011101010111",
  "1111111001011101001",
] as const;

export function HeroIntro() {
  const t = useTranslations("heroDeck");
  const tAuth = useTranslations("auth");
  const tHybrid = useTranslations("services.hybrid");
  const [settled, setSettled] = useState(false);
  const [showAd, setShowAd] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [done, setDone] = useState<Beat[]>([]);
  const [typed, setTyped] = useState("");
  const [reduced, setReduced] = useState(false);
  const [previewMs, setPreviewMs] = useState(0);
  const [previewArmed, setPreviewArmed] = useState(false);
  const [runId, setRunId] = useState(0);
  const page1Ref = useRef<HTMLDivElement>(null);
  const page2Ref = useRef<HTMLDivElement>(null);
  const [glide, setGlide] = useState(true);
  const [cut, setCut] = useState(false);
  const [aim, setAim] = useState<{ x: number; y: number } | null>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (reduced) {
      setSettled(true);
      setShowAd(true);
      setDone(readBeats(t));
      setTyped("");
      setShowPreview(true);
      return;
    }

    const settleTimer = window.setTimeout(() => setSettled(true), 2000);
    const adTimer = window.setTimeout(() => setShowAd(true), 2000 + SHRINK_MS);
    return () => {
      window.clearTimeout(settleTimer);
      window.clearTimeout(adTimer);
    };
  }, [reduced, runId]);

  useEffect(() => {
    if (!showAd || reduced || showPreview) return;
    const beats = readBeats(t);
    let line = 0;
    let start = performance.now();

    const timer = window.setInterval(() => {
      if (document.hidden) return;
      const now = performance.now();
      const beat = beats[line];
      if (!beat) {
        window.clearInterval(timer);
        setShowPreview(true);
        return;
      }
      const duration = beat.kind === "note" ? NOTE_MS : LINE_MS;
      const count = Math.min(beat.text.length, Math.floor(((now - start) / duration) * beat.text.length));
      setTyped(beat.text.slice(0, count));
      if (now - start < duration) return;
      setDone((current) => [...current, beat]);
      setTyped("");
      line += 1;
      start = now;
      if (line >= beats.length) {
        window.clearInterval(timer);
        setShowPreview(true);
      }
    }, 40);

    return () => window.clearInterval(timer);
  }, [reduced, showAd, showPreview, runId]);

  useEffect(() => {
    if (!showPreview || reduced) return;
    const phone = window.matchMedia("(max-width: 767px)").matches;
    const page = page2Ref.current;
    const first = page1Ref.current;
    if (!phone || !page || !first) {
      setPreviewArmed(true);
      return;
    }
    const onFirst = Math.abs(first.getBoundingClientRect().top) < window.innerHeight * 0.35;
    if (!onFirst) {
      setPreviewArmed(true);
      return;
    }

    let frame = 0;
    frame = window.requestAnimationFrame(() => {
      frame = window.requestAnimationFrame(() => {
        const top = Math.round(page.getBoundingClientRect().top + window.scrollY);
        window.scrollTo({ top, behavior: "smooth" });
      });
    });
    const started = performance.now();
    const timer = window.setInterval(() => {
      const aligned = Math.abs(page.getBoundingClientRect().top) < 8;
      if (aligned || performance.now() - started > 1600) {
        setPreviewArmed(true);
        window.clearInterval(timer);
      }
    }, 50);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearInterval(timer);
    };
  }, [reduced, runId, showPreview]);

  useEffect(() => {
    if (!previewArmed || reduced) return;
    const origin = performance.now();
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      const elapsed = performance.now() - origin;
      if (elapsed >= PLAY_MS) {
        setPreviewMs(PLAY_MS);
        window.clearInterval(timer);
        return;
      }
      setPreviewMs(elapsed);
    }, 50);
    return () => window.clearInterval(timer);
  }, [previewArmed, reduced]);

  const frameIndex = Math.min(FRAMES.length - 1, Math.floor(Math.min(previewMs, FIRST_MS - 1) / FRAME_MS));
  const frame = FRAMES[frameIndex] ?? "signup";
  const local = reduced ? FRAME_MS : previewMs - frameIndex * FRAME_MS;
  const risen = reduced || previewMs >= FIRST_MS;
  const answerClock = reduced ? ANSWER_TOTAL : Math.max(0, previewMs - FIRST_MS);
  const answer = answerAt(answerClock);
  const beats = readBeats(t);
  const finished = !reduced && previewMs >= PLAY_MS;

  function replay() {
    dragStart.current = null;
    setCut(true);
    setGlide(false);
    setSettled(false);
    setShowAd(false);
    setShowPreview(false);
    setDone([]);
    setTyped("");
    setPreviewMs(0);
    setPreviewArmed(false);
    setAim(null);
    if (window.matchMedia("(max-width: 767px)").matches) {
      page1Ref.current?.scrollIntoView({ behavior: "auto", block: "start" });
    }
    setRunId((current) => current + 1);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setCut(false);
        setGlide(true);
      });
    });
  }

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (!finished) return;
    dragStart.current = { x: event.clientX, y: event.clientY };
  }

  function onPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    const start = dragStart.current;
    dragStart.current = null;
    if (!start || !finished) return;
    if (Math.hypot(event.clientX - start.x, event.clientY - start.y) < 36) replay();
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const start = dragStart.current;
    if (!start || !finished) return;
    if (Math.hypot(event.clientX - start.x, event.clientY - start.y) < 36) return;
    replay();
  }

  useEffect(() => {
    if (!showPreview) return;
    const root = document.querySelector("[data-preview-root]");
    const target = document.querySelector("[data-cursor-target]");
    if (!(root instanceof HTMLElement) || !(target instanceof HTMLElement)) return;
    const rootBox = root.getBoundingClientRect();
    const targetBox = target.getBoundingClientRect();
    if (rootBox.width === 0 || rootBox.height === 0) return;
    setAim({
      x: ((targetBox.left + targetBox.width / 2 - rootBox.left) / rootBox.width) * 100,
      y: ((targetBox.top + targetBox.height / 2 - rootBox.top) / rootBox.height) * 100,
    });
  }, [showPreview, previewMs, frame]);

  const glideClass = glide ? "duration-[3000ms]" : "duration-0";

  return (
    <div
      className="touch-pan-y max-md:relative md:absolute md:inset-0"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        dragStart.current = null;
      }}
    >
      <div
        ref={page1Ref}
        data-home-page
        className="relative h-dvh max-md:snap-start max-md:snap-always md:absolute md:inset-0 md:h-auto"
      >
      <div
        className={cn(
          "absolute z-10 flex flex-col transition-all ease-[cubic-bezier(0.22,1,0.36,1)]",
          glideClass,
          settled
            ? "top-16 left-0 h-[calc(50%-4rem)] w-1/2 items-center justify-center px-4 text-center max-md:w-full md:px-[clamp(1.25rem,3vw,2rem)]"
            : "top-0 left-0 h-full w-full items-center justify-center px-[clamp(1.25rem,4vw,2.5rem)] text-center"
        )}
      >
        <h1
          className={cn(
            "font-semibold tracking-[-0.04em] leading-[0.95] transition-all ease-[cubic-bezier(0.22,1,0.36,1)]",
            glideClass,
            settled ? "text-[clamp(1.45rem,6.5vw,2.15rem)] max-md:text-[clamp(2rem,10vw,2.75rem)] md:text-[clamp(2.5rem,6vw,4.75rem)]" : "text-[clamp(2.6rem,12vw,9rem)]"
          )}
        >
          AcrossFlare
        </h1>
        <p
          className={cn(
            "text-[#888888] transition-all ease-[cubic-bezier(0.22,1,0.36,1)]",
            glideClass,
            settled
              ? "mt-2 text-[clamp(0.65rem,2.4vw,0.8rem)] leading-snug max-md:text-[clamp(0.8rem,3.2vw,1rem)] md:mt-3 md:text-[clamp(0.95rem,1.5vw,1.35rem)]"
              : "mt-4 text-[clamp(0.75rem,2.2vw,1.25rem)] whitespace-nowrap md:mt-6"
          )}
        >
          Secure Cloud & Network Optimization
        </p>
      </div>

      <div
        className={cn(
          "absolute bottom-0 left-0 z-10 flex h-1/2 w-1/2 items-stretch p-3 pr-1.5 max-md:w-full max-md:pr-3 md:p-4 md:pr-2",
          cut ? "opacity-0 duration-0" : "transition-opacity duration-700",
          showAd && !cut ? "opacity-100" : "pointer-events-none opacity-0"
        )}
      >
        {cut ? null : (
          <div className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-2xl border border-border bg-card/80 px-3 py-2.5 backdrop-blur-sm sm:px-4 sm:py-3">
            <p className="shrink-0 text-center text-[clamp(0.95rem,2.2vw,1.25rem)] leading-tight font-semibold tracking-[-0.02em] text-foreground">
              {t("headline")}
            </p>
            <div className="mt-1.5 flex min-h-0 flex-1 flex-col justify-evenly">
              {beats.map((beat, index) => {
                const active = index === done.length && showAd && !showPreview;
                const text = index < done.length ? beat.text : active ? typed : "";
                return (
                  <div key={index} className={text || active ? undefined : "invisible"} aria-hidden={text || active ? undefined : true}>
                    <BeatLine beat={beat} text={text} caret={active} />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      </div>

      <div
        ref={page2Ref}
        data-home-page
        aria-hidden={showPreview ? undefined : true}
        className={cn(
          "absolute top-16 right-0 z-10 h-[calc(100%-4rem)] w-1/2 p-3 pl-1.5 md:p-4 md:pl-2",
          "max-md:static max-md:flex max-md:h-dvh max-md:w-full max-md:snap-start max-md:snap-always max-md:flex-col max-md:px-3 max-md:pt-16 max-md:pb-3 max-md:pl-3",
          cut ? "opacity-0 duration-0" : "transition-opacity duration-700",
          showPreview && !cut ? "opacity-100" : "pointer-events-none opacity-0 max-md:hidden"
        )}
      >
        {cut ? null : (
          <div className="relative h-full min-h-0 flex-1 overflow-hidden">
            <div data-preview-root className="relative h-full overflow-hidden rounded-2xl border border-border bg-[#0c0e14]">
              <PreviewFrame
                frame={frame}
                local={reduced ? FRAME_MS : local}
                emailLabel={tAuth("email")}
                passwordLabel={tAuth("password")}
                signup={tAuth("submitSignup")}
                pay={t("pay")}
                hybrid={tHybrid("title")}
                hybridDesc={tHybrid("description")}
                labels={t}
              />
              {risen ? null : <Cursor frame={frame} local={reduced ? 0 : local} aim={aim} />}
            </div>
            {showPreview ? (
              <div
                className={cn(
                  "absolute inset-0 z-30 transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]",
                  risen ? "translate-y-0" : "translate-y-full"
                )}
              >
                <div className="h-full overflow-hidden rounded-2xl border border-border bg-[#0c0e14]">
                  <AnswerFrame answer={answer.id} local={answer.local} labels={t} />
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

function readBeats(t: ReturnType<typeof useTranslations>) {
  const value = t.raw("items");
  const beats: Beat[] = [];
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      if (!item || typeof item !== "object") return;
      const row = item as { q?: unknown; note?: unknown };
      if (typeof row.q !== "string") return;
      beats.push({ kind: "q", text: row.q, n: index + 1 });
      if (typeof row.note === "string") beats.push({ kind: "note", text: row.note });
    });
  }
  const closing = t("closing");
  if (closing) beats.push({ kind: "closing", text: closing });
  return beats;
}

function answerAt(ms: number) {
  let rest = Math.max(0, ms);
  for (const [id, duration] of ANSWER_STEPS) {
    if (rest < duration) return { id, local: rest };
    rest -= duration;
  }
  const last = ANSWER_STEPS[ANSWER_STEPS.length - 1];
  return { id: last?.[0] ?? "ping", local: last?.[1] ?? 0 };
}

function BeatLine({ beat, text, caret = false }: { beat: Beat; text: string; caret?: boolean }) {
  const mark = caret ? (
    <span className="ml-0.5 inline-block h-[1em] w-px translate-y-0.5 bg-primary align-middle" />
  ) : null;
  if (beat.kind === "note") {
    return (
      <p className="pl-4 text-[clamp(0.68rem,1.45vw,0.8rem)] leading-tight text-muted-foreground">
        {text}
        {mark}
      </p>
    );
  }
  if (beat.kind === "closing") {
    return (
      <p className="text-center text-[clamp(0.75rem,1.6vw,0.95rem)] leading-tight font-medium text-foreground">
        {text}
        {mark}
      </p>
    );
  }
  return (
    <p className="text-[clamp(0.75rem,1.65vw,0.95rem)] leading-snug text-foreground/90">
      <span className="mr-1.5 tabular-nums text-muted-foreground">{beat.n}</span>
      {text}
      {mark}
    </p>
  );
}

function PreviewFrame({
  frame,
  local,
  emailLabel,
  passwordLabel,
  signup,
  pay,
  hybrid,
  hybridDesc,
  labels,
}: {
  frame: Frame;
  local: number;
  emailLabel: string;
  passwordLabel: string;
  signup: string;
  pay: string;
  hybrid: string;
  hybridDesc: string;
  labels: ReturnType<typeof useTranslations>;
}) {
  const emailFocus = frame === "signup" && local >= 400;
  const emailCount =
    frame === "signup" && local >= 650
      ? Math.min(SAMPLE_EMAIL.length, Math.ceil(((local - 650) / 1200) * SAMPLE_EMAIL.length))
      : 0;
  const payDown = frame === "pay" && local >= 780 && local < 1080;
  const openDown = frame === "console" && local >= 820 && local < 1120;
  const copyDown = frame === "copy" && local >= 760 && local < 1040;
  const copied = frame === "copy" && local >= 1040;

  if (frame === "signup") {
    return (
      <div className="relative h-full">
        <p className="absolute inset-x-6 top-[14%] text-sm font-medium">{signup}</p>
        <div data-cursor-target className="absolute inset-x-6 -translate-y-1/2" style={{ top: `${SPOT.email.y}%` }}>
          <Field label={emailLabel} focused={emailFocus} value={SAMPLE_EMAIL.slice(0, emailCount)} />
        </div>
        <div className="absolute inset-x-6 top-[58%]">
          <Field label={passwordLabel} />
        </div>
        <span className="absolute inset-x-6 top-[76%] inline-flex h-9 items-center justify-center rounded-[10px] bg-primary text-sm text-primary-foreground">
          {signup}
        </span>
      </div>
    );
  }

  if (frame === "pay") {
    return (
      <div className="flex h-full flex-col justify-center gap-4 px-6">
        <p className="text-lg font-semibold">{hybrid}</p>
        <p className="line-clamp-3 text-xs leading-5 text-muted-foreground">{hybridDesc}</p>
        <span data-cursor-target className={cn(pressClass(payDown, local >= 1080), "h-9 w-fit px-4 text-sm")}>
          {pay}
        </span>
      </div>
    );
  }

  if (frame === "console") {
    return (
      <div className="relative h-full">
        <ConsoleChrome labels={labels} active={local >= 1120 ? "hybrid" : "overview"}>
          <p className="text-[10px] tracking-[0.16em] text-primary uppercase">AcrossFlare</p>
          <p className="mt-1 text-sm font-medium">{labels("consoleTitle")}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">{labels("consoleSubtitle")}</p>
          <div className="mt-3 rounded-xl border border-border p-3">
            <span className="inline-flex rounded-full border border-primary/40 px-2 py-0.5 text-[10px] text-primary">
              {labels("active")}
            </span>
            <p className="mt-2 text-sm font-medium">{hybrid}</p>
            <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-muted-foreground">{hybridDesc}</p>
            <span data-cursor-target className={cn(pressClass(openDown, local >= 1120), "mt-3 h-7 w-fit px-3 text-[11px]")}>
              {labels("open")}
            </span>
          </div>
        </ConsoleChrome>
      </div>
    );
  }

  if (frame === "copy") {
    return (
      <div className="relative h-full">
        <ConsoleChrome labels={labels} active="hybrid">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold">{hybrid}</p>
            <span className="shrink-0 rounded-full border border-primary/40 px-2 py-0.5 text-[10px] text-primary">
              {labels("active")}
            </span>
          </div>
          <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-muted-foreground">{hybridDesc}</p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
            <Meta label={labels("plan")} value={labels("planName")} />
            <Meta label={labels("nodes")} value={labels("nodeList")} />
          </div>
          <p className="mt-3 text-[10px] text-muted-foreground">{labels("url")}</p>
          <div className="mt-1 flex items-center gap-2">
            <p className="min-w-0 flex-1 truncate rounded-md border border-border px-2 py-1 font-mono text-[10px]">
              {labels("urlSample")}
            </p>
            <span data-cursor-target className={cn(pressClass(copyDown, copied), "h-7 shrink-0 px-3 text-[11px]")}>
              {copied ? labels("copied") : labels("copy")}
            </span>
          </div>
        </ConsoleChrome>
      </div>
    );
  }

  return <QrScan local={local} label={labels("qr")} />;
}

function Cursor({ frame, local, aim }: { frame: Frame; local: number; aim: { x: number; y: number } | null }) {
  const spot = cursorSpot(frame, local, aim);
  if (!spot.visible) return null;
  return (
    <span
      className="pointer-events-none absolute z-20 transition-[left,top] duration-100 ease-out"
      style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
    >
      {spot.clicking ? (
        <span className="absolute -top-3 -left-3 size-7 rounded-full border border-primary" />
      ) : null}
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
        <path d="M2 1.2 13.2 8.4 8.3 9.2 6.2 14.4Z" fill="#f4f4f5" stroke="#090a0f" strokeWidth="0.7" />
      </svg>
    </span>
  );
}

function cursorSpot(frame: Frame, local: number, aim: { x: number; y: number } | null) {
  const point = (fallback: { x: number; y: number }): [number, number] => [aim?.x ?? fallback.x, aim?.y ?? fallback.y];
  if (frame === "signup") {
    const moved = move(local, [78, 16], point(SPOT.email), 450);
    return { ...moved, clicking: local >= 400 && local < 620, visible: true };
  }
  if (frame === "pay") {
    const moved = move(local, [78, 18], point(SPOT.pay), 720);
    return { ...moved, clicking: local >= 780 && local < 1080, visible: true };
  }
  if (frame === "console") {
    const moved = move(local, [80, 16], point(SPOT.open), 760);
    return { ...moved, clicking: local >= 820 && local < 1120, visible: true };
  }
  if (frame === "copy") {
    const moved = move(local, [28, 28], point(SPOT.copy), 700);
    return { ...moved, clicking: local >= 760 && local < 1040, visible: true };
  }
  return { x: 0, y: 0, clicking: false, visible: false };
}

function pressClass(down: boolean, released: boolean) {
  return cn(
    "inline-flex items-center justify-center rounded-[10px] bg-primary text-primary-foreground transition-transform duration-150",
    down && "scale-[0.92] brightness-75",
    released && "ring-2 ring-primary ring-offset-2 ring-offset-[#0c0e14]"
  );
}

function QrScan({ local, label }: { local: number; label: string }) {
  const arrive = Math.min(1, local / 700);
  const eased = 1 - (1 - arrive) ** 3;
  const sweep = local < 700 ? 0 : Math.min(1, (local - 700) / 900);
  const locked = local >= 1650;

  return (
    <div className="relative flex h-full items-center justify-center">
      <div className="relative">
        <p className="mb-2 text-center text-[10px] text-muted-foreground">{label}</p>
        <FakeQr />
        <span
          className="pointer-events-none absolute right-1 left-1 h-0.5 bg-primary shadow-[0_0_12px_#10b981]"
          style={{ top: `${18 + sweep * 70}%`, opacity: arrive > 0.85 && !locked ? 1 : 0 }}
        />
        {locked ? <span className="absolute -inset-1 rounded-md border-2 border-primary" /> : null}
      </div>
      <div
        className="absolute h-36 w-[4.5rem] rounded-[1.2rem] border-2 border-zinc-200 bg-zinc-950/85 shadow-lg"
        style={{ transform: `translate(${(1 - eased) * 96}px, ${(1 - eased) * 28}px)` }}
      >
        <span className="absolute top-1.5 left-1/2 h-1 w-6 -translate-x-1/2 rounded-full bg-zinc-500" />
        <span className="absolute inset-x-2 top-6 bottom-5 rounded-md border border-primary/60" />
        <span
          className="absolute right-2 left-2 h-px bg-primary"
          style={{ top: `${28 + sweep * 48}%`, opacity: locked ? 0 : 1 }}
        />
      </div>
    </div>
  );
}

function move(local: number, from: [number, number], to: [number, number], until: number) {
  const progress = Math.min(1, local / until);
  const eased = 1 - (1 - progress) ** 3;
  return {
    x: from[0] + (to[0] - from[0]) * eased,
    y: from[1] + (to[1] - from[1]) * eased,
  };
}

function ConsoleChrome({
  labels,
  active = "overview",
  children,
}: {
  labels: ReturnType<typeof useTranslations>;
  active?: "overview" | "hybrid" | "backup";
  children: React.ReactNode;
}) {
  const items = [
    ["overview", labels("overview")],
    ["backup", labels("backup")],
    ["hybrid", "Hybrid"],
    ["billing", labels("billing")],
    ["settings", labels("settings")],
  ] as const;

  return (
    <div className="flex h-full">
      <div className="w-[5.5rem] shrink-0 space-y-1 border-r border-border p-2">
        {items.map(([id, label]) => (
          <p
            key={id}
            className={cn(
              "truncate rounded-md px-1.5 py-1 text-[10px]",
              id === active ? "bg-primary/15 text-primary" : "text-muted-foreground"
            )}
          >
            {label}
          </p>
        ))}
      </div>
      <div className="min-w-0 flex-1 overflow-hidden p-3">{children}</div>
    </div>
  );
}

function Field({
  label,
  value = "",
  focused = false,
}: {
  label: string;
  value?: string;
  focused?: boolean;
}) {
  return (
    <div>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <div
        className={cn(
          "mt-1 flex h-8 items-center rounded-[10px] border bg-background px-2 font-mono text-sm text-foreground",
          focused ? "border-primary" : "border-border"
        )}
      >
        {value}
        {focused ? <span className="ml-px inline-block h-4 w-px bg-primary" /> : null}
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border px-2 py-1.5">
      <p className="text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate text-foreground">{value}</p>
    </div>
  );
}

function AnswerFrame({
  answer,
  local,
  labels,
}: {
  answer: Answer;
  local: number;
  labels: ReturnType<typeof useTranslations>;
}) {
  if (answer === "kakao") return <ChatThread name={labels("kakao")} tone="kakao" local={local} />;
  if (answer === "line") return <ChatThread name={labels("lineApp")} tone="line" local={local} />;
  if (answer === "youtube") return <Player name={labels("youtube")} tone="youtube" local={local} caption={labels("playing")} />;
  if (answer === "netflix") return <Player name={labels("netflix")} tone="netflix" local={local} caption={labels("playing")} />;
  if (answer === "zoom") return <ZoomLecture name={labels("zoom")} caption={labels("inCall")} local={local} />;
  if (answer === "teams") return <Meeting name={labels("teams")} tone="bg-[#5b5fc7]" caption={labels("inCall")} count={4} local={local} />;
  if (answer === "webex") {
    return local < 700 ? (
      <Meeting name={labels("webex")} tone="bg-[#00bceb]" caption={labels("inCall")} count={8} local={local} />
    ) : (
      <WebexTalk name={labels("webex")} caption={labels("inCall")} local={local} />
    );
  }
  if (answer === "backup") return <BackupDrop local={local} labels={labels} />;
  return <PingMeter local={local} labels={labels} />;
}

function ChatThread({ name, tone, local }: { name: string; tone: "kakao" | "line"; local: number }) {
  const kakao = tone === "kakao";
  const script = [
    { lines: 1, wide: false, mine: true },
    { lines: 1, wide: true, mine: false },
    { lines: 3, wide: true, mine: true },
    { lines: 5, wide: true, mine: false },
    { lines: 1, wide: false, mine: true },
    { lines: 1, wide: true, mine: false },
  ];
  const step = kakao ? 1000 : 700;
  const shown = Math.min(script.length, Math.floor(local / step) + 1);
  return (
    <div className="flex h-full flex-col">
      <div className={cn("px-4 py-3 text-sm font-semibold", kakao ? "bg-[#fee500] text-[#191919]" : "bg-[#06c755] text-white")}>
        {name}
      </div>
      <div className={cn("flex min-h-0 flex-1 flex-col justify-end gap-3 overflow-hidden px-4 py-4", kakao ? "bg-[#b2c7d9]/30" : "bg-[#8cabd9]/25")}>
        {script.slice(0, shown).map((bubble, index) => (
          <ComicBubble key={index} lines={bubble.lines} wide={bubble.wide} mine={bubble.mine} kakao={kakao} />
        ))}
      </div>
    </div>
  );
}

function ComicBubble({
  lines,
  wide,
  mine,
  kakao,
}: {
  lines: number;
  wide: boolean;
  mine: boolean;
  kakao: boolean;
}) {
  const fill = mine ? (kakao ? "bg-[#fee500]" : "bg-[#06c755]") : "bg-white";
  return (
    <div className={cn("relative shrink-0", mine ? "self-end" : "self-start", wide ? "w-[84%]" : "w-[38%]")}>
      <div
        className={cn(
          "rounded-[1.15rem] border-2 border-[#161616] shadow-[3px_3px_0_#161616]",
          fill,
          lines === 1 ? "h-9" : lines === 3 ? "h-[4.25rem]" : "h-32"
        )}
      />
      <span
        className={cn(
          "absolute -bottom-[13px] border-x-[10px] border-t-[14px] border-x-transparent border-t-[#161616]",
          mine ? "right-[18px]" : "left-[18px]"
        )}
      />
      <span
        className={cn(
          "absolute -bottom-[9px] border-x-8 border-t-[11px] border-x-transparent",
          mine ? "right-5" : "left-5",
          mine ? (kakao ? "border-t-[#fee500]" : "border-t-[#06c755]") : "border-t-white"
        )}
      />
    </div>
  );
}

function Player({
  name,
  tone,
  local,
  caption,
}: {
  name: string;
  tone: "youtube" | "netflix";
  local: number;
  caption: string;
}) {
  const youtube = tone === "youtube";
  const loading = !youtube && local < 550;
  const progress = youtube ? Math.min(1, local / 2000) : Math.min(1, Math.max(0, (local - 550) / 1450));
  return (
    <div className="flex h-full flex-col px-3 py-3 sm:px-4">
      <p className={cn("text-sm font-semibold", youtube ? "text-[#ff0033]" : "text-[#e50914]")}>{name}</p>
      <div className="mt-2 flex min-h-0 flex-1 items-center justify-center [container-type:size]">
        <div className="relative aspect-video w-[min(100cqw,calc(100cqh*16/9))] overflow-hidden rounded-xl bg-black">
          {loading ? (
            <span className="absolute top-1/2 left-1/2 size-8 -translate-x-1/2 -translate-y-1/2 animate-spin rounded-full border-2 border-white/20 border-t-white" />
          ) : youtube ? (
            <MusicStage local={local} progress={progress} />
          ) : (
            <SpaceStage local={local} progress={progress} />
          )}
        </div>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{loading ? "…" : caption}</p>
    </div>
  );
}

function MusicStage({ local, progress }: { local: number; progress: number }) {
  return (
    <>
      <div className="absolute inset-0 bg-[#12080c]" />
      <div className="absolute inset-x-4 top-[18%] bottom-8 flex items-end gap-1">
        {Array.from({ length: 16 }, (_, index) => (
          <span
            key={index}
            className="flex-1 rounded-sm bg-[#ff0033]/80"
            style={{ height: `${24 + ((index * 19 + local / 32) % 74)}%` }}
          />
        ))}
      </div>
      <div className="absolute right-0 bottom-0 left-0 h-1 bg-white/15">
        <div className="h-full bg-[#ff0033]" style={{ width: `${progress * 100}%` }} />
      </div>
    </>
  );
}

function SpaceStage({ local, progress }: { local: number; progress: number }) {
  return (
    <>
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at ${28 + progress * 24}% ${62 - progress * 18}%, rgba(99,70,180,0.55), transparent 36%), radial-gradient(circle at ${78 - progress * 20}% 30%, rgba(56,189,248,0.35), transparent 28%), #05060f`,
        }}
      />
      {Array.from({ length: 26 }, (_, index) => {
        const angle = (index / 26) * Math.PI * 2;
        const dist = ((local / 28) * (0.35 + (index % 4) * 0.16) + index * 2.4) % 52;
        return (
          <span
            key={index}
            className="absolute size-0.5 rounded-full bg-white"
            style={{
              left: `${50 + Math.cos(angle) * dist}%`,
              top: `${50 + Math.sin(angle) * dist * 0.72}%`,
              opacity: 0.25 + dist / 70,
            }}
          />
        );
      })}
      <span
        className="absolute size-28 rounded-full bg-[radial-gradient(circle_at_35%_35%,#fde68a,#b45309_55%,#1e1b4b)] sm:size-36"
        style={{
          left: `${18 + progress * 28}%`,
          top: `${22 + progress * 8}%`,
          transform: `scale(${0.7 + progress * 0.8})`,
        }}
      />
      <div className="absolute right-0 bottom-0 left-0 h-1 bg-white/15">
        <div className="h-full bg-[#e50914]" style={{ width: `${progress * 100}%` }} />
      </div>
    </>
  );
}

function Meeting({
  name,
  tone,
  caption,
  count,
  local,
}: {
  name: string;
  tone: string;
  caption: string;
  count: number;
  local: number;
}) {
  const columns = count === 4 ? "grid-cols-2" : "grid-cols-4";
  return (
    <div className="flex h-full flex-col">
      <div className={cn("flex items-center justify-between px-4 py-2.5 text-sm font-semibold text-white", tone)}>
        <span>{name}</span>
        <span className="text-[11px] font-normal">{caption}</span>
      </div>
      <div className={cn("grid min-h-0 flex-1 gap-1 p-2", columns)}>
        {Array.from({ length: count }, (_, index) => (
          <div key={index} className="flex items-end justify-center overflow-hidden rounded-md bg-black/30">
            <Person local={local} index={index} compact={count > 4} />
          </div>
        ))}
      </div>
    </div>
  );
}

function ZoomLecture({ name, caption, local }: { name: string; caption: string; local: number }) {
  const grow = Math.min(1, Math.max(0, (local - 400) / 600));
  const wave = Math.sin(local / 220) * 24;
  const speaker = 5;
  const column = speaker % 4;
  const row = Math.floor(speaker / 4);
  const fullscreen = grow >= 1;
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between bg-[#2d8cff] px-4 py-2.5 text-sm font-semibold text-white">
        <span>{name}</span>
        <span className="text-[11px] font-normal">{caption}</span>
      </div>
      <div className="relative min-h-0 flex-1 bg-[#0b1220] p-2">
        {fullscreen ? null : (
          <div className="grid h-full grid-cols-4 grid-rows-4 gap-1">
            {Array.from({ length: 16 }, (_, index) =>
              index === speaker ? (
                <div key={index} />
              ) : (
                <div
                  key={index}
                  className="flex items-end justify-center overflow-hidden rounded-md bg-black/35"
                  style={{ opacity: 1 - grow }}
                >
                  <Person local={local} index={index} compact />
                </div>
              )
            )}
          </div>
        )}
        <div
          className="absolute flex items-end justify-center overflow-hidden rounded-md bg-black/40"
          style={{
            left: `${(1 - grow) * column * 25}%`,
            top: `${(1 - grow) * row * 25}%`,
            width: `${25 + grow * 75}%`,
            height: `${25 + grow * 75}%`,
          }}
        >
          {grow > 0.35 ? (
            <svg viewBox="0 0 80 96" aria-hidden="true" className="h-[90%] w-[46%]">
              <ellipse cx="40" cy="18" rx="11" ry="12" fill="rgba(226,232,240,0.75)" />
              <path d="M14 94c2-26 10-36 26-36s24 10 26 36" fill="rgba(203,213,225,0.55)" />
              <g style={{ transform: `rotate(${-10 + wave}deg)`, transformOrigin: "28px 52px" }}>
                <path d="M28 52c-12 4-20 2-26-2" stroke="rgba(226,232,240,0.85)" strokeWidth="5" strokeLinecap="round" />
                <circle cx="4" cy="49" r="3.5" fill="rgba(226,232,240,0.9)" />
              </g>
            </svg>
          ) : (
            <Person local={local} index={speaker} compact />
          )}
        </div>
      </div>
    </div>
  );
}

function WebexTalk({ name, caption, local }: { name: string; caption: string; local: number }) {
  const lean = Math.sin(local / 280) * 4;
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between bg-[#00bceb] px-4 py-2.5 text-sm font-semibold text-white">
        <span>{name}</span>
        <span className="text-[11px] font-normal">{caption}</span>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-2 gap-2 bg-[#07131a] p-3">
        {[0, 1].map((index) => (
          <div key={index} className="flex items-end justify-center overflow-hidden rounded-lg bg-black/30">
            <svg
              viewBox="0 0 80 100"
              aria-hidden="true"
              className="h-[86%] w-[70%]"
              style={{ transform: `translateX(${index === 0 ? lean : -lean}px)` }}
            >
              <ellipse cx="40" cy="22" rx="12" ry="13" fill="rgba(226,232,240,0.7)" />
              <path d="M12 98c2-24 10-34 28-34s26 10 28 34" fill="rgba(203,213,225,0.5)" />
              <g
                style={{
                  transform: `rotate(${index === 0 ? 18 + lean : -18 - lean}deg)`,
                  transformOrigin: index === 0 ? "54px 58px" : "26px 58px",
                }}
              >
                <path
                  d={index === 0 ? "M54 58c10 2 18 8 22 14" : "M26 58c-10 2-18 8-22 14"}
                  stroke="rgba(226,232,240,0.75)"
                  strokeWidth="6"
                  strokeLinecap="round"
                />
              </g>
            </svg>
          </div>
        ))}
      </div>
    </div>
  );
}

function Person({ local, index, compact }: { local: number; index: number; compact: boolean }) {
  const sway = Math.sin(local / 320 + index * 0.8) * (compact ? 1.2 : 2.2);
  const bob = Math.sin(local / 460 + index * 1.1) * (compact ? 0.8 : 1.6);
  return (
    <svg
      viewBox="0 0 48 58"
      aria-hidden="true"
      className={compact ? "h-[78%] w-[70%]" : "h-[82%] w-[58%]"}
      style={{ transform: `translate(${sway}px, ${bob}px)` }}
    >
      <ellipse cx="24" cy="16" rx="8" ry="9" fill="rgba(226,232,240,0.55)" />
      <path d="M6 56c1.5-16 8-22 18-22s16.5 6 18 22" fill="rgba(203,213,225,0.42)" />
    </svg>
  );
}

function BackupDrop({ local, labels }: { local: number; labels: ReturnType<typeof useTranslations> }) {
  const drag = Math.min(1, local / 1600);
  const eased = 1 - (1 - drag) ** 3;
  const dropped = local >= 1600;
  return (
    <div className="relative h-full">
      <ConsoleChrome labels={labels} active="backup">
        <p className="text-sm font-medium">{labels("backup")}</p>
        <p className="mt-2 text-[11px] text-muted-foreground">{labels("dropHint")}</p>
        <div
          className={cn(
            "mt-3 h-28 rounded-xl border border-dashed",
            dropped ? "border-primary bg-primary/10" : "border-primary/40"
          )}
        />
      </ConsoleChrome>
      <div
        className="pointer-events-none absolute z-20"
        style={{ left: `${8 + eased * 40}%`, top: `${12 + eased * 36}%` }}
      >
        <FileIcon />
        <svg className="absolute -top-1 left-6" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <path d="M2 1.2 13.2 8.4 8.3 9.2 6.2 14.4Z" fill="#f4f4f5" stroke="#090a0f" strokeWidth="0.7" />
        </svg>
        <p className="mt-1 text-[10px] text-foreground">{labels("fileName")}</p>
      </div>
    </div>
  );
}

function FileIcon() {
  return (
    <svg width="36" height="44" viewBox="0 0 36 44" aria-hidden="true">
      <path d="M4 2h18l10 10v28a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" fill="#f4f4f5" />
      <path d="M22 2v10h10" fill="#d4d4d8" />
      <path d="M8 24h16M8 30h12" stroke="#71717a" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function PingMeter({ local, labels }: { local: number; labels: ReturnType<typeof useTranslations> }) {
  const step = Math.floor(local / 900);
  const noise = Math.abs(Math.sin(step * 12.9898) * 43758.5453);
  const fraction = noise - Math.floor(noise);
  const value = Math.round(30 + fraction * 70);
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6">
      <p className="text-sm text-primary">{labels("connected")}</p>
      <p className="text-5xl font-semibold tabular-nums tracking-tight sm:text-6xl">{value}</p>
      <p className="text-sm text-muted-foreground">ms · {labels("ping")}</p>
      <div className="h-1.5 w-40 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${((value - 30) / 70) * 100}%` }} />
      </div>
    </div>
  );
}

function FakeQr() {
  return (
    <div className="mt-1 grid w-16 grid-cols-[repeat(19,minmax(0,1fr))] gap-px bg-white p-1">
      {QR_CELLS.join("")
        .split("")
        .map((cell, index) => (
          <span key={index} className={cell === "1" ? "aspect-square bg-black" : "aspect-square bg-white"} />
        ))}
    </div>
  );
}
