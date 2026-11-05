import { invoke } from "@tauri-apps/api/core";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import type { PetHost } from "./petHost";
import { settings } from "./settings";
import { IS_TAURI, isOverPet } from "./windowControl";

/** Больше файлов за один бросок питомец не примет: защита от случайного «съедания» целой папки. */
const MAX_FILES = 20;

/** Что нам нужно от события перетаскивания файлов (совпадает с payload `onDragDropEvent`). */
export interface DropEvent {
  type: "enter" | "over" | "drop" | "leave";
  paths?: string[];
  /** Физические px относительно окна. */
  position?: { x: number; y: number };
}

/**
 * Питомец-«корзина»: файл, брошенный НА питомца, он съедает, и в момент проглатывания файл уходит в системную
 * Корзину (Rust-команда `move_to_trash`, восстановить можно). Файл, брошенный мимо питомца (на прозрачную часть
 * окна), игнорируется. Если питомец сейчас не может есть (злится, спит, занят трюком…) — файл тоже не трогаем.
 */
export class FileEater {
  /** Пути, ожидающие проглатывания. Уходят в Корзину только после того, как питомец принял бросок. */
  private pending: string[] = [];

  constructor(private host: PetHost) {}

  handle(ev: DropEvent): void {
    const dpr = window.devicePixelRatio || 1;
    const x = (ev.position?.x ?? -1) / dpr;
    const y = (ev.position?.y ?? -1) / dpr;
    const el = this.host.el;

    if (ev.type === "leave") {
      el.classList.remove("hungry");
      return;
    }

    const canEat = settings.eatFiles && this.host.fsm.canEatNow();
    if (ev.type === "enter" || ev.type === "over") {
      // Над питомцем — открывает рот в ожидании. Мимо — ничего.
      el.classList.toggle("hungry", canEat && isOverPet(x, y));
      return;
    }

    // drop
    el.classList.remove("hungry");
    if (!canEat || !isOverPet(x, y)) return;
    const paths = ev.paths ?? [];
    if (paths.length === 0 || paths.length > MAX_FILES) return;

    // Иконка файла летит от места броска ко рту. Координаты — в единицах SVG (viewBox 300) от рта.
    const rect = el.getBoundingClientRect();
    const k = rect.width / 300 || 1;
    const mouthY = parseFloat(getComputedStyle(el).getPropertyValue("--mouth-y")) || 166;
    const clampPx = (v: number) => Math.max(-220, Math.min(220, v));
    const fromX = clampPx((x - rect.left) / k - 150);
    const fromY = clampPx((y - rect.top) / k - mouthY);

    if (this.host.fsm.eatFile({ fromX, fromY })) this.pending = paths;
  }

  /** Вызывается, когда иконка файла долетела до рта: файлы уходят в Корзину. */
  async trashPending(): Promise<void> {
    const files = this.pending;
    this.pending = [];
    if (!IS_TAURI) return;
    for (const path of files) {
      try {
        await invoke("move_to_trash", { path });
      } catch (err) {
        // Папка, ссылка, сам exe программы, файл занят и т. п.: файл остаётся на месте.
        console.warn("[trash] файл не отправлен в Корзину:", path, err);
      }
    }
  }
}

/** Подписаться на перетаскивание файлов на окно (только в Tauri). */
export function initFileDrop(eater: FileEater): void {
  if (!IS_TAURI) return;
  void getCurrentWebview().onDragDropEvent((e) => eater.handle(e.payload as DropEvent));
}
