import type { PetHost } from "./petHost";
import { PET_IDS, PETS } from "./pets";
import { MAX_SIZE, MIN_SIZE, settings } from "./settings";
import { getTargetSize, quitApp, setFrameMin, setHitAll, setWindowSize } from "./windowControl";

const MENU_W = 208;
const MENU_H = 352;
/** Минимальный размер окна, пока меню открыто (на малом питомце меню иначе обрезалось бы). */
const FRAME_MIN = 376;
const EDGE = 8;

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi));

/** HTML-меню по правому клику на питомце: размер, действия, смена питомца, выход. */
export function initContextMenu(host: PetHost): void {
  const menu = document.createElement("div");
  menu.id = "ctx-menu";
  menu.setAttribute("role", "menu");
  menu.innerHTML = /* html */ `
    <div class="ctx-title" id="ctx-title"></div>
    <label class="ctx-row" for="ctx-size">
      <span>Размер</span><output id="ctx-size-val"></output>
    </label>
    <input id="ctx-size" type="range" min="${MIN_SIZE}" max="${MAX_SIZE}" step="10" />
    <button id="ctx-feed" type="button" role="menuitem"></button>
    <button id="ctx-trick-0" type="button" role="menuitem"></button>
    <button id="ctx-trick-1" type="button" role="menuitem"></button>
    <button id="ctx-sleep" type="button" role="menuitem">🌙 Спать</button>
    <div class="ctx-section">Сменить питомца</div>
    <div class="ctx-pets">
      ${PET_IDS.map((id) => `<button type="button" data-pet="${id}">${PETS[id].title}</button>`).join("")}
    </div>
    <button id="ctx-quit" type="button" role="menuitem" class="danger">⏻ Выход</button>
    <div class="ctx-footer" id="ctx-food-count"></div>
  `;
  document.body.appendChild(menu);

  const q = <T extends HTMLElement>(sel: string) => menu.querySelector<T>(sel)!;
  const slider = q<HTMLInputElement>("#ctx-size");
  const sizeVal = q<HTMLOutputElement>("#ctx-size-val");
  const foodLabel = q<HTMLDivElement>("#ctx-food-count");
  const trickBtns = [q<HTMLButtonElement>("#ctx-trick-0"), q<HTMLButtonElement>("#ctx-trick-1")];
  const feedBtn = q<HTMLButtonElement>("#ctx-feed");
  const title = q<HTMLDivElement>("#ctx-title");
  const petButtons = menu.querySelectorAll<HTMLButtonElement>(".ctx-pets button");
  let open = false;

  const syncLabel = () => {
    sizeVal.textContent = `${slider.value} px`;
  };

  /** Уникальная кнопка показывается только для активного питомца — подпись берём из его описания. */
  const syncPet = () => {
    const def = host.def;
    title.textContent = `MyPet · ${def.title}`;
    // Кнопки трюков зависят от активного питомца: Играть/Копать у собаки, Пузыри/Танцевать у бегемота.
    trickBtns.forEach((b, i) => (b.textContent = def.tricks[i].label));
    feedBtn.textContent = def.feedLabel; // 🦴 у собаки, 🍉 у бегемота
    foodLabel.textContent = `${def.foodCountLabel}: ${settings[def.foodCounter]}`;
    petButtons.forEach((b) => b.classList.toggle("active", b.dataset.pet === def.id));
  };

  async function show(x: number, y: number): Promise<void> {
    host.fsm.activity();
    slider.value = String(getTargetSize());
    syncLabel();
    syncPet();
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

  // ПКМ: по питомцу — наше меню, везде — без системного.
  document.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    const onPet = host.el.contains(e.target as Node) && e.target !== host.el;
    if (onPet) void show(e.clientX, e.clientY);
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
    host.fsm.activity();
    syncLabel();
    void setWindowSize(Number(slider.value));
  });

  q("#ctx-feed").addEventListener("click", () => {
    host.fsm.feed();
    void hide();
  });
  trickBtns.forEach((b, i) =>
    b.addEventListener("click", () => {
      host.fsm.trick(host.def.tricks[i].state);
      void hide();
    }),
  );
  q("#ctx-sleep").addEventListener("click", () => {
    host.fsm.force("SLEEPING");
    void hide();
  });
  petButtons.forEach((b) =>
    b.addEventListener("click", () => {
      host.switchTo(b.dataset.pet as "dog" | "hippo");
      syncPet();
      void hide();
    }),
  );
  q("#ctx-quit").addEventListener("click", () => void quitApp());
}
