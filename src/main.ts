import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import "./style.css";
import { DOG_SVG } from "./dog.svg";
import { DogStateMachine } from "./DogStateMachine";
import { initContextMenu } from "./contextMenu";
import { initInput } from "./input";
import { addBoneEaten, loadSettings, setColors, setDragMode } from "./settings";
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
  // Сначала настройки: цвета (CSS-переменные), dragMode, размер окна.
  const settings = await loadSettings();
  document.documentElement.style.setProperty("--dog-px", `${settings.size}px`);

  const app = document.getElementById("app");
  if (!app) throw new Error("#app not found");
  app.innerHTML = DOG_SVG;

  const dog = document.getElementById("dog");
  if (!dog) throw new Error("#dog not found");

  const fsm = new DogStateMachine(dog, {
    // Косточка долетела до рта: +1 в счётчик (settings.json).
    onEat: () => addBoneEaten(),
    onChange: (next, prev) => {
      // ANGRY → OFFENDED: убегаем к краю экрана; выход из OFFENDED — возвращаемся.
      if (next === "OFFENDED") void runAway();
      else if (prev === "OFFENDED") void returnHome();

      // SLEEPING: Rust-опрос курсора на паузе; при пробуждении возобновляем.
      setPollInterval(next === "SLEEPING" ? 0 : 50);
      // Поза изменилась (уши, голова) — хитбоксы заново.
      requestAnimationFrame(refreshHitRegions);
    },
  });

  // Окно скрыто (трей) — замораживаем все CSS-анимации.
  document.addEventListener("visibilitychange", () =>
    document.documentElement.classList.toggle("paused", document.hidden),
  );

  // Меню трея «Позвать собаку»: OFFENDED → IDLE.
  if (IS_TAURI) void listen("call-dog", () => fsm.callBack());

  // Меню трея «Покормить».
  if (IS_TAURI) void listen("feed-dog", () => fsm.feed());

  // Выход из трея: сперва дописать настройки (Rust подстрахует выходом через 1,5 с).
  if (IS_TAURI) void listen("request-quit", () => void quitApp());

  // F12 — инструменты разработчика, только в режиме разработки (`tauri dev`).
  // В релизной сборке обработчик не регистрируется (и Rust-команда тоже пустая).
  if (import.meta.env.DEV) {
    window.addEventListener("keydown", (e) => {
      if (e.key !== "F12") return;
      e.preventDefault();
      if (IS_TAURI) void invoke("toggle_devtools");
    });
  }

  initInput(dog, fsm);
  initWindowControl(dog, () => fsm.activity());
  initContextMenu(dog, fsm);

  // Восстановить сохранённый размер окна (без повторной записи в файл).
  if (IS_TAURI && settings.size !== Math.round(window.innerWidth)) {
    void setWindowSize(settings.size, false);
  }

  // Для отладки из консоли.
  Object.assign(window, { dogFsm: fsm, pet: { setColors, setDragMode, settings } });
}

void bootstrap();
