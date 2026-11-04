export type DogState = "IDLE" | "HAPPY" | "ANGRY" | "OFFENDED" | "SLEEPING" | "EATING";

const ALL_STATES: DogState[] = ["IDLE", "HAPPY", "ANGRY", "OFFENDED", "SLEEPING", "EATING"];

// Тайминги (мс)
const CLICK_BURST_COUNT = 5;       // сколько кликов
const CLICK_BURST_WINDOW = 2000;   // за какое время → злость
const HAPPY_HOLD = 1500;           // сколько HAPPY держится после последнего поглаживания
const ANGRY_DURATION = 3000;       // злится 3 с, затем убегает (OFFENDED)
const SLEEP_AFTER = 2 * 60 * 1000; // бездействие до сна
const FORGIVE_NEEDED = 3000;       // сколько нужно нежно гладить обиженную собаку
const FORGIVE_MAX_GAP = 600;       // пауза в поглаживании дольше этого сбрасывает отсчёт
const EAT_LAND_MS = 900;           // косточка падает 0,9 с и «съедается» (совпадает с CSS bone-fall)
const EAT_DURATION = 2400;         // падение + жевание, затем HAPPY

/**
 * Кольцевой буфер фиксированной длины (аналог deque(maxlen=N)):
 * память выделяется один раз, старые значения вытесняются новыми.
 */
export class BoundedDeque {
  private buf: number[];
  private head = 0; // индекс самого старого элемента
  private size = 0;

  constructor(readonly maxlen: number) {
    this.buf = new Array<number>(maxlen).fill(0);
  }

  push(v: number): void {
    const tail = (this.head + this.size) % this.maxlen;
    this.buf[tail] = v;
    if (this.size < this.maxlen) this.size++;
    else this.head = (this.head + 1) % this.maxlen;
  }

  get length(): number {
    return this.size;
  }
  get full(): boolean {
    return this.size === this.maxlen;
  }
  get oldest(): number {
    return this.buf[this.head];
  }
  get newest(): number {
    return this.buf[(this.head + this.size - 1) % this.maxlen];
  }
  clear(): void {
    this.head = 0;
    this.size = 0;
  }
}

export interface DogHooks {
  /** Вызывается при каждой смене состояния (после смены CSS-класса). */
  onChange?: (next: DogState, prev: DogState) => void;
  /** Косточка долетела до рта и съедена (здесь увеличиваем счётчик). */
  onEat?: () => void;
}

/**
 * Машина состояний собаки. Состояние отражается CSS-классом `state-<name>`
 * на корневом элементе, а все анимации привязаны только к этим классам:
 * в IDLE, OFFENDED и SLEEPING бесконечных анимаций нет, а в SLEEPING и
 * OFFENDED нет и ни одного JS-таймера (выход — только по событию мыши/трея).
 *
 *   IDLE ──поглаживание──▶ HAPPY ──1.5 с──▶ IDLE
 *   IDLE ──5 кликов/2 с──▶ ANGRY ──3 с──▶ OFFENDED ──гладить 3 с──▶ HAPPY
 *   IDLE ──2 мин──▶ SLEEPING ──наведение──▶ HAPPY      OFFENDED ──«позвать»──▶ IDLE
 *   любое (кроме ANGRY) ──«покормить»──▶ EATING ──2,4 с──▶ HAPPY ──1,5 с──▶ IDLE
 */
export class DogStateMachine {
  private _state: DogState = "IDLE";
  private clicks = new BoundedDeque(CLICK_BURST_COUNT);
  private stateTimer: number | undefined; // HAPPY→IDLE, ANGRY→OFFENDED
  private idleTimer: number | undefined;  // IDLE→SLEEPING
  private eatTimer: number | undefined;   // момент, когда косточка съедена
  private lastActivity = performance.now();
  // Отсчёт «прощения» в OFFENDED (вычисляется по событиям, без таймеров)
  private forgiveStart = 0;
  private forgiveLast = 0;

  constructor(
    private root: HTMLElement,
    private hooks: DogHooks = {},
  ) {
    this.applyClass();
    this.scheduleIdleCheck(SLEEP_AFTER);
  }

  get state(): DogState {
    return this._state;
  }

  // ---------- События от мыши ----------

  /** Любое действие пользователя: откладывает сон. Очень дешёвый вызов. */
  activity(): void {
    this.lastActivity = performance.now();
  }

  /** Одиночный клик. 5 кликов быстрее 2 секунд → ANGRY. */
  click(): void {
    this.activity();
    if (this._state === "ANGRY" || this._state === "OFFENDED" || this._state === "EATING") return;
    if (this._state === "SLEEPING") return this.transition("HAPPY", HAPPY_HOLD);

    const now = performance.now();
    this.clicks.push(now);
    if (this.clicks.full && now - this.clicks.oldest < CLICK_BURST_WINDOW) {
      this.clicks.clear();
      this.transition("ANGRY", ANGRY_DURATION, "OFFENDED");
    }
  }

  /** Плавное поглаживание (вызывается на каждом подходящем движении мыши). */
  pet(): void {
    this.activity();
    if (this._state === "ANGRY" || this._state === "EATING") return;
    if (this._state === "OFFENDED") return this.petOffended();
    if (this._state === "HAPPY") {
      this.armStateTimer(HAPPY_HOLD, "IDLE"); // продлеваем радость
      return;
    }
    this.transition("HAPPY", HAPPY_HOLD);
  }

  /** Наведение на собаку: будит её. */
  wake(): void {
    this.activity();
    if (this._state === "SLEEPING") this.transition("HAPPY", HAPPY_HOLD);
  }

  /**
   * «Покормить»: сверху падает косточка, собака ловит и жуёт (EATING), затем HAPPY.
   * Кормление будит спящую и мирит с обиженной; на злую (ANGRY) не действует.
   */
  feed(): void {
    this.activity();
    if (this._state === "ANGRY" || this._state === "EATING") return;
    this.transition("EATING", EAT_DURATION, "HAPPY");
  }

  /** Собаку схватили и тащат: обида проходит, дальше она просто IDLE на новом месте. */
  grab(): void {
    this.activity();
    if (this._state === "OFFENDED") this.transition("IDLE");
  }

  /** «Позвать собаку» (меню трея): из OFFENDED сразу в IDLE. */
  callBack(): void {
    this.activity();
    if (this._state === "OFFENDED") this.transition("IDLE");
  }

  /** Принудительная смена состояния (для debug-режима в шаге 5). */
  force(state: DogState): void {
    this.activity();
    if (state === "HAPPY") this.transition(state, HAPPY_HOLD);
    else if (state === "ANGRY") this.transition(state, ANGRY_DURATION, "OFFENDED");
    else this.transition(state);
  }

  // ---------- Внутренняя кухня ----------

  /** Нужно 3 секунды непрерывного нежного поглаживания (паузы > 600 мс обнуляют). */
  private petOffended(): void {
    const now = performance.now();
    if (this.forgiveStart === 0 || now - this.forgiveLast > FORGIVE_MAX_GAP) {
      this.forgiveStart = now;
    }
    this.forgiveLast = now;
    const progress = Math.min(1, (now - this.forgiveStart) / FORGIVE_NEEDED);
    this.root.style.setProperty("--forgive", progress.toFixed(2)); // слёзы тают
    if (progress >= 1) this.transition("HAPPY", HAPPY_HOLD);
  }

  private transition(next: DogState, holdMs?: number, after: DogState = "IDLE"): void {
    const prev = this._state;
    window.clearTimeout(this.stateTimer);
    this.stateTimer = undefined;
    window.clearTimeout(this.idleTimer);
    this.idleTimer = undefined;
    window.clearTimeout(this.eatTimer);
    this.eatTimer = undefined;

    this._state = next;
    this.forgiveStart = 0;
    this.root.style.removeProperty("--forgive");
    this.applyClass();

    if (next === "EATING") {
      this.eatTimer = window.setTimeout(() => {
        this.eatTimer = undefined;
        this.hooks.onEat?.();
      }, EAT_LAND_MS);
    }

    if (next === "SLEEPING" || next === "OFFENDED") {
      // Ни одного таймера: выйти можно только событием мыши / из трея.
    } else if (holdMs !== undefined) {
      this.armStateTimer(holdMs, after);
      this.lastActivity = performance.now();
    } else if (next === "IDLE") {
      this.scheduleIdleCheck(SLEEP_AFTER);
    }
    if (prev !== next) this.hooks.onChange?.(next, prev);
  }

  private armStateTimer(ms: number, after: DogState): void {
    window.clearTimeout(this.stateTimer);
    this.stateTimer = window.setTimeout(() => {
      this.stateTimer = undefined;
      this.transition(after, after === "HAPPY" ? HAPPY_HOLD : undefined);
    }, ms);
  }

  /** Один длинный таймер вместо сброса на каждое движение мыши. */
  private scheduleIdleCheck(ms: number): void {
    window.clearTimeout(this.idleTimer);
    this.idleTimer = window.setTimeout(() => {
      this.idleTimer = undefined;
      if (this._state !== "IDLE") return;
      const idleFor = performance.now() - this.lastActivity;
      if (idleFor >= SLEEP_AFTER) this.transition("SLEEPING");
      else this.scheduleIdleCheck(SLEEP_AFTER - idleFor);
    }, ms);
  }

  private applyClass(): void {
    for (const s of ALL_STATES) this.root.classList.remove(`state-${s.toLowerCase()}`);
    this.root.classList.add(`state-${this._state.toLowerCase()}`);
  }
}
