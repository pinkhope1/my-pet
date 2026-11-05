import {
  availableMonitors,
  getCurrentWindow,
  PhysicalPosition,
  type Monitor,
} from "@tauri-apps/api/window";
import { getTargetSize, IS_TAURI, refreshHitRegions } from "./windowControl";

/** Какая часть питомца остаётся видимой у края экрана, когда он спрятался (доля от его размера). */
const PEEK = 0.4;
const RUN_MS = 700;
const RETURN_MS = 600;
/** Мониторы считаются соседями, если их границы сходятся с точностью до стольких физических px. */
const ADJACENT_TOLERANCE = 3;

let home: { x: number; y: number } | null = null; // где стоял до побега (физ. пиксели)
let token = 0; // новая анимация (или abandonHome) отменяет предыдущую

const easeInOut = (k: number) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);

/** Физический прямоугольник монитора. */
const rectOf = (m: Monitor) => ({
  left: m.position.x,
  top: m.position.y,
  right: m.position.x + m.size.width,
  bottom: m.position.y + m.size.height,
});

/** Рабочая область монитора (без панели задач), если система её отдаёт; иначе весь монитор. */
const workRectOf = (m: Monitor) => {
  const w = m.workArea;
  if (!w) return rectOf(m);
  return {
    left: w.position.x,
    top: w.position.y,
    right: w.position.x + w.size.width,
    bottom: w.position.y + w.size.height,
  };
};

/** Монитор, на котором центр прямоугольника; если центр вне мониторов — ближайший. */
function monitorAt(monitors: Monitor[], cx: number, cy: number): Monitor {
  let best = monitors[0];
  let bestDist = Infinity;
  for (const m of monitors) {
    const r = rectOf(m);
    const dx = Math.max(r.left - cx, 0, cx - r.right);
    const dy = Math.max(r.top - cy, 0, cy - r.bottom);
    const d = Math.hypot(dx, dy);
    if (d < bestDist) {
      best = m;
      bestDist = d;
    }
  }
  return best;
}

/** Плавно двигаем окно через Tauri API (setPosition) покадрово. */
async function slide(to: { x: number; y: number }, ms: number, mine: number): Promise<void> {
  const win = getCurrentWindow();
  const from = await win.outerPosition();
  const t0 = performance.now();
  await new Promise<void>((resolve) => {
    const step = (now: number) => {
      if (mine !== token) return resolve(); // отменено: питомца схватили или началась другая анимация
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

/**
 * OFFENDED: убежать к краю ТЕКУЩЕГО монитора и спрятаться, оставив на виду не меньше 40% питомца.
 *
 * Математика считается по размеру самого питомца (а не окна: окно бывает больше, например под меню):
 *  - берём монитор, на котором центр питомца;
 *  - уходим к той внешней стороне монитора, за которой НЕТ соседнего монитора (иначе спрятанная часть
 *    показалась бы на соседнем экране); если обе стороны с соседями (средний монитор) — к краю всей «строки»;
 *  - окно сдвигается так, чтобы за границу экрана выступало 60% питомца, а видимыми оставались 40%;
 *  - по вертикали питомец остаётся целиком в рабочей области монитора (не прячется за верх/низ).
 */
export async function runAway(): Promise<void> {
  if (!IS_TAURI) return;
  const mine = ++token;
  const win = getCurrentWindow();
  const [pos, monitors] = await Promise.all([win.outerPosition(), availableMonitors()]);
  if (mine !== token || monitors.length === 0) return; // уже схватили / отменили
  if (!home) home = { x: pos.x, y: pos.y };

  const pet = Math.round(getTargetSize() * window.devicePixelRatio); // размер питомца в физических px
  const cx = pos.x + pet / 2;
  const cy = pos.y + pet / 2;
  const mon = monitorAt(monitors, cx, cy);
  const r = rectOf(mon);

  // Мониторы «в строке» с питомцем (пересекаются с ним по вертикали), кроме текущего.
  const others = monitors.filter(
    (m) =>
      m !== mon &&
      m.position.y < pos.y + pet &&
      m.position.y + m.size.height > pos.y,
  );
  const neighborLeft = others.some((m) => {
    const o = rectOf(m);
    return o.left < r.left && o.right >= r.left - ADJACENT_TOLERANCE;
  });
  const neighborRight = others.some((m) => {
    const o = rectOf(m);
    return o.right > r.right && o.left <= r.right + ADJACENT_TOLERANCE;
  });

  let goLeft: boolean;
  let edge: number;
  if (!neighborLeft && !neighborRight) {
    goLeft = cx - r.left < r.right - cx; // одиночный монитор: к ближайшему краю
    edge = goLeft ? r.left : r.right;
  } else if (!neighborLeft) {
    goLeft = true;
    edge = r.left;
  } else if (!neighborRight) {
    goLeft = false;
    edge = r.right;
  } else {
    // Средний монитор: внешние края — края всей «строки» мониторов.
    const row = [mon, ...others].map(rectOf);
    const left = Math.min(...row.map((o) => o.left));
    const right = Math.max(...row.map((o) => o.right));
    goLeft = cx - left < right - cx;
    edge = goLeft ? left : right;
  }

  let x = goLeft ? edge - Math.round(pet * (1 - PEEK)) : edge - Math.round(pet * PEEK);

  // Предохранитель: при любом раскладе на виду остаётся не меньше 40% питомца у выбранного края.
  const minVisible = Math.ceil(pet * PEEK);
  if (goLeft) x = Math.max(x, edge - (pet - minVisible));
  else x = Math.min(x, edge - minVisible);

  // По вертикали питомец остаётся целиком в рабочей области монитора.
  const work = workRectOf(mon);
  const y = Math.min(Math.max(pos.y, work.top), Math.max(work.top, work.bottom - pet));

  await slide({ x, y }, RUN_MS, mine);
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
 * Питомца схватили и тащат: останавливаем бег/возврат и забываем «дом» —
 * после отпускания он остаётся там, куда его унесли.
 */
export function abandonHome(): void {
  token++;
  home = null;
}

/** Результат shiftIntoView: на сколько сдвинуто окно и как вернуть всё назад. */
export interface ViewShift {
  /** Сдвиг окна влево/вверх в логических px (≥ 0): содержимое надо сдвинуть на столько же вправо/вниз. */
  dx: number;
  dy: number;
  restore: () => Promise<void>;
}

/**
 * Меню по ПКМ расширяет окно до `frame` логических px вправо и вниз от его левого верхнего угла. Если питомец
 * у правого или нижнего края монитора, расширенное окно вылезло бы за экран. Тогда окно сдвигается влево/вверх
 * ровно настолько, чтобы целиком уместиться в рабочей области монитора, а содержимое (питомец) сдвигается
 * обратно через CSS transform на (dx, dy) — на экране питомец остаётся на месте, а меню оказывается в видимой части.
 * `restore()` возвращает окно на прежнюю позицию.
 */
export async function shiftIntoView(frame: number): Promise<ViewShift> {
  const none: ViewShift = { dx: 0, dy: 0, restore: async () => {} };
  if (!IS_TAURI) return none;

  const dpr = window.devicePixelRatio;
  const win = getCurrentWindow();
  const [pos, monitors] = await Promise.all([win.outerPosition(), availableMonitors()]);
  if (monitors.length === 0) return none;

  const pet = getTargetSize() * dpr;
  const mon = monitorAt(monitors, pos.x + pet / 2, pos.y + pet / 2);
  const area = workRectOf(mon);
  const framePx = Math.round(frame * dpr);

  // Окно не должно выходить за рабочую область; если оно больше области — прижимаем к левому/верхнему краю.
  const newX = Math.max(area.left, Math.min(pos.x, area.right - framePx));
  const newY = Math.max(area.top, Math.min(pos.y, area.bottom - framePx));
  if (newX === pos.x && newY === pos.y) return none;

  await win.setPosition(new PhysicalPosition(newX, newY));
  return {
    dx: (pos.x - newX) / dpr,
    dy: (pos.y - newY) / dpr,
    restore: () => win.setPosition(new PhysicalPosition(pos.x, pos.y)),
  };
}
