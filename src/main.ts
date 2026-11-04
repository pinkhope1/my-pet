import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import "./style.css";
import { initContextMenu } from "./contextMenu";
import { initInput } from "./input";
import { PetHost } from "./petHost";
import { addFoodEaten, loadSettings, setColors, setDragMode } from "./settings";
import {
  initWindowControl,
  IS_TAURI,
  quitApp,
  refreshHitRegions,
  setPollInterval,
  setWindowSize,
} from "./windowControl";
import { returnHome, runAway } from "./windowMotion";

async function bootstrap(): Promise<void> {
  // Сначала настройки: цвета (CSS-переменные), dragMode, размер окна, выбранный питомец.
  const settings = await loadSettings();
  document.documentElement.style.setProperty("--pet-px", `${settings.size}px`);

  const app = document.getElementById("app");
  if (!app) throw new Error("#app not found");

  // Хуки общие для всех питомцев: хост пересоздаёт машину состояний, а хуки остаются те же.
  const host = new PetHost(app, {
    // Еда долетела до рта: +1 в счётчик этого питомца (кости / арбузы, settings.json).
    onEat: () => addFoodEaten(host.def.foodCounter),
    onChange: (next, prev) => {
      // ANGRY → OFFENDED: убегаем к краю экрана; выход из OFFENDED — возвращаемся.
      if (next === "OFFENDED") void runAway();
      else if (prev === "OFFENDED") void returnHome();

      // SLEEPING: Rust-опрос курсора на паузе; при пробуждении возобновляем.
      setPollInterval(next === "SLEEPING" ? 0 : 50);
      // Поза изменилась (уши, голова, трюк) — хитбоксы заново: сразу и когда CSS-переходы
      // (0,25 с) доиграют, иначе рамки остались бы по промежуточной позе.
      requestAnimationFrame(refreshHitRegions);
      window.setTimeout(refreshHitRegions, 320);
    },
  });
  host.mount(settings.currentPet);

  // Окно скрыто (трей) — замораживаем все CSS-анимации.
  document.addEventListener("visibilitychange", () =>
    document.documentElement.classList.toggle("paused", document.hidden),
  );

  // Меню трея: «Позвать собаку» (OFFENDED → IDLE) и «Покормить».
  if (IS_TAURI) {
    void listen("call-dog", () => host.fsm.callBack());
    void listen("feed-dog", () => host.fsm.feed());
    // Трюки из трея: индекс 0/1 → кнопки активного питомца.
    void listen<number>("do-trick", (e) => {
      const t = host.def.tricks[e.payload];
      if (t) host.fsm.trick(t.state);
    });
    // Выход из трея: сперва дописать настройки (Rust подстрахует выходом через 1,5 с).
    void listen("request-quit", () => void quitApp());
  }

  // F12 — инструменты разработчика, только в режиме разработки (`tauri dev`).
  // В релизной сборке обработчик не регистрируется (и Rust-команда тоже пустая).
  if (import.meta.env.DEV) {
    window.addEventListener("keydown", (e) => {
      if (e.key !== "F12") return;
      e.preventDefault();
      if (IS_TAURI) void invoke("toggle_devtools");
    });
  }

  initInput(app, host);
  initWindowControl(app, () => host.fsm.activity());
  initContextMenu(host);

  // Восстановить сохранённый размер окна (без повторной записи в файл).
  if (IS_TAURI && settings.size !== Math.round(window.innerWidth)) {
    void setWindowSize(settings.size, false);
  }

  // Для отладки из консоли.
  Object.assign(window, { petHost: host, pet: { setColors, setDragMode, settings } });
}

void bootstrap();
