import { availableMonitors, getCurrentWindow, PhysicalPosition } from "@tauri-apps/api/window";
import { IS_TAURI, refreshHitRegions } from "./windowControl";

/** Какая часть окна остаётся видимой у края экрана, когда собака спряталась. */
const PEEK = 0.4;
const RUN_MS = 700;
const RETURN_MS = 600;

let home: { x: number; y: number } | null = null; // где стояла до побега (физ. пиксели)
let token = 0; // новая анимация (или abandonHome) отменяет предыдущую

const easeInOut = (k: number) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);

/** Плавно двигаем окно через Tauri API (setPosition) покадрово. */
async function slide(to: { x: number; y: number }, ms: number, mine: number): Promise<void> {
  const win = getCurrentWindow();
  const from = await win.outerPosition();
  const t0 = performance.now();
  await new Promise<void>((resolve) => {
    const step = (now: number) => {
      if (mine !== token) return resolve(); // отменено: собаку схватили или началась другая анимация
      const k = Math.min(1, (now - t0) / ms);
      const e = easeInOut(k);
      void win.setPosition(
        new PhysicalPosition(
          Math.round(from.x + (to.x - from.x) * e),
          Math.round(from.y + (to.y - from.y) * e),
        ),
      );
      if (k < 1) requestAnimationFrame(step);
      else resolve();
    };
    requestAnimationFrame(step);
  });
}

/** OFFENDED: убежать к краю виртуального рабочего стола, оставив торчать часть окна. */
export async function runAway(): Promise<void> {
  if (!IS_TAURI) return;
  const mine = ++token;
  const win = getCurrentWindow();
  const [pos, size, monitors] = await Promise.all([
    win.outerPosition(),
    win.outerSize(),
    availableMonitors(),
  ]);
  if (mine !== token || monitors.length === 0) return; // уже схватили / отменили
  if (!home) home = { x: pos.x, y: pos.y };

  // Берём только мониторы на «строке» окна (пересекаются по вертикали): край этой полосы —
  // настоящий край рабочего стола, за ним нет соседнего экрана, где мог бы показаться хвост окна.
  const row = monitors.filter(
    (m) => m.position.y < pos.y + size.height && m.position.y + m.size.height > pos.y,
  );
  const span = row.length > 0 ? row : monitors;
  const leftEdge = Math.min(...span.map((m) => m.position.x));
  const rightEdge = Math.max(...span.map((m) => m.position.x + m.size.width));

  const center = pos.x + size.width / 2;
  const goLeft = center - leftEdge < rightEdge - center;
  const x = goLeft
    ? leftEdge - Math.round(size.width * (1 - PEEK))
    : rightEdge - Math.round(size.width * PEEK);
  await slide({ x, y: pos.y }, RUN_MS, mine);
  if (mine === token) refreshHitRegions();
}

/** Выход из OFFENDED: вернуться на прежнее место (если дом ещё «помнится»). */
export async function returnHome(): Promise<void> {
  if (!IS_TAURI || !home) return;
  const target = home;
  home = null;
  const mine = ++token;
  await slide(target, RETURN_MS, mine);
  if (mine === token) refreshHitRegions();
}

/**
 * Собаку схватили и тащат: останавливаем бег/возврат и забываем «дом» —
 * после отпускания она остаётся там, куда её унесли.
 */
export function abandonHome(): void {
  token++;
  home = null;
}
