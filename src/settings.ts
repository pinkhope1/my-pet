import { BaseDirectory, exists, readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";

const IS_TAURI = "__TAURI_INTERNALS__" in window;
const FILE = "settings.json"; // %APPDATA%\com.mypet.dog\settings.json
const SAVE_DEBOUNCE_MS = 400;

export type ColorKey = "primary" | "secondary" | "ear" | "belly" | "nose" | "eye";
export type DragMode = "hold" | "shift";

export interface Settings {
  /** Размер окна (квадрат), px. */
  size: number;
  /** "hold" — удержание ≥ dragHoldMs; "shift" — Shift + ЛКМ. */
  dragMode: DragMode;
  dragHoldMs: number;
  /** Цвета → CSS-переменные --dog-<key>. Пусто = цвета по умолчанию из style.css. */
  colors: Partial<Record<ColorKey, string>>;
  /** Счётчик съеденных косточек. */
  bonesEaten: number;
}

export const DEFAULT_SIZE = 300;
export const MIN_SIZE = 100;
export const MAX_SIZE = 600;

const COLOR_KEYS: ColorKey[] = ["primary", "secondary", "ear", "belly", "nose", "eye"];
const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

/** Живые настройки (единый источник правды в рантайме). */
export const settings: Settings = {
  size: DEFAULT_SIZE,
  dragMode: "hold",
  dragHoldMs: 350,
  colors: {},
  bonesEaten: 0,
};

/** Приводим всё прочитанное из файла к безопасным значениям. */
function sanitize(raw: unknown): Settings {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const colors: Settings["colors"] = {};
  const rc = (r.colors && typeof r.colors === "object" ? r.colors : {}) as Record<string, unknown>;
  for (const k of COLOR_KEYS) {
    const v = rc[k];
    if (typeof v === "string" && HEX.test(v)) colors[k] = v;
  }
  const size = Number(r.size);
  const hold = Number(r.dragHoldMs);
  const bones = Number(r.bonesEaten);
  return {
    size: Number.isFinite(size) ? Math.min(MAX_SIZE, Math.max(MIN_SIZE, Math.round(size))) : DEFAULT_SIZE,
    dragMode: r.dragMode === "shift" ? "shift" : "hold",
    dragHoldMs: Number.isFinite(hold) ? Math.max(0, Math.round(hold)) : 350,
    colors,
    bonesEaten: Number.isFinite(bones) ? Math.max(0, Math.floor(bones)) : 0,
  };
}

export function applyColors(colors: Settings["colors"]): void {
  const root = document.documentElement;
  for (const k of COLOR_KEYS) {
    const v = colors[k];
    if (v) root.style.setProperty(`--dog-${k}`, v);
    else root.style.removeProperty(`--dog-${k}`);
  }
}

/** Прочитать файл настроек (если нет/битый — значения по умолчанию). */
export async function loadSettings(): Promise<Settings> {
  if (IS_TAURI) {
    try {
      if (await exists(FILE, { baseDir: BaseDirectory.AppData })) {
        const text = await readTextFile(FILE, { baseDir: BaseDirectory.AppData });
        Object.assign(settings, sanitize(JSON.parse(text)));
      }
    } catch (err) {
      console.warn("[settings] не удалось прочитать, берём значения по умолчанию:", err);
    }
  }
  applyColors(settings.colors);
  return settings;
}

// ---------- Сохранение (с задержкой, чтобы не писать файл на каждый тик колёсика) ----------
let saveTimer: number | undefined;

async function writeNow(): Promise<void> {
  if (!IS_TAURI) return;
  try {
    await writeTextFile(FILE, JSON.stringify(settings, null, 2), { baseDir: BaseDirectory.AppData });
  } catch (err) {
    console.warn("[settings] не удалось сохранить:", err);
  }
}

/** Изменить настройки и сохранить в JSON через ~0,4 с. */
export function updateSettings(patch: Partial<Settings>): void {
  Object.assign(settings, sanitize({ ...settings, ...patch }));
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    saveTimer = undefined;
    void writeNow();
  }, SAVE_DEBOUNCE_MS);
}

/** Дописать отложенное сохранение немедленно (перед выходом). */
export async function flushSettings(): Promise<void> {
  if (saveTimer === undefined) return;
  window.clearTimeout(saveTimer);
  saveTimer = undefined;
  await writeNow();
}

/** +1 съеденная косточка (сохраняется в settings.json). */
export function addBoneEaten(): number {
  updateSettings({ bonesEaten: settings.bonesEaten + 1 });
  return settings.bonesEaten;
}

export function setDragMode(mode: DragMode): void {
  updateSettings({ dragMode: mode });
}

/** Сменить окрас: применяет CSS-переменные и сохраняет. Пустой объект — сброс. */
export function setColors(colors: Settings["colors"]): void {
  updateSettings({ colors });
  applyColors(settings.colors);
}
