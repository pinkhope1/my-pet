import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow, LogicalSize } from "@tauri-apps/api/window";
import { flushSettings, MAX_SIZE, MIN_SIZE, settings, updateSettings } from "./settings";

export const IS_TAURI = "__TAURI_INTERNALS__" in window;

/** Части собаки, чьи рамки считаются «твёрдыми» для кликов. */
const HIT_SELECTORS = ["#head", "#body", "#paws", "#tail"];

/** Пока открыто HTML-меню, «твёрдым» считается всё окно (клик мимо меню закрывает его). */
let hitAll = false;

/** Пересчитать хитбоксы и отправить в Rust. Вызывать после изменения размера/позы. */
export function refreshHitRegions(): void {
  if (!IS_TAURI) return;
  const regions = hitAll
    ? [{ x: 0, y: 0, w: window.innerWidth, h: window.innerHeight }]
    : HIT_SELECTORS.map((sel) => document.querySelector(sel))
        .filter((el): el is Element => !!el)
        .map((el) => el.getBoundingClientRect())
        .filter((r) => r.width > 0 && r.height > 0)
        .map((r) => ({ x: r.left, y: r.top, w: r.width, h: r.height }));
  void invoke("set_hit_regions", { regions });
}

export function setHitAll(on: boolean): void {
  hitAll = on;
  refreshHitRegions();
}

/** 0 = остановить опрос курсора (SLEEPING), иначе период в мс. */
export function setPollInterval(ms: number): void {
  if (IS_TAURI) void invoke("set_poll_interval", { ms });
}

/** Начать перетаскивание окна (click-through на это время отключается). */
export async function startWindowDrag(): Promise<void> {
  if (!IS_TAURI) return;
  await invoke("set_dragging", { dragging: true });
  try {
    await getCurrentWindow().startDragging();
  } finally {
    await invoke("set_dragging", { dragging: false });
    refreshHitRegions();
  }
}

/** Сохранить настройки и закрыть приложение. */
export async function quitApp(): Promise<void> {
  await flushSettings();
  if (IS_TAURI) await invoke("quit_app");
}

// ---------- Размер окна ----------
let targetSize = settings.size; // размер собаки (и окна, когда меню закрыто)
let frameMin = 0; // минимум для окна, пока открыто меню (на малых размерах меню не влезло бы)
let inflight: Promise<void> | null = null;

const clampSize = (n: number) => Math.min(MAX_SIZE, Math.max(MIN_SIZE, Math.round(n)));

export const getTargetSize = () => targetSize;

/** Собака рисуется в квадрате --pet-px, а окно может быть больше (под меню). */
function setDogPx(px: number): void {
  document.documentElement.style.setProperty("--pet-px", `${px}px`);
}

/** Применяет размер окна = max(размер собаки, минимум под меню); подхватывает изменения на лету. */
function applyFrame(): Promise<void> {
  if (!IS_TAURI) return Promise.resolve();
  if (inflight) return inflight;
  inflight = (async () => {
    let applied = -1;
    for (;;) {
      const want = Math.max(targetSize, frameMin);
      if (want === applied) break;
      applied = want;
      await getCurrentWindow().setSize(new LogicalSize(applied, applied));
    }
    // Дождаться раскладки с новым размером окна и пересчитать хитбоксы.
    await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
    refreshHitRegions();
  })().finally(() => {
    inflight = null;
  });
  return inflight;
}

/** Единая точка смены размера (трей, Ctrl+колесо, ползунок): setSize → refreshHitRegions. */
export async function setWindowSize(size: number, persist = true): Promise<void> {
  targetSize = clampSize(size);
  setDogPx(targetSize);
  if (persist) updateSettings({ size: targetSize });
  await applyFrame();
}

/** Временно увеличить окно под меню (0 — вернуть обычный размер). */
export async function setFrameMin(px: number): Promise<void> {
  frameMin = px;
  await applyFrame();
}

export function initWindowControl(area: HTMLElement, onActivity: () => void): void {
  targetSize = clampSize(settings.size); // настройки к этому моменту уже загружены
  setDogPx(targetSize);
  refreshHitRegions();

  // Любое изменение размера окна/SVG → хитбоксы заново (один раз за кадр).
  let queued = false;
  const scheduleRefresh = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      refreshHitRegions();
    });
  };
  new ResizeObserver(scheduleRefresh).observe(area);
  window.addEventListener("resize", scheduleRefresh);

  // Ctrl + колесо над собакой — плавное масштабирование 100…600 px.
  window.addEventListener(
    "wheel",
    (e) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      onActivity();
      void setWindowSize(targetSize * Math.exp(-e.deltaY * 0.0015));
    },
    { passive: false },
  );

  // Выбор размера в меню трея.
  if (IS_TAURI) {
    void listen<number>("set-size", (e) => {
      onActivity();
      void setWindowSize(e.payload);
    });
  }
}
