import type { DogStateMachine } from "./DogStateMachine";
import { MAX_SIZE, MIN_SIZE, settings } from "./settings";
import { getTargetSize, quitApp, setFrameMin, setHitAll, setWindowSize } from "./windowControl";

const MENU_W = 208;
const MENU_H = 232;
/** Минимальный размер окна, пока меню открыто (на малой собаке меню иначе обрезалось бы). */
const FRAME_MIN = 260;
const EDGE = 8;

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi));

/** HTML-меню по правому клику на собаке: размер, «Спать», «Выход». */
export function initContextMenu(dog: HTMLElement, fsm: DogStateMachine): void {
  const menu = document.createElement("div");
  menu.id = "ctx-menu";
  menu.setAttribute("role", "menu");
  menu.innerHTML = /* html */ `
    <div class="ctx-title">🐶 MyPet</div>
    <label class="ctx-row" for="ctx-size">
      <span>Размер</span><output id="ctx-size-val"></output>
    </label>
    <input id="ctx-size" type="range" min="${MIN_SIZE}" max="${MAX_SIZE}" step="10" />
    <button id="ctx-feed" type="button" role="menuitem">🦴 Покормить</button>
    <button id="ctx-sleep" type="button" role="menuitem">🌙 Спать</button>
    <button id="ctx-quit" type="button" role="menuitem" class="danger">⏻ Выход</button>
    <div class="ctx-footer" id="ctx-bones"></div>
  `;
  document.body.appendChild(menu);

  const slider = menu.querySelector<HTMLInputElement>("#ctx-size")!;
  const sizeVal = menu.querySelector<HTMLOutputElement>("#ctx-size-val")!;
  const bonesLabel = menu.querySelector<HTMLDivElement>("#ctx-bones")!;
  let open = false;

  const syncLabel = () => {
    sizeVal.textContent = `${slider.value} px`;
  };

  async function show(x: number, y: number): Promise<void> {
    fsm.activity();
    slider.value = String(getTargetSize());
    syncLabel();
    bonesLabel.textContent = `Съедено костей: ${settings.bonesEaten}`;
    setHitAll(true); // всё окно «твёрдое»: клик мимо меню закроет его
    await setFrameMin(FRAME_MIN); // дождаться, пока окно вырастет под меню
    const frame = Math.max(getTargetSize(), FRAME_MIN);
    menu.style.left = `${clamp(x, EDGE, frame - MENU_W - EDGE)}px`;
    menu.style.top = `${clamp(y, EDGE, frame - MENU_H - EDGE)}px`;
    menu.classList.add("open");
    open = true;
  }

  async function hide(): Promise<void> {
    if (!open) return;
    open = false;
    menu.classList.remove("open");
    setHitAll(false);
    await setFrameMin(0);
  }

  // ПКМ: по собаке — наше меню, везде — без системного.
  document.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    const onDog = dog.contains(e.target as Node) && e.target !== dog;
    if (onDog) void show(e.clientX, e.clientY);
    else void hide();
  });

  // Закрытие: клик мимо, Esc, потеря фокуса окном.
  document.addEventListener("mousedown", (e) => {
    if (open && !menu.contains(e.target as Node)) void hide();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") void hide();
  });
  window.addEventListener("blur", () => void hide());

  slider.addEventListener("input", () => {
    fsm.activity();
    syncLabel();
    void setWindowSize(Number(slider.value));
  });

  menu.querySelector("#ctx-feed")!.addEventListener("click", () => {
    fsm.feed();
    void hide();
  });
  menu.querySelector("#ctx-sleep")!.addEventListener("click", () => {
    fsm.force("SLEEPING");
    void hide();
  });
  menu.querySelector("#ctx-quit")!.addEventListener("click", () => void quitApp());
}
