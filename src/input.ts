import { settings } from "./settings";
import type { DogStateMachine } from "./DogStateMachine";
import { startWindowDrag } from "./windowControl";
import { abandonHome } from "./windowMotion";

const MOVE_THRESHOLD_PX = 5;     // сдвиг, после которого нажатие перестаёт быть кликом
const PET_MIN_DISTANCE_PX = 30;  // сколько нужно «погладить», чтобы стало HAPPY
const PET_MAX_SPEED = 2.5;       // px/мс: быстрее — это уже не поглаживание

type Mode = "pending" | "pet" | "drag";

/**
 * Жесты ЛКМ на собаке (settings.dragMode):
 *  - короткий клик                → fsm.click()
 *  - зажать и плавно водить       → поглаживание → fsm.pet()
 *  - "hold":  подержать ≥ dragHoldMs без движения, потом тянуть → перетаскивание окна
 *  - "shift": Shift + ЛКМ + тянуть → перетаскивание окна
 * Тащить можно всегда: схваченная обиженная собака (OFFENDED) прощает и остаётся на новом месте.
 */
export function initInput(dog: HTMLElement, fsm: DogStateMachine): void {
  let down: { x: number; y: number; t: number; mode: Mode } | null = null;
  let last = { x: 0, y: 0, t: 0 };
  let petDistance = 0;

  dog.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;
    fsm.activity();
    down = { x: e.clientX, y: e.clientY, t: e.timeStamp, mode: "pending" };
    last = { x: e.clientX, y: e.clientY, t: e.timeStamp };
    petDistance = 0;
  });

  window.addEventListener("mouseup", () => {
    if (down?.mode === "pending") fsm.click();
    down = null;
    dog.classList.remove("grabbed");
  });

  dog.addEventListener("mousemove", (e) => {
    // Наведение на саму собаку (не на прозрачный фон SVG) будит её.
    if (e.target !== dog) fsm.wake();
    else fsm.activity();

    if (!down || down.mode === "drag") return;

    if (down.mode === "pending") {
      if (Math.hypot(e.clientX - down.x, e.clientY - down.y) < MOVE_THRESHOLD_PX) return;
      const wantDrag =
        settings.dragMode === "shift" ? e.shiftKey : e.timeStamp - down.t >= settings.dragHoldMs;
      if (wantDrag) {
        down.mode = "drag";
        dog.classList.add("grabbed");
        // Обиженную собаку тоже можно утащить: отменяем побег/возврат, обида проходит.
        abandonHome();
        fsm.grab();
        void startWindowDrag().finally(() => {
          down = null;
          dog.classList.remove("grabbed");
        });
        return;
      }
      down.mode = "pet";
    }

    // mode === "pet": считаем только плавные движения.
    const dist = Math.hypot(e.clientX - last.x, e.clientY - last.y);
    const dt = Math.max(1, e.timeStamp - last.t);
    last = { x: e.clientX, y: e.clientY, t: e.timeStamp };
    if (dist / dt > PET_MAX_SPEED) return;
    petDistance += dist;
    if (petDistance >= PET_MIN_DISTANCE_PX) fsm.pet();
  });
}
