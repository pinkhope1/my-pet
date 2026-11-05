import { ACCESSORIES } from "./accessories";
import type { PetHost } from "./petHost";
import { PET_IDS, PETS } from "./pets";
import { MAX_SIZE, MIN_SIZE, settings, type AccessoryId, type PetId } from "./settings";
import { getTargetSize, quitApp, setFrameMin, setHitAll, setWindowSize } from "./windowControl";

const EDGE = 8;

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi));

/** HTML-меню по правому клику на питомце: размер, действия, аксессуары, смена питомца, выход. */
export function initContextMenu(host: PetHost): void {
  const menu = document.createElement("div");
  menu.id = "ctx-menu";
  menu.setAttribute("role", "menu");
  menu.innerHTML = /* html */ `
    <div class="ctx-head">
      <div class="ctx-title" id="ctx-title"></div>
      <div class="ctx-sub" id="ctx-food-count"></div>
    </div>
    <label class="ctx-row" for="ctx-size">
      <span>Размер</span><output id="ctx-size-val"></output>
    </label>
    <input id="ctx-size" type="range" min="${MIN_SIZE}" max="${MAX_SIZE}" step="10" />
    <div class="ctx-grid">
      <button id="ctx-feed" type="button" role="menuitem"></button>
      <button id="ctx-trick-0" type="button" role="menuitem"></button>
      <button id="ctx-trick-1" type="button" role="menuitem"></button>
      <button id="ctx-sleep" type="button" role="menuitem">🌙 Спать</button>
    </div>
    <div class="ctx-section">🎩 Аксессуары</div>
    <div class="ctx-chips">
      ${ACCESSORIES.map((a) => `<button type="button" data-acc="${a.id}">${a.label}</button>`).join("")}
    </div>
    <div class="ctx-section">Сменить питомца</div>
    <div class="ctx-pets">
      ${PET_IDS.map(
        (id) => `<button type="button" data-pet="${id}"><span class="e">${PETS[id].emoji}</span>${PETS[id].name}</button>`,
      ).join("")}
    </div>
    <button id="ctx-quit" type="button" role="menuitem" class="danger">⏻ Выход</button>
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
  const accButtons = menu.querySelectorAll<HTMLButtonElement>(".ctx-chips button");
  let open = false;

  const syncLabel = () => {
    sizeVal.textContent = `${slider.value} px`;
  };
  const syncAccessory = () => {
    accButtons.forEach((b) => b.classList.toggle("active", b.dataset.acc === settings.accessory));
  };

  /** Кнопки зависят от активного питомца: еда, два его трюка, счётчик съеденного. */
  const syncPet = () => {
    const def = host.def;
    title.textContent = `MyPet · ${def.title}`;
    trickBtns.forEach((b, i) => (b.textContent = def.tricks[i].label));
    feedBtn.textContent = def.feedLabel; // 🦴 собака, 🍉 бегемот, 🎋 панда
    foodLabel.textContent = `${def.foodCountLabel}: ${settings[def.foodCounter]}`;
    petButtons.forEach((b) => b.classList.toggle("active", b.dataset.pet === def.id));
    syncAccessory();
  };

  async function show(x: number, y: number): Promise<void> {
    host.fsm.activity();
    slider.value = String(getTargetSize());
    syncLabel();
    syncPet();
    setHitAll(true); // всё окно «твёрдое»: клик мимо меню закроет его
    // Меряем меню (оно разное у питомцев) и растим окно ровно под него.
    menu.style.visibility = "hidden";
    menu.classList.add("open");
    const mw = menu.offsetWidth;
    const mh = menu.offsetHeight;
    await setFrameMin(Math.max(mw, mh) + EDGE * 2);
    const frame = Math.max(getTargetSize(), mh + EDGE * 2, mw + EDGE * 2);
    menu.style.left = `${clamp(x, EDGE, frame - mw - EDGE)}px`;
    menu.style.top = `${clamp(y, EDGE, frame - mh - EDGE)}px`;
    menu.style.visibility = "";
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

  feedBtn.addEventListener("click", () => {
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
  // Аксессуары: меню остаётся открытым, чтобы можно было примерить несколько.
  accButtons.forEach((b) =>
    b.addEventListener("click", () => {
      host.fsm.activity();
      host.setAccessory(b.dataset.acc as AccessoryId);
      syncAccessory();
    }),
  );
  petButtons.forEach((b) =>
    b.addEventListener("click", () => {
      host.switchTo(b.dataset.pet as PetId);
      syncPet();
      void hide();
    }),
  );
  q("#ctx-quit").addEventListener("click", () => void quitApp());
}
