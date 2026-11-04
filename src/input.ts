import type { PetHost } from "./petHost";
import { settings } from "./settings";
import { startWindowDrag } from "./windowControl";
import { abandonHome } from "./windowMotion";

const MOVE_THRESHOLD_PX = 5;     // сдвиг, после которого нажатие перестаёт быть кликом
const PET_MIN_DISTANCE_PX = 30;  // сколько нужно «погладить», чтобы стало HAPPY
const PET_MAX_SPEED = 2.5;       // px/мс: быстрее — это уже не поглаживание
const DOUBLE_CLICK_MS = 250;     // ждём второй клик столько; не дождались — это одиночный клик

type Mode = "pending" | "pet" | "drag";

/**
 * Жесты ЛКМ на питомце (settings.dragMode). Слушатели висят на стабильном контейнере #app,
 * а текущего питомца берут из host в момент события — поэтому смена питомца их не ломает.
 *  - короткий клик                → одиночный (подпрыгивание + символ) или двойной (трюк питомца):
 *                                   ждём 250 мс — второго клика нет → одиночный
 *  - зажать и плавно водить       → поглаживание → fsm.pet()
 *  - "hold":  подержать ≥ dragHoldMs без движения, потом тянуть → перетаскивание окна
 *  - "shift": Shift + ЛКМ + тянуть → перетаскивание окна
 * Тащить можно всегда: схваченный обиженный питомец (OFFENDED) прощает и остаётся на новом месте.
 */
export function initInput(area: HTMLElement, host: PetHost): void {
  let down: { x: number; y: number; t: number; mode: Mode } | null = null;
  let last = { x: 0, y: 0, t: 0 };
  let petDistance = 0;

  const setGrabbed = (on: boolean) => host.el.classList.toggle("grabbed", on);

  // Разбор одиночного/двойного клика. Сам физический клик считается в fsm.click() СРАЗУ
  // (иначе «5 быстрых кликов = злость» сломалась бы), а реакция откладывается на 250 мс.
  let clickTimer: number | undefined;
  const cancelClickTimer = () => {
    window.clearTimeout(clickTimer);
    clickTimer = undefined;
  };
  const onPhysicalClick = () => {
    const result = host.fsm.click();
    if (result !== "ok") {
      cancelClickTimer(); // 5 быстрых кликов (злость) или клик не для реакции
      return;
    }
    if (clickTimer !== undefined) {
      cancelClickTimer(); // второй клик за 250 мс → двойной: уникальный трюк питомца
      host.fsm.trick(host.def.doubleClick);
    } else {
      clickTimer = window.setTimeout(() => {
        clickTimer = undefined;
        host.fsm.singleClick(); // второго клика не было → одиночный
      }, DOUBLE_CLICK_MS);
    }
  };

  area.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;
    host.fsm.activity();
    down = { x: e.clientX, y: e.clientY, t: e.timeStamp, mode: "pending" };
    last = { x: e.clientX, y: e.clientY, t: e.timeStamp };
    petDistance = 0;
  });

  window.addEventListener("mouseup", () => {
    if (down?.mode === "pending") onPhysicalClick();
    down = null;
    setGrabbed(false);
  });

  area.addEventListener("mousemove", (e) => {
    const fsm = host.fsm;
    // Наведение на самого питомца (не на прозрачный фон SVG) будит его.
    if (e.target !== host.el) fsm.wake();
    else fsm.activity();

    if (!down || down.mode === "drag") return;

    if (down.mode === "pending") {
      if (Math.hypot(e.clientX - down.x, e.clientY - down.y) < MOVE_THRESHOLD_PX) return;
      const wantDrag =
        settings.dragMode === "shift" ? e.shiftKey : e.timeStamp - down.t >= settings.dragHoldMs;
      if (wantDrag) {
        down.mode = "drag";
        setGrabbed(true);
        // Тащим — любые анимации прерываются (трюк, еда, злость, обида, реакция на клик);
        // обиженного тоже можно утащить: отменяем побег/возврат, дальше он IDLE на новом месте.
        cancelClickTimer();
        abandonHome();
        fsm.grab();
        void startWindowDrag().finally(() => {
          down = null;
          setGrabbed(false);
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
