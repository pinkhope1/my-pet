import { readText } from "@tauri-apps/plugin-clipboard-manager";
import { settings } from "./settings";
import { IS_TAURI } from "./windowControl";

const POLL_MS = 1000;

/** Быстрый хэш FNV-1a: нам нужно лишь заметить, что текст сменился, сам текст нигде не хранится. */
function hashText(t: string): number {
  let h = 2166136261;
  const n = Math.min(t.length, 8192);
  for (let i = 0; i < n; i++) {
    h ^= t.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h ^ t.length) >>> 0;
}

/**
 * Раз в секунду смотрит, не появился ли в буфере обмена НОВЫЙ текст, и сообщает об этом (питомец его «съедает»).
 *
 * Приватность: текст читается только чтобы посчитать хэш и сравнить с прошлым; он не сохраняется,
 * не логируется, никуда не отправляется и не показывается (над питомцем летят случайные символы,
 * а не содержимое буфера). Опрос включается настройкой `eatClipboard` и идёт ВСЕГДА, в том числе пока
 * питомец спит: новый текст будит его (он просыпается, ест и снова может уснуть). Один дешёвый
 * запрос в секунду — на нагрузку в покое это практически не влияет.
 */
export class ClipboardWatcher {
  private timer: number | undefined;
  private last: number | null = null;
  private busy = false;

  constructor(private onNewText: () => void) {}

  get running(): boolean {
    return this.timer !== undefined;
  }

  /** Запустить опрос (если разрешено). Текущее содержимое буфера запоминаем как «уже виденное». */
  async start(): Promise<void> {
    if (!IS_TAURI || !settings.eatClipboard || this.running) return;
    this.timer = window.setInterval(() => void this.tick(), POLL_MS); // сначала таймер: stop() во время read() должен сработать
    this.last = await this.read();
  }

  stop(): void {
    window.clearInterval(this.timer);
    this.timer = undefined;
    this.last = null;
  }

  private async read(): Promise<number | null> {
    try {
      const text = await readText();
      return text ? hashText(text) : null;
    } catch {
      return null; // в буфере не текст (картинка, файлы) или он занят другой программой
    }
  }

  private async tick(): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    try {
      const h = await this.read();
      if (!this.running) return; // остановили, пока ждали ответ
      if (h === null) {
        this.last = null; // буфер очистили/не текст: повторное копирование того же текста снова «новое»
      } else if (h !== this.last) {
        this.last = h;
        this.onNewText();
      }
    } finally {
      this.busy = false;
    }
  }
}
